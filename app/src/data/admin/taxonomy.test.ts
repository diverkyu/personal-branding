import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, contents, siteSettings } from "@/db/schema";
import type { AdminSession } from "@/lib/auth/types";
import { listAudit } from "./audit";
import { createContent, deleteContent, getContent, saveContent, type ContentEdit } from "./contents";
import type { AdminDb } from "./db";
import { listCategories, listTags, removeTag, renameCategory, renameTag } from "./taxonomy";
import { REGISTRY_MAX, addRegisteredTerm, listRegisteredTerms, removeRegisteredTerm, validateTermName } from "./taxonomyRegistry";
import { listEquipmentCategoryNames } from "./contents";
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
  await db.delete(siteSettings);
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

describe("미리 등록하는 태그·카테고리 목록", () => {
  it("새 이름을 미리 등록하면 쓰는 글이 없어도 목록에 0개로 보이고, 쓰는 이름 뒤에 가나다순으로 붙는다", async () => {
    await story("s1", ["바다", "바다"]);
    await story("s2", ["바다", "기록"]);
    expect(await addRegisteredTerm(db, admin, "tag", "  새  태그 ")).toEqual({ name: "새 태그", added: true });
    await addRegisteredTerm(db, admin, "tag", "가나");
    expect(await listTags(db, admin)).toEqual([
      { name: "바다", count: 2 },
      { name: "기록", count: 1 },
      { name: "가나", count: 0 },
      { name: "새 태그", count: 0 },
    ]);
    await addRegisteredTerm(db, admin, "category", "컴퓨터");
    expect(await listCategories(db, admin)).toEqual([{ name: "컴퓨터", count: 0 }]);
  });

  it("이미 등록한 이름이나 이미 쓰는 이름은 목록에 두 번 나오지 않는다", async () => {
    await story("s1", ["바다"]);
    expect(await addRegisteredTerm(db, admin, "tag", "바다")).toEqual({ name: "바다", added: true });
    expect(await addRegisteredTerm(db, admin, "tag", "바다")).toEqual({ name: "바다", added: false });
    expect(await listTags(db, admin)).toEqual([{ name: "바다", count: 1 }]);
  });

  it("이름 검사: 비어 있음·길이·쉼표(태그만)·제어 문자", async () => {
    expect(() => validateTermName("tag", "   ")).toThrow("입력해 주세요");
    expect(() => validateTermName("tag", "가".repeat(21))).toThrow("20자");
    expect(() => validateTermName("category", "가".repeat(21))).toThrow("20자");
    expect(() => validateTermName("tag", "a,b")).toThrow("쉼표");
    expect(() => validateTermName("tag", "a，b")).toThrow("쉼표");
    expect(validateTermName("category", "스노클, 핀")).toBe("스노클, 핀"); // 카테고리는 쉼표 입력 방식이 아니다
    expect(() => validateTermName("tag", "a\u0007b")).toThrow("쓸 수 없는");
    await expect(addRegisteredTerm(db, admin, "tag", "x,y")).rejects.toThrow("쉼표");
  });

  it("등록 개수에는 상한이 있다", async () => {
    const names = Array.from({ length: REGISTRY_MAX }, (_, i) => `태그${i}`);
    await db.insert(siteSettings).values({ key: "taxonomy.tags", value: JSON.stringify(names), version: 1, updatedBy: "x" });
    await expect(addRegisteredTerm(db, admin, "tag", "하나더")).rejects.toThrow(`${REGISTRY_MAX}개`);
  });

  it("쓰는 글이 없는 이름은 목록에서 지울 수 있고, 등록돼 있지 않으면 아무 일도 없다", async () => {
    await addRegisteredTerm(db, admin, "tag", "미리");
    await addRegisteredTerm(db, admin, "category", "미리");
    expect(await removeRegisteredTerm(db, admin, "tag", "미리")).toEqual({ removed: true });
    expect(await removeRegisteredTerm(db, admin, "tag", "미리")).toEqual({ removed: false });
    expect(await listRegisteredTerms(db, admin, "tag")).toEqual([]);
    expect(await listRegisteredTerms(db, admin, "category")).toEqual(["미리"]); // 종류별로 따로다
  });

  it("쓰는 이름은 등록 해제해도 글에서 쓰고 있으면 목록에 남는다 (등록 목록은 후보일 뿐)", async () => {
    await story("s1", ["바다"]);
    await addRegisteredTerm(db, admin, "tag", "바다");
    await removeRegisteredTerm(db, admin, "tag", "바다");
    expect(await listTags(db, admin)).toEqual([{ name: "바다", count: 1 }]);
  });

  it("글에서 태그 이름을 바꾸면 등록 목록도 따라 바뀌고, 합치면 하나가 되며, 지우면 등록에서도 빠진다", async () => {
    await story("s1", ["옛이름"]);
    await story("s2", ["새이름"]);
    await addRegisteredTerm(db, admin, "tag", "옛이름");
    await addRegisteredTerm(db, admin, "tag", "새이름");
    await renameTag(db, admin, "옛이름", "새이름");
    expect(await listRegisteredTerms(db, admin, "tag")).toEqual(["새이름"]);
    await removeTag(db, admin, "새이름");
    expect(await listRegisteredTerms(db, admin, "tag")).toEqual([]);
  });

  it("장비 카테고리 이름을 바꾸면 등록 목록도 따라 바뀐다", async () => {
    await gear("g1", "마스크");
    await addRegisteredTerm(db, admin, "category", "마스크");
    await renameCategory(db, admin, "마스크", "수경");
    expect(await listRegisteredTerms(db, admin, "category")).toEqual(["수경"]);
  });

  it("장비 입력에서 고르는 카테고리 후보에 등록한 이름이 합쳐진다 (가나다순)", async () => {
    await gear("g1", "핀");
    await addRegisteredTerm(db, admin, "category", "마스크");
    await addRegisteredTerm(db, admin, "category", "핀");
    expect(await listEquipmentCategoryNames(db, admin)).toEqual(["마스크", "핀"]);
  });

  it("저장된 값이 깨져 있어도 읽기는 빈 목록이고 새로 등록하면 고쳐진다", async () => {
    await db.insert(siteSettings).values({ key: "taxonomy.tags", value: "깨진 값", version: 3, updatedBy: "x" });
    expect(await listRegisteredTerms(db, admin, "tag")).toEqual([]);
    await addRegisteredTerm(db, admin, "tag", "복구");
    expect(await listRegisteredTerms(db, admin, "tag")).toEqual(["복구"]);
  });

  it("활동 기록에는 이름이 아니라 종류와 개수만 남는다", async () => {
    await addRegisteredTerm(db, admin, "tag", "비밀이름");
    const items = (await listAudit(db, admin, 1)).items;
    const entry = items.find((i) => i.action === "taxonomy.add");
    expect(entry?.meta).toEqual({ count: 1 });
    expect(JSON.stringify(items)).not.toContain("비밀이름");
  });
});

