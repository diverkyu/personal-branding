/**
 * 휴지통 정리 작업 (ADMIN-DESIGN §8, §25). 삭제한 지 30일이 지난 항목을 영구 삭제한다. 어드민 세션과 무관하다(Vercel Cron 이 부른다).
 */
import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import { contents, media, reviewRevisions, reviews } from "@/db/schema";
import { logger } from "@/lib/logger";
import type { MediaStorage } from "@/media/storage";
import type { AdminDb } from "./admin/db";
import { mediaUsageCount } from "./admin/media";
import { removeFile } from "@/media/removeFile";
import { TRASH_KEEP_DAYS } from "./admin/trash";
import { SYSTEM_ACTOR } from "./publishJobs";

export interface PurgeSummary {
  contents: number;
  reviews: number;
  media: number;
  /** 파일을 지우지 못해 남겨 둔 이미지 수. 다음 실행에서 다시 시도한다 */
  mediaFailed: number;
}

/**
 * 삭제한 지 30일이 지난 항목을 영구 삭제한다 (정리 작업). 어드민 세션과 무관하며 건수만 돌려준다.
 * 이미지는 파일을 먼저 지우고 성공했을 때만 DB 행을 지운다 — 실패하면 남겨 두고 다음 실행에서 다시 시도한다.
 * 아직 쓰이고 있는 이미지는 지우지 않는다.
 */
export async function purgeExpired(db: AdminDb, storage: MediaStorage | null, now: Date = new Date()): Promise<PurgeSummary> {
  const cutoff = new Date(now.getTime() - TRASH_KEEP_DAYS * 24 * 60 * 60 * 1000);
  const summary: PurgeSummary = { contents: 0, reviews: 0, media: 0, mediaFailed: 0 };

  const oldContents = await db.select({ id: contents.id }).from(contents).where(and(isNotNull(contents.deletedAt), lt(contents.deletedAt, cutoff)));
  if (oldContents.length > 0) {
    const gone = await db.delete(contents).where(inArray(contents.id, oldContents.map((x) => x.id))).returning({ id: contents.id });
    summary.contents = gone.length;
  }

  const oldReviews = await db.select({ id: reviews.id }).from(reviews).where(and(isNotNull(reviews.deletedAt), lt(reviews.deletedAt, cutoff)));
  if (oldReviews.length > 0) {
    const ids = oldReviews.map((x) => x.id);
    await db.delete(reviewRevisions).where(inArray(reviewRevisions.reviewId, ids));
    const gone = await db.delete(reviews).where(inArray(reviews.id, ids)).returning({ id: reviews.id });
    summary.reviews = gone.length;
  }

  const oldMedia = await db.select().from(media).where(and(isNotNull(media.deletedAt), lt(media.deletedAt, cutoff)));
  for (const row of oldMedia) {
    try {
      const usage = await mediaUsageCount(db, SYSTEM_ACTOR, row.id);
      if (usage > 0) {
        summary.mediaFailed += 1;
        continue;
      }
      await removeFile(storage, row);
      await db.delete(media).where(eq(media.id, row.id));
      summary.media += 1;
    } catch (error) {
      summary.mediaFailed += 1;
      logger.error("trash.purge_media", { outcome: "failed", errorType: error instanceof Error ? error.name : typeof error });
    }
  }

  return summary;
}
