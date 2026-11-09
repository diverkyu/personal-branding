import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { about, auditLog, contents, media } from "@/db/schema";
import { bodyFromPlainText } from "@/content/body";
import type { AdminSession } from "@/lib/auth/types";
import { queryPublicAbout } from "../aboutQueries";
import { listAudit } from "./audit";
import type { AdminDb } from "./db";
import { discardAboutDraft, getAbout, publishAbout, saveAboutDraft, unpublishAbout } from "./about";
import { createMedia, deleteMedia, mediaUsageCount } from "./media";

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
  await db.delete(about);
  await db.delete(contents);
  await db.delete(media);
  await db.delete(auditLog);
});

const doc = (t: string) => bodyFromPlainText(t);
const input = (over: Partial<Parameters<typeof saveAboutDraft>[3]> = {}) => ({ headline: "첫 헤드라인", body: doc("첫 본문입니다."), signature: "이동규", photoMediaId: "", ...over });
const photo = (key: string, alt: string | undefined) => createMedia(db, admin, { storage: "local", storageKey: `media/2026/11/${key}.webp`, url: `/media-dev/${key}.webp`, bytes: 1000, width: 800, height: 600, alt });

describe("저장과 공개", () => {
  it("처음에는 행이 없고 편집 화면은 기본 문구로 시작한다", async () => {
    const v = await getAbout(db, admin);
    expect(v.row).toBeNull();
    expect(v.version).toBe(0);
    expect(v.editable.headline).toContain("서로 다른 두 세계");
  });

  it("저장해도 공개되지 않는다 — 공개 반영을 눌러야 공개된다", async () => {
    const { version } = await saveAboutDraft(db, admin, 0, input());
    expect(version).toBe(1);
    expect(await queryPublicAbout(db)).toBeNull();
    const v = await getAbout(db, admin);
    expect(v.hasDraft).toBe(true);
    expect(v.editable.headline).toBe("첫 헤드라인");
    await publishAbout(db, admin, version);
    const pub = await queryPublicAbout(db);
    expect(pub).toMatchObject({ headline: "첫 헤드라인", signature: "이동규", photo: null });
  });

  it("공개 중에 고친 내용(수정 중)은 공개 화면에 보이지 않는다", async () => {
    let { version } = await saveAboutDraft(db, admin, 0, input());
    ({ version } = await publishAbout(db, admin, version));
    ({ version } = await saveAboutDraft(db, admin, version, input({ headline: "고치는 중", body: doc("아직 확인 안 된 이력") })));
    const pub = await queryPublicAbout(db);
    expect(pub?.headline).toBe("첫 헤드라인");
    expect(JSON.stringify(pub)).not.toContain("확인 안 된");
    await publishAbout(db, admin, version);
    expect((await queryPublicAbout(db))?.headline).toBe("고치는 중");
  });

  it("점검에 걸리면 공개되지 않는다(헤드라인·본문 비어 있음)", async () => {
    const { version } = await saveAboutDraft(db, admin, 0, input({ headline: "", body: { type: "doc", content: [] } }));
    await expect(publishAbout(db, admin, version)).rejects.toThrow("헤드라인");
    expect(await queryPublicAbout(db)).toBeNull();
    expect((await getAbout(db, admin)).problems.length).toBeGreaterThan(0);
  });

  it("수정 내용 버리기는 공개 중인 내용을 그대로 둔다", async () => {
    let { version } = await saveAboutDraft(db, admin, 0, input());
    ({ version } = await publishAbout(db, admin, version));
    ({ version } = await saveAboutDraft(db, admin, version, input({ headline: "버릴 내용" })));
    await discardAboutDraft(db, admin, version);
    const v = await getAbout(db, admin);
    expect(v.hasDraft).toBe(false);
    expect(v.editable.headline).toBe("첫 헤드라인");
    expect((await queryPublicAbout(db))?.headline).toBe("첫 헤드라인");
  });

  it("공개를 멈추면 공개 화면에서 내려가고 내용은 수정 중으로 남는다", async () => {
    let { version } = await saveAboutDraft(db, admin, 0, input());
    ({ version } = await publishAbout(db, admin, version));
    await unpublishAbout(db, admin, version);
    expect(await queryPublicAbout(db)).toBeNull();
    const v = await getAbout(db, admin);
    expect(v.hasDraft).toBe(true);
    expect(v.editable.headline).toBe("첫 헤드라인");
    await expect(unpublishAbout(db, admin, v.version)).rejects.toThrow("공개 중이 아닙니다");
  });

  it("동시에 고치면 뒤에 저장한 쪽이 충돌 안내를 받는다", async () => {
    const { version } = await saveAboutDraft(db, admin, 0, input());
    await saveAboutDraft(db, admin, version, input({ headline: "A" }));
    await expect(saveAboutDraft(db, admin, version, input({ headline: "B" }))).rejects.toThrow("먼저 저장");
    await expect(saveAboutDraft(db, admin, 0, input())).rejects.toThrow("먼저 저장");
    await expect(publishAbout(db, admin, version)).rejects.toThrow("먼저 저장");
  });

  it("행은 하나뿐이다", async () => {
    await saveAboutDraft(db, admin, 0, input());
    await expect(db.insert(about).values({ id: "other", updatedBy: "x" })).rejects.toThrow();
  });
});

