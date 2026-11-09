import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { reviewRevisions, reviews } from "@/db/schema";
import type { AdminDb } from "./admin/db";
import { featuredOf, forTourOf, queryPublicReviews, type PublicReview } from "./reviewQueries";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

let client: PGlite;
let db: AdminDb;

beforeAll(async () => {
  client = new PGlite();
  const d = drizzle({ client });
  await migrate(d, { migrationsFolder: path.resolve(__dirname, "../../drizzle") });
  db = d as unknown as AdminDb;
});
afterAll(async () => {
  await client.close();
});
beforeEach(async () => {
  await db.delete(reviewRevisions);
  await db.delete(reviews);
});

type Row = typeof reviews.$inferInsert;
let n = 0;
async function put(over: Partial<Row> = {}) {
  n += 1;
  await db.insert(reviews).values({ body: `후기 원문 ${n}`, authorLabel: `수강생 ${n}`, labelKind: "nick", writtenOn: "2026-10-01", status: "public", consentConfirmed: true, createdBy: "x", updatedBy: "x", ...over });
}

describe("공개되는 후기의 기준", () => {
  it("공개이고 동의 확인이 된 후기만 나온다. 비공개·삭제는 나오지 않는다", async () => {
    await put({ body: "공개 후기" });
    await put({ body: "비공개 후기", status: "private" });
    await put({ body: "동의 미확인 비공개", status: "private", consentConfirmed: false });
    await put({ body: "삭제된 후기", deletedAt: new Date() });
    expect((await queryPublicReviews(db)).map((r) => r.text)).toEqual(["공개 후기"]);
  });

  it("공개 응답에는 기록용 항목(동의 메모·출처·수정 이력)이 없고 화면에 필요한 값만 있다", async () => {
    await put({ body: "공개 후기", consentNote: "비밀 동의 메모", sourceKind: "instagram", sourceNote: "비밀 출처 메모", tourSlug: "jeju-tour" });
    const [r] = await queryPublicReviews(db);
    expect(Object.keys(r!).sort()).toEqual(["author", "featured", "featuredOrder", "id", "text", "tourSlug", "writtenAt"]);
    const json = JSON.stringify(r);
    expect(json).not.toContain("비밀");
    expect(json).not.toContain("instagram");
  });

  it("원문은 가공하지 않고 그대로 나온다", async () => {
    await put({ body: "  줄바꿈\n그대로  띄어쓰기도   <b>그대로</b>  " });
    expect((await queryPublicReviews(db))[0]?.text).toBe("  줄바꿈\n그대로  띄어쓰기도   <b>그대로</b>  ");
  });

  it("작성일 역순, 같은 날이면 나중에 만든 것이 앞이다", async () => {
    await put({ body: "오래됨", writtenOn: "2026-08-01" });
    await put({ body: "최근", writtenOn: "2026-10-20" });
    await put({ body: "중간A", writtenOn: "2026-09-10" });
    await put({ body: "중간B", writtenOn: "2026-09-10" });
    expect((await queryPublicReviews(db)).map((r) => r.text)).toEqual(["최근", "중간B", "중간A", "오래됨"]);
  });

  it("공개 후기를 철회(비공개)하면 바로 사라진다", async () => {
    await put({ body: "철회될 후기" });
    expect(await queryPublicReviews(db)).toHaveLength(1);
    await db.update(reviews).set({ status: "private" }).where(eq(reviews.body, "철회될 후기"));
    expect(await queryPublicReviews(db)).toHaveLength(0);
  });
});

describe("대표 후기·투어별 후기 (INT-07)", () => {
  const r = (over: Partial<PublicReview>): PublicReview => ({ id: String(Math.random()), text: "t", author: "a", writtenAt: "2026-10-01", featured: false, featuredOrder: 100, ...over });

  it("대표 후기는 대표 순서가 작은 것 → 작성일이 최근인 것 순으로 3건까지", () => {
    const list = [r({ id: "a", featured: true, featuredOrder: 5, writtenAt: "2026-09-01" }), r({ id: "b", featured: true, featuredOrder: 1, writtenAt: "2026-08-01" }), r({ id: "c", featured: true, featuredOrder: 5, writtenAt: "2026-10-01" }), r({ id: "d", featured: true, featuredOrder: 9 }), r({ id: "e", featured: false, featuredOrder: 0 })];
    expect(featuredOf(list, 3).map((x) => x.id)).toEqual(["b", "c", "a"]);
    expect(featuredOf(list, 1).map((x) => x.id)).toEqual(["b"]);
    expect(featuredOf([r({})], 3)).toEqual([]);
  });

  it("투어 상세: 연결된 후기 최대 4건, 없으면 대표 후기 3건", () => {
    const linked = Array.from({ length: 6 }, (_, i) => r({ id: `l${i}`, tourSlug: "t1" }));
    const featured = Array.from({ length: 5 }, (_, i) => r({ id: `f${i}`, featured: true, featuredOrder: i }));
    expect(forTourOf([...linked, ...featured], "t1").map((x) => x.id)).toEqual(["l0", "l1", "l2", "l3"]);
    expect(forTourOf([...linked, ...featured], "other").map((x) => x.id)).toEqual(["f0", "f1", "f2"]);
    expect(forTourOf([], "t1")).toEqual([]);
  });
});
