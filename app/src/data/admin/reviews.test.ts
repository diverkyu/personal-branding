import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, contents, reviewRevisions, reviews } from "@/db/schema";
import { bodyFromPlainText } from "@/content/body";
import type { AdminSession } from "@/lib/auth/types";
import type { ReviewInput } from "@/reviews/fields";
import { listAudit } from "./audit";
import { createReview, deleteReview, getReview, listReviewRevisions, listReviews, parseReviewQuery, reviewCounts, saveReview, setReviewStatus, withdrawReview } from "./reviews";
import type { AdminDb } from "./db";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const admin: AdminSession = { userId: "admin-1", name: "시험 관리자", email: "admin@example.com" };
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
  await db.delete(contents);
  await db.delete(auditLog);
});

const input = (over: Partial<ReviewInput> = {}): ReviewInput => ({ body: "정말 좋은 경험이었습니다.", authorLabel: "수강생 A", labelKind: "nick", writtenOn: "2026-11-01", sourceKind: "", sourceNote: "", tourSlug: "", featured: false, featuredOrder: "", consentConfirmed: true, consentNote: "DM 동의", ...over });
const make = (over: Partial<ReviewInput> = {}) => createReview(db, admin, input(over), NOW);
async function putTour(slug: string) {
  await db.insert(contents).values({ type: "tour", slug, title: `투어 ${slug}`, body: bodyFromPlainText("소개") as unknown as Record<string, unknown>, fields: {}, createdBy: "x", updatedBy: "x" });
}

describe("만들기·저장", () => {
  it("항상 비공개로 만들어지고 수정 이력(만듦)이 남는다", async () => {
    const r = await make();
    expect(r).toMatchObject({ status: "private", version: 1, labelKind: "nick", consentConfirmed: true });
    const revs = await listReviewRevisions(db, admin, r.id);
    expect(revs).toHaveLength(1);
    expect(revs[0]).toMatchObject({ reason: "create", version: 1, changedBy: "admin-1" });
    expect(revs[0]?.snapshot).toMatchObject({ body: "정말 좋은 경험이었습니다.", authorLabel: "수강생 A", status: "private" });
  });

  it("검증에 실패하면 저장되지 않는다", async () => {
    await expect(make({ body: "" })).rejects.toThrow("후기 원문");
    await expect(make({ writtenOn: "2026-12-31" })).rejects.toThrow("뒤일 수 없습니다");
    expect(await db.select().from(reviews)).toHaveLength(0);
  });

  it("연결할 투어는 실제로 있는(삭제되지 않은) 투어여야 한다", async () => {
    await expect(make({ tourSlug: "no-such-tour" })).rejects.toThrow("투어를 찾을 수 없습니다");
    await putTour("jeju-tour");
    await expect(make({ tourSlug: "jeju-tour" })).resolves.toMatchObject({ tourSlug: "jeju-tour" });
    await db.update(contents).set({ deletedAt: new Date() }).where(eq(contents.slug, "jeju-tour"));
    await expect(make({ tourSlug: "jeju-tour" })).rejects.toThrow("투어를 찾을 수 없습니다");
  });

  it("저장은 version 이 맞을 때만 되고, 어긋나면 덮어쓰지 않고 충돌로 알린다. 저장마다 이력이 쌓인다", async () => {
    const r = await make();
    const saved = await saveReview(db, admin, r.id, r.version, input({ body: "고친 원문입니다." }), NOW);
    expect(saved.version).toBe(2);
    await expect(saveReview(db, admin, r.id, r.version, input({ body: "낡은 화면에서 저장" }), NOW)).rejects.toThrow("다른 곳에서 먼저 저장");
    expect((await getReview(db, admin, r.id))?.body).toBe("고친 원문입니다.");
    const revs = await listReviewRevisions(db, admin, r.id);
    expect(revs.map((x) => [x.version, x.reason])).toEqual([[2, "edit"], [1, "create"]]);
    expect(revs[1]?.snapshot).toMatchObject({ body: "정말 좋은 경험이었습니다." });
  });
});