describe("프로필 사진", () => {
  it("대체 텍스트가 없으면 공개할 수 없고, 있으면 공개 화면에 나온다", async () => {
    const noAlt = await photo("a".repeat(32), undefined);
    let { version } = await saveAboutDraft(db, admin, 0, input({ photoMediaId: noAlt.id }));
    await expect(publishAbout(db, admin, version)).rejects.toThrow("대체 텍스트");
    const withAlt = await photo("b".repeat(32), "바다에서 웃는 모습");
    ({ version } = await saveAboutDraft(db, admin, version, input({ photoMediaId: withAlt.id })));
    await publishAbout(db, admin, version);
    expect((await queryPublicAbout(db))?.photo).toMatchObject({ alt: "바다에서 웃는 모습", width: 800, height: 600 });
  });

  it("삭제되었거나 없는 이미지로는 저장할 수 없다", async () => {
    const m = await photo("c".repeat(32), "사진");
    await deleteMedia(db, admin, m.id);
    await expect(saveAboutDraft(db, admin, 0, input({ photoMediaId: m.id }))).rejects.toThrow("이미지");
    await expect(saveAboutDraft(db, admin, 0, input({ photoMediaId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }))).rejects.toThrow("이미지");
  });

  it("About 이 쓰는 이미지는 사용처로 세어져 삭제할 수 없다", async () => {
    const m = await photo("d".repeat(32), "사진");
    await saveAboutDraft(db, admin, 0, input({ photoMediaId: m.id }));
    expect(await mediaUsageCount(db, admin, m.id)).toBe(1);
    await expect(deleteMedia(db, admin, m.id)).rejects.toThrow("쓰이고");
  });

  it("공개 중에 사진이 휴지통으로 가도 공개 화면에는 사진이 나오지 않는다", async () => {
    const m = await photo("e".repeat(32), "사진");
    const { version } = await saveAboutDraft(db, admin, 0, input({ photoMediaId: m.id }));
    await publishAbout(db, admin, version);
    await db.update(media).set({ deletedAt: new Date() }).where(eq(media.id, m.id));
    expect((await queryPublicAbout(db))?.photo).toBeNull();
  });
});

describe("활동 기록", () => {
  it("저장·공개 기록에는 내용이 없다", async () => {
    const { version } = await saveAboutDraft(db, admin, 0, input({ headline: "비밀스러운 헤드라인", body: doc("비밀스러운 본문") }));
    await publishAbout(db, admin, version);
    const { items } = await listAudit(db, admin, 1);
    expect(items.map((x) => x.action).sort()).toEqual(["about.publish", "about.save"]);
    expect(JSON.stringify(items)).not.toContain("비밀스러운");
  });
});
