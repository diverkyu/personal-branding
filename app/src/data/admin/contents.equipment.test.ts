import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, contents, media, publishJobs } from "@/db/schema";
import { bodyFromPlainText } from "@/content/body";
import type { AdminSession } from "@/lib/auth/types";
import { createMedia, deleteMedia, mediaUsageCount } from "./media";
import { createContent, getContent, listEquipmentCategoryNames, publishDraft, publishProblems, saveContent, transitionContent, type ContentEdit } from "./contents";
import type { AdminDb } from "./db";

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
  await db.delete(publishJobs);
  await db.delete(contents);
  await db.delete(media);
  await db.delete(auditLog);
});

const photo = (key: string, alt: string | undefined) => createMedia(db, admin, { storage: "local", storageKey: `media/2026/11/${key}.webp`, url: `/media-dev/${key}.webp`, bytes: 1000, width: 800, height: 600, alt });
const eqFields = (over: Record<string, unknown> = {}) => ({ category: "마스크", brand: "", features: [] as string[], thumbMediaId: "", images: [] as string[], priceNote: "", checkedAt: "", action: "none", externalUrl: "", buttonLabel: "", affiliate: false, sortOrder: "", ...over });
const edit = (slug: string, over: Partial<ContentEdit> = {}): ContentEdit => ({
  title: "마스크 A",
  slug,
  summary: "시야가 넓어서 추천합니다.",
  body: bodyFromPlainText(""),
  tags: [],
  answers: [],
  seoTitle: "",
  seoDescription: "",
  origin: "manual",
  originNote: "",
  fields: eqFields(),
  ...over,
});
async function makeGear(title = "Mask A", over: Partial<ContentEdit> = {}) {
  const row = await createContent(db, admin, { type: "equipment", title });
  const saved = await saveContent(db, admin, row.id, row.version, edit(row.slug, { title, ...over }));
  return { id: row.id, slug: row.slug, version: saved.version };
}

describe("장비 만들기·저장", () => {
  it("새 장비는 장비 기본값으로 시작하고 제목은 60자까지다", async () => {
    const row = await createContent(db, admin, { type: "equipment", title: "Mask A" });
    expect(row).toMatchObject({ type: "equipment", status: "draft" });
    expect(row.fields).toMatchObject({ category: "", action: "none", sortOrder: 100, affiliate: false });
    await expect(createContent(db, admin, { type: "equipment", title: "가".repeat(61) })).rejects.toThrow("60자");
    await expect(createContent(db, admin, { type: "story", title: "가".repeat(61) })).resolves.toBeDefined();
  });

  it("한 줄 추천 이유는 100자까지다 (스토리 요약은 300자)", async () => {
    const row = await createContent(db, admin, { type: "equipment", title: "Long" });
    await expect(saveContent(db, admin, row.id, row.version, edit(row.slug, { summary: "가".repeat(101) }))).rejects.toThrow("한 줄 추천 이유");
    const story = await createContent(db, admin, { type: "story", title: "Story" });
    await expect(saveContent(db, admin, story.id, story.version, { ...edit(story.slug, { title: "Story", fields: {} }), summary: "가".repeat(250) })).resolves.toBeDefined();
  });

  it("임시저장은 비어 있어도 되고, 잘못된 항목(구매 링크 http·없는 이미지)은 거부한다", async () => {
    const t = await makeGear("Draft Gear", { summary: "", fields: eqFields({ category: "" }) });
    expect((await getContent(db, admin, t.id))?.fields).toMatchObject({ category: "", action: "none" });
    const row = await createContent(db, admin, { type: "equipment", title: "Bad Gear" });
    const save = (fields: Record<string, unknown>) => saveContent(db, admin, row.id, row.version, edit(row.slug, { fields }));
    await expect(save(eqFields({ action: "external", externalUrl: "http://example.com" }))).rejects.toThrow("https");
    await expect(save(eqFields({ thumbMediaId: "22222222-2222-4222-8222-222222222222" }))).rejects.toThrow("삭제되었거나 없는 이미지");
    expect((await getContent(db, admin, row.id))?.version).toBe(row.version);
  });
});

