/**
 * 예약 발행 실행 (ADMIN-DESIGN §14.3). 주기 실행(크론)이 호출한다 — 어드민 세션과 무관하다.
 * - 멱등: 작업 선점(pending→running)을 조건부 갱신으로 하고, 이미 발행된 것은 건너뛴다. 같은 작업이 두 번 와도 한 번만 발행된다.
 * - 실패: 최대 3회 재시도(5분 간격) 뒤 failed. 오류 종류만 기록한다 (원문 메시지·개인정보 제외).
 * - 오래 running 으로 남은 작업(실행이 중간에 끊긴 경우)은 다시 시도 대상으로 돌린다.
 */
import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";
import { contents, publishJobs } from "@/db/schema";
import { recordAudit } from "@/data/admin/audit";
import type { AdminDb } from "@/data/admin/db";
import { errorKindOf } from "@/lib/errors";
import type { AdminSession } from "@/lib/auth/types";
import { logger } from "@/lib/logger";

export const SYSTEM_ACTOR: AdminSession = { userId: "system", name: "시스템", email: "" };
export const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5 * 60 * 1000;
const STUCK_AFTER_MS = 10 * 60 * 1000;
const BATCH = 20;

export interface RunSummary {
  published: number;
  skipped: number;
  retried: number;
  failed: number;
}

export async function runDuePublishJobs(db: AdminDb, now: Date = new Date()): Promise<RunSummary> {
  const summary: RunSummary = { published: 0, skipped: 0, retried: 0, failed: 0 };

  // 실행이 중간에 끊겨 running 으로 남은 작업을 되돌린다
  await db
    .update(publishJobs)
    .set({ state: "pending", claimedAt: null })
    .where(and(eq(publishJobs.state, "running"), lte(publishJobs.claimedAt, new Date(now.getTime() - STUCK_AFTER_MS))));

  const due = await db
    .select({ id: publishJobs.id, contentId: publishJobs.contentId })
    .from(publishJobs)
    .where(and(eq(publishJobs.state, "pending"), lte(publishJobs.runAt, now)))
    .orderBy(asc(publishJobs.runAt))
    .limit(BATCH);

  for (const job of due) {
    // 선점: 다른 실행이 먼저 가져갔으면 0행이라 건너뛴다
    const claimed = await db
      .update(publishJobs)
      .set({ state: "running", attempts: sql`${publishJobs.attempts} + 1`, claimedAt: now })
      .where(and(eq(publishJobs.id, job.id), eq(publishJobs.state, "pending")))
      .returning({ attempts: publishJobs.attempts });
    if (claimed.length === 0) continue;
    const attempts = claimed[0]!.attempts;
    try {
      const [row] = await db.select().from(contents).where(eq(contents.id, job.contentId)).limit(1);
      const stillDue = row && row.deletedAt === null && row.status === "scheduled" && row.publishAt !== null && row.publishAt.getTime() <= now.getTime();
      if (!stillDue) {
        // 삭제됐거나 예약이 바뀐 경우, 이미 발행된 경우 — 할 일이 없다
        await db.update(publishJobs).set({ state: row?.status === "published" ? "done" : "cancelled", finishedAt: now }).where(eq(publishJobs.id, job.id));
        summary.skipped += 1;
        continue;
      }
      const updated = await db
        .update(contents)
        .set({ status: "published", publishedAt: row.publishAt, publishAt: null, version: sql`${contents.version} + 1`, updatedAt: now, updatedBy: SYSTEM_ACTOR.userId })
        .where(and(eq(contents.id, job.contentId), eq(contents.status, "scheduled"), isNull(contents.deletedAt)))
        .returning({ id: contents.id });
      await db.update(publishJobs).set({ state: "done", finishedAt: now, lastErrorKind: null }).where(eq(publishJobs.id, job.id));
      if (updated.length > 0) {
        summary.published += 1;
        await recordAudit(db, SYSTEM_ACTOR, { action: "content.publish_scheduled", targetType: "content", targetId: job.contentId });
      } else {
        summary.skipped += 1;
      }
    } catch (error) {
      const kind = errorKindOf(error);
      logger.error("publish_job.failed", { jobId: job.id, attempts, errorKind: kind, errorType: error instanceof Error ? error.name : typeof error });
      if (attempts >= MAX_ATTEMPTS) {
        await db.update(publishJobs).set({ state: "failed", lastErrorKind: kind, finishedAt: now }).where(eq(publishJobs.id, job.id));
        summary.failed += 1;
      } else {
        await db
          .update(publishJobs)
          .set({ state: "pending", lastErrorKind: kind, runAt: new Date(now.getTime() + RETRY_DELAY_MS), claimedAt: null })
          .where(eq(publishJobs.id, job.id));
        summary.retried += 1;
      }
    }
  }
  return summary;
}