describe("동의 확인과 공개", () => {
  it("동의 확인이 없으면 공개할 수 없고, 확인하면 공개된다", async () => {
    const r = await make({ consentConfirmed: false });
    await expect(setReviewStatus(db, admin, r.id, r.version, "public", NOW)).rejects.toThrow("동의를 확인");
    expect((await getReview(db, admin, r.id))?.status).toBe("private");
    const saved = await saveReview(db, admin, r.id, r.version, input({ consentConfirmed: true }), NOW);
    await expect(setReviewStatus(db, admin, r.id, saved.version, "public", NOW)).resolves.toBeDefined();
    expect((await getReview(db, admin, r.id))?.status).toBe("public");
  });

  it("DB 제약이 서버 검사와 별개로 동의 없는 공개를 막는다", async () => {
    const r = await make({ consentConfirmed: false });
    await expect(db.update(reviews).set({ status: "public" }).where(eq(reviews.id, r.id))).rejects.toThrow();
    expect((await getReview(db, admin, r.id))?.status).toBe("private");
  });

  it("공개 중인 후기의 동의 확인은 해제할 수 없다 (철회를 쓰도록 안내)", async () => {
    const r = await make();
    const pub = await setReviewStatus(db, admin, r.id, r.version, "public", NOW);
    await expect(saveReview(db, admin, r.id, pub.version, input({ consentConfirmed: false }), NOW)).rejects.toThrow("철회");
    expect((await getReview(db, admin, r.id))?.consentConfirmed).toBe(true);
  });

  it("같은 상태로 바꾸려 하면 거부한다, 투어가 사라진 후기는 공개할 수 없다", async () => {
    await putTour("t1");
    const r = await make({ tourSlug: "t1" });
    await expect(setReviewStatus(db, admin, r.id, r.version, "private", NOW)).rejects.toThrow("이미 비공개");
    await db.update(contents).set({ deletedAt: new Date() }).where(eq(contents.slug, "t1"));
    await expect(setReviewStatus(db, admin, r.id, r.version, "public", NOW)).rejects.toThrow("투어를 찾을 수 없습니다");
  });

  it("철회하면 즉시 비공개가 되고 철회로 기록된다", async () => {
    const r = await make();
    await setReviewStatus(db, admin, r.id, r.version, "public", NOW);
    await withdrawReview(db, admin, r.id, NOW);
    const row = (await getReview(db, admin, r.id))!;
    expect(row.status).toBe("private");
    expect(row.version).toBe(3);
    const revs = await listReviewRevisions(db, admin, r.id);
    expect(revs[0]).toMatchObject({ reason: "withdraw", version: 3 });
    expect(revs[0]?.snapshot).toMatchObject({ status: "private" });
    expect((await listAudit(db, admin, 1)).items.some((a) => a.action === "review.withdraw")).toBe(true);
  });

  it("삭제하면 목록에서 사라지고 비공개가 되며 이력은 남는다", async () => {
    const r = await make();
    const pub = await setReviewStatus(db, admin, r.id, r.version, "public", NOW);
    await deleteReview(db, admin, r.id, NOW);
    expect(await getReview(db, admin, r.id)).toBeNull();
    const [raw] = await db.select().from(reviews).where(eq(reviews.id, r.id));
    expect(raw).toMatchObject({ status: "private" });
    expect(raw?.deletedAt).not.toBeNull();
    expect((await listReviewRevisions(db, admin, r.id))[0]).toMatchObject({ reason: "delete", version: pub.version + 1 });
    await expect(deleteReview(db, admin, r.id, NOW)).rejects.toThrow("찾을 수 없습니다");
  });
});

describe("목록·개수·활동 기록", () => {
  it("작성일 역순으로, 상태·투어·검색어로 거른다", async () => {
    await putTour("t1");
    await make({ body: "오래된 후기", writtenOn: "2026-09-01", authorLabel: "가나" });
    const mid = await make({ body: "중간 후기 바다", writtenOn: "2026-10-01", tourSlug: "t1" });
    await make({ body: "최근 후기", writtenOn: "2026-11-01", authorLabel: "다라" });
    await setReviewStatus(db, admin, mid.id, mid.version, "public", NOW);
    const all = await listReviews(db, admin, parseReviewQuery({}));
    expect(all.items.map((i) => i.preview)).toEqual(["최근 후기", "중간 후기 바다", "오래된 후기"]);
    expect(all.counts).toEqual({ private: 2, public: 1 });
    expect((await listReviews(db, admin, parseReviewQuery({ status: "public" }))).items.map((i) => i.preview)).toEqual(["중간 후기 바다"]);
    expect((await listReviews(db, admin, parseReviewQuery({ tour: "t1" }))).items).toHaveLength(1);
    expect((await listReviews(db, admin, parseReviewQuery({ q: "바다" }))).items).toHaveLength(1);
    expect((await listReviews(db, admin, parseReviewQuery({ q: "다라" }))).items.map((i) => i.authorLabel)).toEqual(["다라"]);
    expect(await reviewCounts(db, admin)).toEqual({ private: 2, public: 1 });
  });

  it("긴 원문은 목록에서 60자로 줄여 보이고, 알 수 없는 조건은 무시한다", async () => {
    await make({ body: "가".repeat(100) });
    const [item] = (await listReviews(db, admin, parseReviewQuery({ status: "hack", page: "-5" } as never))).items;
    expect(item?.preview).toBe("가".repeat(60) + "…");
    expect(parseReviewQuery({ status: "hack" }).status).toBeUndefined();
  });

  it("활동 기록에는 후기 내용·수강생 표기가 남지 않는다", async () => {
    const r = await make({ body: "비밀스러운 후기 원문", authorLabel: "김철수" });
    const pub = await setReviewStatus(db, admin, r.id, r.version, "public", NOW);
    await saveReview(db, admin, r.id, pub.version, input({ body: "또 다른 원문", authorLabel: "김철수" }), NOW);
    const log = JSON.stringify((await listAudit(db, admin, 1)).items);
    expect(log).toContain("review.create");
    expect(log).toContain("review.status");
    expect(log).not.toContain("비밀스러운");
    expect(log).not.toContain("또 다른 원문");
    expect(log).not.toContain("김철수");
  });
});
