import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, contents, media, siteSettings } from "@/db/schema";
import type { AdminSession } from "@/lib/auth/types";
import { queryPublicHeroImage } from "../homeHeroQuery";
import { listAudit } from "./audit";
import type { AdminDb } from "./db";
import { discardHeroDraft, getHomeHero, publishHero, resetHeroToDefault, saveHeroDraft } from "./homeHero";
import { createMedia, deleteMedia, mediaUsageCount, updateMediaAlt } from "./media";

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
  await db.delete(siteSettings);
  await db.delete(contents);
  await db.delete(media);
  await db.delete(auditLog);
});

let n = 0;
const image = (alt: string | undefined) => {
  n += 1;
  return createMedia(db, admin, { storage: "local", storageKey: `media/2026/11/hero-${n}.webp`, url: `/media-dev/hero-${n}.webp`, bytes: 1000, width: 1280, height: 1560, alt });
};

describe("홈 히어로 이미지", () => {
  it("처음에는 기본 일러스트이고 공개 화면도 기본 일러스트(null)다", async () => {
    const view = await getHomeHero(db, admin);
    expect(view).toMatchObject({ version: 0, hasDraft: false, editableId: null, problems: [] });
    expect(await queryPublicHeroImage(db)).toBeNull();
  });

  it("저장은 수정 중에만 쌓이고, 공개 반영해야 홈이 바뀐다", async () => {
    const m = await image("푸른 바다 위 아치 바위");
    const { version } = await saveHeroDraft(db, admin, 0, m.id);
    expect(await queryPublicHeroImage(db)).toBeNull();
    const view = await getHomeHero(db, admin);
    expect(view).toMatchObject({ version, hasDraft: true, editableId: m.id, problems: [] });
    await publishHero(db, admin, version);
    expect(await queryPublicHeroImage(db)).toEqual({ url: m.url, alt: "푸른 바다 위 아치 바위", width: 1280, height: 1560 });
    expect((await getHomeHero(db, admin)).hasDraft).toBe(false);
    const actions = (await listAudit(db, admin, 1)).items.map((i) => i.action);
    expect(actions).toEqual(expect.arrayContaining(["hero.save", "hero.publish"]));
  });

  it("대체 텍스트가 없는 이미지는 공개 반영할 수 없다", async () => {
    const m = await image(undefined);
    const { version } = await saveHeroDraft(db, admin, 0, m.id);
    expect((await getHomeHero(db, admin)).problems[0]).toContain("대체 텍스트");
    await expect(publishHero(db, admin, version)).rejects.toThrow("대체 텍스트");
    await updateMediaAlt(db, admin, m.id, "산호초");
    await publishHero(db, admin, version);
    expect((await queryPublicHeroImage(db))?.alt).toBe("산호초");
  });

  it("없는 이미지는 저장할 수 없고, 버전이 다르면 막는다", async () => {
    await expect(saveHeroDraft(db, admin, 0, "0b0f7c0e-3f1d-4a52-9a37-1c2d3e4f5a6b")).rejects.toThrow("없는 이미지");
    const m = await image("바다");
    await saveHeroDraft(db, admin, 0, m.id);
    await expect(saveHeroDraft(db, admin, 0, m.id)).rejects.toThrow("먼저 저장");
  });

  it("수정 내용 버리기는 홈을 그대로 두고, 되돌리기는 바로 기본 일러스트로 바꾼다", async () => {
    const a = await image("첫 이미지");
    const b = await image("두 번째 이미지");
    let { version } = await saveHeroDraft(db, admin, 0, a.id);
    ({ version } = await publishHero(db, admin, version));
    ({ version } = await saveHeroDraft(db, admin, version, b.id));
    ({ version } = await discardHeroDraft(db, admin, version));
    expect((await queryPublicHeroImage(db))?.alt).toBe("첫 이미지");
    expect((await getHomeHero(db, admin)).hasDraft).toBe(false);
    ({ version } = await saveHeroDraft(db, admin, version, b.id));
    await resetHeroToDefault(db, admin, version);
    expect(await queryPublicHeroImage(db)).toBeNull();
    expect(await getHomeHero(db, admin)).toMatchObject({ hasDraft: false, editableId: null });
  });

  it("기본 일러스트를 고르고 공개 반영해도 기본 일러스트로 돌아간다", async () => {
    const a = await image("첫 이미지");
    let { version } = await saveHeroDraft(db, admin, 0, a.id);
    ({ version } = await publishHero(db, admin, version));
    ({ version } = await saveHeroDraft(db, admin, version, null));
    expect((await getHomeHero(db, admin)).editableId).toBeNull();
    await publishHero(db, admin, version);
    expect(await queryPublicHeroImage(db)).toBeNull();
  });

  it("히어로가 쓰는 이미지는 사용 중으로 세어 삭제를 막고, 기본으로 되돌린 뒤에는 지울 수 있다", async () => {
    const a = await image("첫 이미지");
    let { version } = await saveHeroDraft(db, admin, 0, a.id);
    expect(await mediaUsageCount(db, admin, a.id)).toBe(1);
    ({ version } = await publishHero(db, admin, version));
    expect(await mediaUsageCount(db, admin, a.id)).toBe(1);
    await expect(deleteMedia(db, admin, a.id)).rejects.toThrow("1곳");
    await resetHeroToDefault(db, admin, version);
    expect(await mediaUsageCount(db, admin, a.id)).toBe(0);
    await deleteMedia(db, admin, a.id);
  });

  it("이미지가 어떤 이유로 사라져도 홈은 기본 일러스트로 연다", async () => {
    const a = await image("첫 이미지");
    const { version } = await saveHeroDraft(db, admin, 0, a.id);
    await publishHero(db, admin, version);
    await db.update(media).set({ deletedAt: new Date() });
    expect(await queryPublicHeroImage(db)).toBeNull();
  });
});
