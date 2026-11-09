import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, contents, media, publishJobs, reviewRevisions, reviews } from "@/db/schema";
import type { AdminSession } from "@/lib/auth/types";
import type { MediaStorage } from "@/media/storage";
import type { ReviewInput } from "@/reviews/fields";
import { listAudit } from "./audit";
import type { AdminDb } from "./db";
import { createMedia, deleteMedia } from "./media";
import { createReview, deleteReview, getReview, listReviewRevisions } from "./reviews";
import { purgeExpired } from "../trashCleanup";
import { listTrash, purgeItem, restoreItem, TRASH_KEEP_DAYS } from "./trash";
import { createContent, deleteContent, getContent } from "./contents";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const admin: AdminSession = { userId: "admin-1", name: "시험 관리자", email: "admin@example.com" };
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-11-10T03:00:00Z");
let client: PGlite;
let db: AdminDb;

beforeAll(async () => {
  client = new PGlite();
  const d = drizzle({ client });
  await migrate(d, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  db = d as unknown as AdminDb;
});
afterAll(async () => {
  await client.close();
});
beforeEach(async () => {
  await db.delete(reviewRevisions);
  await db.delete(reviews);
  await db.delete(publishJobs);
  await db.delete(contents);
  await db.delete(media);
  await db.delete(auditLog);
});

function fakeStorage(fail = false): MediaStorage & { removed: string[] } {
  const removed: string[] = [];
  return {
    kind: "local",
    removed,
    async put() {
      return { url: "" };
    },
    async remove(key) {
      if (fail) throw new Error("boom");
      removed.push(key);
    },
  };
}

const reviewInput = (): ReviewInput => ({ body: "정말 좋은 경험이었습니다.", authorLabel: "수강생 A", labelKind: "nick", writtenOn: "2026-11-01", sourceKind: "", sourceNote: "", tourSlug: "", featured: false, featuredOrder: "", consentConfirmed: true, consentNote: "" });
const photo = (key: string) => createMedia(db, admin, { storage: "local", storageKey: `media/2026/11/${key}.webp`, url: `/media-dev/${key}.webp`, bytes: 1000, width: 800, height: 600, alt: "사진" });

describe("복원", () => {
  it("콘텐츠는 비공개(임시저장)로 돌아온다 — 발행 중이던 글도 다시 공개되지 않는다", async () => {
    const c = await createContent(db, admin, { type: "story", title: "복원할 글" });
    await db.update(contents).set({ status: "published", publishedAt: NOW }).where(eq(contents.id, c.id));
    await deleteContent(db, admin, c.id);
    expect(await getContent(db, admin, c.id)).toBeNull();
    await restoreItem(db, admin, "content", c.id, NOW);
    const back = await getContent(db, admin, c.id);
    expect(back).toMatchObject({ status: "draft", deletedAt: null });
  });

  it("같은 주소 이름의 글이 이미 있으면 복원할 수 없다", async () => {
    const a = await createContent(db, admin, { type: "story", title: "같은 제목" });
    await deleteContent(db, admin, a.id);
    const b = await createContent(db, admin, { type: "story", title: "같은 제목" });
    await db.update(contents).set({ slug: a.slug }).where(eq(contents.id, b.id));
    await expect(restoreItem(db, admin, "content", a.id, NOW)).rejects.toThrow("이미 있어");
  });

  it("후기는 비공개로 돌아오고 수정 이력에 남는다", async () => {
    const r = await createReview(db, admin, reviewInput(), NOW);
    await deleteReview(db, admin, r.id, NOW);
    await restoreItem(db, admin, "review", r.id, NOW);
    expect(await getReview(db, admin, r.id)).toMatchObject({ status: "private", deletedAt: null });
    const revs = await listReviewRevisions(db, admin, r.id);
    expect(revs.map((x) => x.reason)).toContain("status");
  });

  it("이미지를 복원하면 라이브러리에 다시 보인다", async () => {
    const m = await photo("a".repeat(32));
    await deleteMedia(db, admin, m.id);
    await restoreItem(db, admin, "media", m.id, NOW);
    const [row] = await db.select().from(media).where(eq(media.id, m.id));
    expect(row?.deletedAt).toBeNull();
  });

  it("삭제되지 않은 항목이나 잘못된 id 는 복원할 수 없다", async () => {
    const c = await createContent(db, admin, { type: "story", title: "살아 있는 글" });
    await expect(restoreItem(db, admin, "content", c.id, NOW)).rejects.toThrow("찾을 수 없습니다");
    await expect(restoreItem(db, admin, "content", "not-an-id", NOW)).rejects.toThrow("찾을 수 없습니다");
  });
});

describe("영구 삭제", () => {
  it("휴지통에 없는 콘텐츠는 지워지지 않는다", async () => {
    const c = await createContent(db, admin, { type: "story", title: "살아 있는 글" });
    await expect(purgeItem(db, admin, "content", c.id, null)).rejects.toThrow("찾을 수 없습니다");
    expect(await getContent(db, admin, c.id)).not.toBeNull();
  });

  it("콘텐츠는 예약 작업까지 함께 지워진다", async () => {
    const c = await createContent(db, admin, { type: "story", title: "예약했던 글" });
    await db.insert(publishJobs).values({ contentId: c.id, runAt: NOW, state: "cancelled" });
    await deleteContent(db, admin, c.id);
    await purgeItem(db, admin, "content", c.id, null);
    expect(await db.select().from(contents)).toHaveLength(0);
    expect(await db.select().from(publishJobs)).toHaveLength(0);
  });

  it("후기는 수정 이력(원문 포함)까지 함께 지워진다", async () => {
    const r = await createReview(db, admin, reviewInput(), NOW);
    await deleteReview(db, admin, r.id, NOW);
    await purgeItem(db, admin, "review", r.id, null);
    expect(await db.select().from(reviews)).toHaveLength(0);
    expect(await db.select().from(reviewRevisions)).toHaveLength(0);
  });

  it("이미지는 파일을 먼저 지우고 성공했을 때만 DB 행을 지운다", async () => {
    const m = await photo("b".repeat(32));
    await deleteMedia(db, admin, m.id);
    await expect(purgeItem(db, admin, "media", m.id, fakeStorage(true))).rejects.toThrow();
    expect(await db.select().from(media)).toHaveLength(1);
    const ok = fakeStorage();
    await purgeItem(db, admin, "media", m.id, ok);
    expect(ok.removed).toEqual([`media/2026/11/${"b".repeat(32)}.webp`]);
    expect(await db.select().from(media)).toHaveLength(0);
  });

  it("저장소를 쓸 수 없으면 이미지 행을 남긴다", async () => {
    const m = await photo("c".repeat(32));
    await deleteMedia(db, admin, m.id);
    await expect(purgeItem(db, admin, "media", m.id, null)).rejects.toThrow("저장소");
    expect(await db.select().from(media)).toHaveLength(1);
  });

  it("활동 기록에는 제목·원문·표기가 없다", async () => {
    const r = await createReview(db, admin, reviewInput(), NOW);
    await deleteReview(db, admin, r.id, NOW);
    await restoreItem(db, admin, "review", r.id, NOW);
    await deleteReview(db, admin, r.id, NOW);
    await purgeItem(db, admin, "review", r.id, null);
    const { items } = await listAudit(db, admin, 1);
    const actions = items.map((x) => x.action);
    expect(actions).toContain("trash.restore");
    expect(actions).toContain("trash.purge");
    const dump = JSON.stringify(items);
    expect(dump).not.toContain("정말 좋은 경험");
    expect(dump).not.toContain("수강생 A");
  });
});

describe("목록·정리 작업", () => {
  it("삭제한 항목만 모아 보여 주고 영구 삭제 예정일을 계산한다", async () => {
    const c = await createContent(db, admin, { type: "story", title: "지운 글" });
    await createContent(db, admin, { type: "story", title: "남은 글" });
    await deleteContent(db, admin, c.id);
    const items = await listTrash(db, admin);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "content", label: "지운 글" });
    expect(items[0]!.purgeAt.getTime() - items[0]!.deletedAt.getTime()).toBe(TRASH_KEEP_DAYS * DAY);
  });

  it("30일이 지난 것만 영구 삭제하고, 쓰이는 이미지와 파일 삭제 실패는 남긴다", async () => {
    const old = new Date(NOW.getTime() - 31 * DAY);
    const fresh = new Date(NOW.getTime() - 29 * DAY);
    const oldC = await createContent(db, admin, { type: "story", title: "오래된 글" });
    const newC = await createContent(db, admin, { type: "story", title: "최근 글" });
    await db.update(contents).set({ deletedAt: old }).where(eq(contents.id, oldC.id));
    await db.update(contents).set({ deletedAt: fresh }).where(eq(contents.id, newC.id));
    const oldR = await createReview(db, admin, reviewInput(), NOW);
    await db.update(reviews).set({ deletedAt: old }).where(eq(reviews.id, oldR.id));
    const oldM = await photo("d".repeat(32));
    const usedM = await photo("e".repeat(32));
    await db.update(media).set({ deletedAt: old }).where(eq(media.id, oldM.id));
    await db.update(media).set({ deletedAt: old }).where(eq(media.id, usedM.id));
    const live = await createContent(db, admin, { type: "story", title: "이미지를 쓰는 글" });
    await db.update(contents).set({ coverMediaId: usedM.id }).where(eq(contents.id, live.id));

    const storage = fakeStorage();
    const summary = await purgeExpired(db, storage, NOW);
    expect(summary).toEqual({ contents: 1, reviews: 1, media: 1, mediaFailed: 1 });
    expect((await db.select().from(contents)).map((x) => x.title).sort()).toEqual(["이미지를 쓰는 글", "최근 글"]);
    expect(await db.select().from(reviewRevisions)).toHaveLength(0);
    expect(storage.removed).toEqual([`media/2026/11/${"d".repeat(32)}.webp`]);
    expect((await db.select().from(media)).map((x) => x.id)).toEqual([usedM.id]);
  });

  it("파일 삭제가 실패하면 이미지를 남기고 건수로 알린다", async () => {
    const old = new Date(NOW.getTime() - 40 * DAY);
    const m = await photo("f".repeat(32));
    await db.update(media).set({ deletedAt: old }).where(eq(media.id, m.id));
    const summary = await purgeExpired(db, fakeStorage(true), NOW);
    expect(summary.mediaFailed).toBe(1);
    expect(await db.select().from(media)).toHaveLength(1);
  });
});