describe("발행 점검", () => {
  it("한 줄 추천 이유·카테고리·대표 이미지가 있어야 하고, 추천 이유 상세(본문)는 비어 있어도 된다", async () => {
    const empty = await makeGear("Empty Gear", { summary: "", fields: eqFields({ category: "" }) });
    const row = (await getContent(db, admin, empty.id))!;
    const problems = await publishProblems(db, admin, row, false);
    expect(problems).toEqual(expect.arrayContaining(["한 줄 추천 이유을(를) 입력해 주세요.", "카테고리를 입력해 주세요.", "대표 이미지를 골라 주세요."]));
    expect(problems.some((p) => p.includes("본문"))).toBe(false);

    const t = await photo("thumb", "마스크");
    const ok = await makeGear("Ready Gear", { fields: eqFields({ thumbMediaId: t.id }) });
    await expect(transitionContent(db, admin, ok.id, "published", { version: ok.version })).resolves.toMatchObject({ status: "published" });
  });

  it("구매처 링크 유형이면 링크가 있어야 한다", async () => {
    const t = await photo("thumb2", "마스크");
    const g = await makeGear("Link Gear", { fields: eqFields({ thumbMediaId: t.id, action: "external", externalUrl: "" }) });
    await expect(transitionContent(db, admin, g.id, "published", { version: g.version })).rejects.toThrow("구매처 링크를 입력해 주세요");
  });

  it("대표·추가 이미지에 대체 텍스트가 없으면 발행이 막힌다", async () => {
    const noAlt = await photo("noalt", undefined);
    const t = await photo("withalt", "대표");
    const g1 = await makeGear("NoAlt Thumb", { fields: eqFields({ thumbMediaId: noAlt.id }) });
    await expect(transitionContent(db, admin, g1.id, "published", { version: g1.version })).rejects.toThrow("장비 이미지 1개에 대체 텍스트가 없습니다");
    const g2 = await makeGear("NoAlt Extra", { fields: eqFields({ thumbMediaId: t.id, images: [noAlt.id] }) });
    await expect(transitionContent(db, admin, g2.id, "published", { version: g2.version })).rejects.toThrow("장비 이미지 1개에 대체 텍스트가 없습니다");
  });
});

describe("발행된 장비 수정·이미지 사용·카테고리", () => {
  it("구매 링크·가격을 고치면 초안에 쌓이고 수정 내용 발행 때 바뀐다", async () => {
    const t = await photo("th3", "대표");
    const g = await makeGear("Live Gear", { fields: eqFields({ thumbMediaId: t.id, action: "external", externalUrl: "https://example.com/a" }) });
    const published = await transitionContent(db, admin, g.id, "published", { version: g.version });
    const saved = await saveContent(db, admin, g.id, published.version, edit(g.slug, { title: "Live Gear", fields: eqFields({ thumbMediaId: t.id, action: "external", externalUrl: "https://example.com/b", priceNote: "20만원" }) }));
    expect(saved.savedAsDraft).toBe(true);
    expect((await getContent(db, admin, g.id))?.fields).toMatchObject({ externalUrl: "https://example.com/a", priceNote: "" });
    await publishDraft(db, admin, g.id, saved.version);
    expect((await getContent(db, admin, g.id))?.fields).toMatchObject({ externalUrl: "https://example.com/b", priceNote: "20만원" });
  });

  it("대표·추가 이미지로 쓰이는 이미지는 삭제할 수 없고, 빼면 삭제할 수 있다", async () => {
    const t = await photo("use-t", "대표");
    const x = await photo("use-x", "추가");
    const g = await makeGear("Use Gear", { fields: eqFields({ thumbMediaId: t.id, images: [x.id] }) });
    expect(await mediaUsageCount(db, admin, t.id)).toBe(1);
    expect(await mediaUsageCount(db, admin, x.id)).toBe(1);
    await expect(deleteMedia(db, admin, t.id)).rejects.toThrow("쓰이고 있어 삭제할 수 없습니다");
    await saveContent(db, admin, g.id, g.version, edit(g.slug, { title: "Use Gear", fields: eqFields() }));
    await expect(deleteMedia(db, admin, t.id)).resolves.toBeDefined();
  });

  it("카테고리 후보는 삭제되지 않은 장비가 쓰는 것을 가나다순으로, 중복 없이 모은다", async () => {
    await makeGear("G1", { fields: eqFields({ category: "핀" }) });
    await makeGear("G2", { fields: eqFields({ category: "마스크" }) });
    await makeGear("G3", { fields: eqFields({ category: "마스크" }) });
    await createContent(db, admin, { type: "story", title: "A Story" });
    expect(await listEquipmentCategoryNames(db, admin)).toEqual(["마스크", "핀"]);
  });

  it("스토리에 장비 항목을 보내도 저장되지 않는다", async () => {
    const story = await createContent(db, admin, { type: "story", title: "Plain Story" });
    await saveContent(db, admin, story.id, story.version, { ...edit(story.slug, { title: "Plain Story", fields: eqFields({ category: "마스크" }) }), summary: "요약" });
    expect((await getContent(db, admin, story.id))?.fields).toEqual({});
  });
});
