/** Actual Neon dev CRUD smoke; never uses an inferred/default database target. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { auditLog, seoJournal } from "../src/db/schema";
import type { AdminDb } from "../src/data/admin/db";
import { saveJournal, deleteJournal } from "../src/data/seo/store";
import type { JournalInput } from "../src/seo/model";

async function main() {
  // This flag records an independently confirmed Neon branch, not a branch lookup.
  // Confirm the endpoint belongs to dev in Neon before setting it.
  if (process.env.SEO_TEST_DB_BRANCH !== "dev" || process.env.VERCEL_ENV === "production" || !process.env.DATABASE_URL) {
    process.stderr.write("실행 중단: 확인된 Neon dev DATABASE_URL과 SEO_TEST_DB_BRANCH=dev가 필요합니다. DB에 접속하지 않았습니다.\n");
    process.exitCode = 1;
    return;
  }
  const db = getDb(process.env.DATABASE_URL) as unknown as AdminDb;
  const run = randomUUID();
  const actor = { userId: `seo-smoke-${run}`, name: "SEO 가상 시험", email: "seo-smoke@example.com" };
  const input: JournalInput = {
    title: `[시험] SEO CRUD ${run}`, engine: "google", url: "/", observedOn: new Date().toISOString().slice(0, 10),
    sourceUrl: "", note: "개발 DB 자동 검증용 가상 기록", periodStart: "", periodEnd: "", clicks: "", impressions: "",
  };
  const origin = "https://example.com"; // synthetic target, never fetched
  let phase = "create";
  let passed = false;
  try {
    let row = await saveJournal(db, actor, input, origin);
    const read = async () => {
      const [saved] = await db.select().from(seoJournal).where(and(eq(seoJournal.id, row.id), eq(seoJournal.updatedBy, actor.userId)));
      assert(saved, "시험 기록을 다시 읽지 못했습니다.");
      return saved;
    };
    assert.equal((await read()).status, "needed");
    phase = "edit";
    const edited = { ...input, note: "수정된 가상 점검 내용" };
    row = await saveJournal(db, actor, edited, origin, row.id, row.version, "needed");
    assert.equal((await read()).note, edited.note);
    phase = "reject-invalid-transition";
    await assert.rejects(saveJournal(db, actor, edited, origin, row.id, row.version, "resolved"), /재검사/);
    phase = "reject-conflict";
    await assert.rejects(saveJournal(db, actor, edited, origin, row.id, row.version - 1, "needed"), /다른 곳/);
    for (const status of ["fixed", "retest", "further", "fixed", "retest", "resolved"]) {
      phase = `transition-${status}`;
      row = await saveJournal(db, actor, edited, origin, row.id, row.version, status);
      assert.equal((await read()).status, status);
    }
    phase = "delete-confirmation";
    await assert.rejects(deleteJournal(db, actor, row.id, row.version, false), /삭제 확인/);
    assert.equal((await read()).deletedAt, null);
    phase = "delete";
    await deleteJournal(db, actor, row.id, row.version, true);
    assert((await read()).deletedAt instanceof Date);
    passed = true;
  } catch {
    process.stderr.write(`SEO dev 시험 실패: ${phase}. 연결 값과 오류 원문은 출력하지 않습니다.\n`);
    process.exitCode = 1;
  } finally {
    try {
      // Unique per-run actor, and title match: never delete other test or user records.
      await db.delete(seoJournal).where(and(eq(seoJournal.updatedBy, actor.userId), eq(seoJournal.title, input.title)));
      await db.delete(auditLog).where(eq(auditLog.actorId, actor.userId));
      if (passed) process.stdout.write("PASS: Neon dev 등록/재조회/수정/충돌 거부/전체 상태 전이/삭제 확인/소프트 삭제/시험 자료 정리\n");
    } catch {
      process.stderr.write(`시험 자료 정리 실패. 재정리 대상 actor: ${actor.userId}\n`);
      process.exitCode = 1;
    }
  }
}
main().catch(() => { process.stderr.write("시험을 시작하지 못했습니다. 연결 설정을 확인해 주세요.\n"); process.exitCode = 1; });
