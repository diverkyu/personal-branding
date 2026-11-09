import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { bodyFromPlainText } from "@/content/body";
import { contents, media } from "@/db/schema";
import type { AdminSession } from "@/lib/auth/types";
import type { AdminDb } from "./admin/db";
import { createMedia } from "./admin/media";
import { categoriesOf, queryLiveEquipment, queryLiveEquipmentItem, sortEquipment } from "./equipmentQueries";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const admin: AdminSession = { userId: "admin-1", name: "시험 관리자", email: "admin@example.com" };
const NOW = new Date("2026-11-10T03:00:00Z");
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
  await db.delete(contents);
  await db.delete(media);
});

type Row = typeof contents.$inferInsert;
const fields = (over: Record<string, unknown> = {}) => ({ category: "마스크", brand: "", features: [], thumbMediaId: null, images: [], priceNote: "", checkedAt: "", action: "none", externalUrl: "", buttonLabel: "", affiliate: false, sortOrder: 100, ...over });

async function put(slug: string, over: Partial<Row> & { f?: Record<string, unknown> } = {}) {
  const { f, ...rest } = over;
  await db.insert(contents).values({
    type: "equipment",
    slug,
    title: `장비 ${slug}`,
    summary: `${slug} 한 줄 이유`,
    body: bodyFromPlainText("") as unknown as Record<string, unknown>,
    fields: fields(f),
    status: "published",
    publishedAt: new Date("2026-11-01T00:00:00Z"),
    createdBy: "x",
    updatedBy: "x",
    ...rest,
  });
}
const photo = (key: string, alt: string | undefined) => createMedia(db, admin, { storage: "local", storageKey: `media/2026/11/${key}.webp`, url: `/media-dev/${key}.webp`, bytes: 1000, width: 800, height: 600, alt });

describe("공개되는 장비의 기준", () => {
  it("발행된 장비만 보이고, 임시저장·검토·보관·삭제는 숨긴다", async () => {
    await put("live");
    await put("a-draft", { status: "draft", publishedAt: null });
    await put("a-review", { status: "review", publishedAt: null });
    await put("an-archived", { status: "archived" });
    await put("deleted", { deletedAt: new Date() });
    expect((await queryLiveEquipment(db, NOW)).map((e) => e.slug)).toEqual(["live"]);
    for (const slug of ["a-draft", "a-review", "an-archived", "deleted"]) expect(await queryLiveEquipmentItem(db, slug, NOW)).toBeNull();
  });

  it("예약 장비는 시각이 지난 뒤에만 보인다", async () => {
    await put("past", { status: "scheduled", publishAt: new Date("2026-11-10T01:00:00Z"), publishedAt: null });
    await put("future", { status: "scheduled", publishAt: new Date("2026-11-10T09:00:00Z"), publishedAt: null });
    expect((await queryLiveEquipment(db, NOW)).map((e) => e.slug)).toEqual(["past"]);
    expect(await queryLiveEquipmentItem(db, "future", NOW)).toBeNull();
  });

  it("다른 유형은 장비에 나오지 않는다", async () => {
    await put("a-tour", { type: "tour" });
    await put("a-gear");
    expect((await queryLiveEquipment(db, NOW)).map((e) => e.slug)).toEqual(["a-gear"]);
    expect(await queryLiveEquipmentItem(db, "a-tour", NOW)).toBeNull();
  });

  it("수정 중인 내용(draft 칸)은 공개에 새지 않는다 — 구매 링크도 마찬가지", async () => {
    await put("editing", { f: { action: "external", externalUrl: "https://example.com/old" }, draft: { title: "수정 중 이름", summary: "수정 중 이유", fields: fields({ action: "external", externalUrl: "https://example.com/new", category: "수정 중 카테고리" }) } });
    const e = await queryLiveEquipmentItem(db, "editing", NOW);
    expect(e).toMatchObject({ name: "장비 editing", reason: "editing 한 줄 이유", externalUrl: "https://example.com/old", category: "마스크" });
    expect(JSON.stringify(e)).not.toContain("수정 중");
  });

  it("카테고리나 한 줄 추천 이유가 비었거나 항목이 깨진 장비는 숨긴다", async () => {
    await put("no-category", { f: { category: "" } });
    await put("no-reason", { summary: "" });
    await put("broken", { fields: "깨짐" as never });
    await put("ok");
    expect((await queryLiveEquipment(db, NOW)).map((e) => e.slug)).toEqual(["ok"]);
    expect(await queryLiveEquipmentItem(db, "no-category", NOW)).toBeNull();
  });

  it("본문 검사를 통과하지 못하면 숨긴다. 본문이 비어 있는 것은 정상이다", async () => {
    await put("bad-body", { body: { type: "doc", content: [{ type: "script" }] } as never });
    await put("empty-body");
    expect(await queryLiveEquipmentItem(db, "bad-body", NOW)).toBeNull();
    expect(await queryLiveEquipmentItem(db, "empty-body", NOW)).not.toBeNull();
  });
});

