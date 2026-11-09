import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, contents } from "@/db/schema";
import type { AdminSession } from "@/lib/auth/types";
import { listAudit } from "./audit";
import { createContent, deleteContent, getContent, saveContent, type ContentEdit } from "./contents";
import type { AdminDb } from "./db";
import { listCategories, listTags, removeTag, renameCategory, renameTag } from "./taxonomy";
import { bodyFromPlainText } from "@/content/body";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const admin: AdminSession = { userId: "admin-1", name: "시험 관리자", email: "admin@example.com" };
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
  await db.delete(contents);
  await db.delete(auditLog);
});

const edit = (over: Partial<ContentEdit> = {}): ContentEdit => ({ title: "제목", slug: "t", summary: "", body: bodyFromPlainText("본문"), tags: [], answers: [], seoTitle: "", seoDescription: "", origin: "manual", originNote: "", ...over });

async function story(slug: string, tags: string[]) {
  const c = await createContent(db, admin, { type: "story", title: slug });
  await saveContent(db, admin, c.id, c.version, edit({ title: slug, slug, tags }));
  return c.id;
}
async function gear(slug: string, category: string) {
  const c = await createContent(db, admin, { type: "equipment", title: slug });
  const fields = { category, brand: "", features: [], thumbMediaId: null, images: [], priceNote: "", checkedAt: "", action: "none", externalUrl: "", buttonLabel: "", affiliate: false, sortOrder: 100 };
  await saveContent(db, admin, c.id, c.version, edit({ title: slug, slug, summary: "추천 이유", fields }));
  return c.id;
}
const tagsOf = async (id: string) => (await getContent(db, admin, id))?.tags;

describe("태그", () => {
  it("쓰는 글 수와 함께 모아 보인다 (삭제된 글은 빠진다)", async () => {
    await story("a", ["입문", "바다"]);
    await story("b", ["입문"]);
    const gone = await story("c", ["입문", "삭제됨"]);
    await deleteContent(db, admin, gone);
    expect(await listTags(db, admin)).toEqual([
      { name: "입문", count: 2 },
      { name: "바다", count: 1 },
    ]);
  });

  it("이름을 바꾸면 모든 글에 반영되고 글의 version 이 오른다", async () => {
    const a = await story("a", ["입문", "바다"]);
    const before = (await getContent(db, admin, a))!.version;
    const r = await renameTag(db, admin, "입문", "초보");
    expect(r).toEqual({ changed: 1, skipped: 0 });
    expect(await tagsOf(a)).toEqual(["초보", "바다"]);
    expect((await getContent(db, admin, a))!.version).toBe(before + 1);
  });

  it("이미 있는 이름으로 바꾸면 합쳐지고 한 글 안의 중복은 하나가 된다", async () => {
    const a = await story("a", ["입문", "초보", "바다"]);
    const b = await story("b", ["입문"]);
    await renameTag(db, admin, "입문", "초보");
    expect(await tagsOf(a)).toEqual(["초보", "바다"]);
    expect(await tagsOf(b)).toEqual(["초보"]);
    expect(await listTags(db, admin)).toEqual([
      { name: "초보", count: 2 },
      { name: "바다", count: 1 },
    ]);
  });

  it("발행된 글의 수정 중인 내용(draft)에도 반영된다", async () => {
    const id = await story("pub", ["입문"]);
    await db.update(contents).set({ status: "published", publishedAt: new Date() }).where(eq(contents.id, id));
    const row = (await getContent(db, admin, id))!;
    await saveContent(db, admin, id, row.version, edit({ title: "pub", slug: "pub", tags: ["입문", "새태그"] }));
    expect((await getContent(db, admin, id))?.draft).toMatchObject({ tags: ["입문", "새태그"] });
    await renameTag(db, admin, "입문", "초보");
    const after = (await getContent(db, admin, id))!;
    expect(after.tags).toEqual(["초보"]);
    expect(after.draft).toMatchObject({ tags: ["초보", "새태그"] });
  });

  it("휴지통의 글은 건드리지 않는다", async () => {
    const gone = await story("gone", ["입문"]);
    await deleteContent(db, admin, gone);
    await story("live", ["입문"]);
    await renameTag(db, admin, "입문", "초보");
    const [row] = await db.select().from(contents).where(eq(contents.id, gone));
    expect(row?.tags).toEqual(["입문"]);
  });

  it("검증: 빈 이름·너무 긴 이름·같은 이름·없는 태그는 거부한다", async () => {
    await story("a", ["입문"]);
    await expect(renameTag(db, admin, "입문", "  ")).rejects.toThrow("입력");
    await expect(renameTag(db, admin, "입문", "가".repeat(21))).rejects.toThrow("20자");
    await expect(renameTag(db, admin, "입문", "입문")).rejects.toThrow("그대로");
    await expect(renameTag(db, admin, "없음", "새")).rejects.toThrow("쓰는 글이 없습니다");
  });

  it("지우기는 태그만 빼고 글은 그대로 둔다", async () => {
    const a = await story("a", ["입문", "바다"]);
    const r = await removeTag(db, admin, "입문");
    expect(r.changed).toBe(1);
    expect(await tagsOf(a)).toEqual(["바다"]);
    expect(await getContent(db, admin, a)).toMatchObject({ title: "a" });
    await expect(removeTag(db, admin, "입문")).rejects.toThrow("쓰는 글이 없습니다");
  });
});

describe("장비 카테고리", () => {
  it("모아 보고, 이름을 바꾸면 합쳐진다", async () => {
    const a = await gear("g1", "마스크");
    await gear("g2", "마스크");
    const c = await gear("g3", "물안경");
    expect(await listCategories(db, admin)).toEqual([
      { name: "마스크", count: 2 },
      { name: "물안경", count: 1 },
    ]);
    const r = await renameCategory(db, admin, "물안경", "마스크");
    expect(r.changed).toBe(1);
    expect(await listCategories(db, admin)).toEqual([{ name: "마스크", count: 3 }]);
    expect((await getContent(db, admin, c))?.fields).toMatchObject({ category: "마스크" });
    expect((await getContent(db, admin, a))?.fields).toMatchObject({ category: "마스크" });
  });

  it("스토리 같은 다른 유형은 건드리지 않는다", async () => {
    await gear("g1", "마스크");
    const s = await story("s", ["마스크"]);
    await renameCategory(db, admin, "마스크", "다이빙 마스크");
    expect(await tagsOf(s)).toEqual(["마스크"]);
  });

  it("검증: 너무 긴 이름·없는 카테고리는 거부한다", async () => {
    await gear("g1", "마스크");
    await expect(renameCategory(db, admin, "마스크", "가".repeat(21))).rejects.toThrow("20자");
    await expect(renameCategory(db, admin, "없음", "새")).rejects.toThrow("쓰는 장비가 없습니다");
  });
});

describe("활동 기록", () => {
  it("이름을 남기지 않고 종류와 건수만 남긴다", async () => {
    await story("a", ["비밀태그"]);
    await renameTag(db, admin, "비밀태그", "새비밀태그");
    const { items } = await listAudit(db, admin, 1);
    expect(items.map((x) => x.action)).toContain("taxonomy.rename");
    expect(JSON.stringify(items)).not.toContain("비밀태그");
  });
});