describe("정렬·카테고리", () => {
  it("노출 순서가 작은 것이 앞, 같으면 공개 시각이 최근인 것이 앞이다", async () => {
    await put("b-100-old", { publishedAt: new Date("2026-10-01T00:00:00Z") });
    await put("a-100-new", { publishedAt: new Date("2026-11-05T00:00:00Z") });
    await put("c-first", { f: { sortOrder: 1 } });
    await put("d-last", { f: { sortOrder: 9999 } });
    expect((await queryLiveEquipment(db, NOW)).map((e) => e.slug)).toEqual(["c-first", "a-100-new", "b-100-old", "d-last"]);
  });

  it("카테고리는 목록 순서대로 처음 나온 순서로, 중복 없이", async () => {
    await put("m1", { f: { sortOrder: 1, category: "마스크" } });
    await put("f1", { f: { sortOrder: 2, category: "핀" } });
    await put("m2", { f: { sortOrder: 3, category: "마스크" } });
    expect(categoriesOf(await queryLiveEquipment(db, NOW))).toEqual(["마스크", "핀"]);
  });

  it("sortEquipment 는 원본을 바꾸지 않는다", () => {
    const list = [{ sortOrder: 2, liveAtIso: "a" }, { sortOrder: 1, liveAtIso: "b" }];
    expect(sortEquipment(list).map((x) => x.sortOrder)).toEqual([1, 2]);
    expect(list.map((x) => x.sortOrder)).toEqual([2, 1]);
  });
});

describe("내용", () => {
  it("목록 카드: 대표 이미지·행동·제휴·버튼 라벨이 나온다. 구매처 링크가 아니면 링크·제휴는 나오지 않는다", async () => {
    const t = await photo("thumb", "마스크 정면");
    await put("buy", { f: { thumbMediaId: t.id, action: "external", externalUrl: "https://example.com/mask", affiliate: true, buttonLabel: "사러 가기", brand: "브랜드", priceNote: "10만원대", checkedAt: "2026-11-01", features: ["넓은 시야"] } });
    await put("ask", { f: { action: "inquiry", externalUrl: "https://example.com/leak", affiliate: true } });
    const byId = Object.fromEntries((await queryLiveEquipment(db, NOW)).map((e) => [e.slug, e]));
    expect(byId.buy).toMatchObject({ action: "external", externalUrl: "https://example.com/mask", affiliate: true, buttonLabel: "사러 가기", brand: "브랜드", priceNote: "10만원대", checkedAt: "2026-11-01", features: ["넓은 시야"], cover: { src: "/media-dev/thumb.webp", alt: "마스크 정면" } });
    expect(byId.ask).toMatchObject({ action: "inquiry", externalUrl: undefined, affiliate: undefined });
  });

  it("상세: 추가 이미지·본문·검색 문구를 읽고, 삭제된 이미지는 빠진다", async () => {
    const t = await photo("t", "대표");
    const a = await photo("a", "측면");
    const gone = await photo("g", "지운 것");
    await db.update(media).set({ deletedAt: new Date() }).where(eq(media.id, gone.id));
    await put("detail", { body: bodyFromPlainText("추천 이유 상세 문단") as unknown as Record<string, unknown>, seoTitle: "검색 제목", seoDescription: "검색 설명", f: { thumbMediaId: t.id, images: [gone.id, a.id] } });
    const d = await queryLiveEquipmentItem(db, "detail", NOW);
    expect(d).toMatchObject({ seoTitle: "검색 제목", seoDescription: "검색 설명", cover: { src: "/media-dev/t.webp", alt: "대표" } });
    expect(d?.images).toHaveLength(1);
    expect(d?.images?.[0]).toMatchObject({ src: "/media-dev/a.webp", alt: "측면" });
    expect(d?.doc?.content.length).toBe(1);
    const item = (await queryLiveEquipment(db, NOW))[0] as unknown as Record<string, unknown>;
    expect(item.doc).toBeUndefined();
  });

  it("대표 이미지가 삭제되면 자리표시로 보인다 (장비는 숨기지 않는다)", async () => {
    const t = await photo("t2", "대표");
    await put("no-thumb", { f: { thumbMediaId: t.id } });
    await db.update(media).set({ deletedAt: new Date() }).where(eq(media.id, t.id));
    const e = (await queryLiveEquipment(db, NOW))[0];
    expect(e?.slug).toBe("no-thumb");
    expect(e?.cover).toBeUndefined();
  });
});
