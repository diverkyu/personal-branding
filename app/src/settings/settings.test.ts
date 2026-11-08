import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { auditLog, consentVersions, siteSettings } from "@/db/schema";
import { listAudit } from "@/data/admin/audit";
import type { AdminDb } from "@/data/admin/db";
import { listConsentVersions, listStoredSettings, publishConsentVersion, saveSettings } from "@/data/admin/settings";
import type { AdminSession } from "@/lib/auth/types";
import { BUILTIN_VERSION, DEFAULT_CONSENT_TEXT, parseVersionLabel, validateConsentBody, versionLabel } from "./consent";
import { SETTINGS, SETTINGS_BY_KEY, defaultSettings, resolveSettings, splitSlogan, validateSetting } from "./registry";
import { loadCurrentConsent, loadCurrentPrivacy, loadSettings, resolveConsentVersion } from "./store";

/** 실제 Postgres 엔진(PGlite)에 실제 마이그레이션을 적용해 설정·동의 문구 저장을 시험한다. */
const admin: AdminSession = { userId: "admin-1", name: "시험 관리자", email: "admin@example.com" };
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
  await db.delete(siteSettings);
  await db.delete(consentVersions);
  await db.delete(auditLog);
});

const def = (key: string) => SETTINGS_BY_KEY[key]!;

describe("설정 규칙", () => {
  it("모든 설정의 기본값이 자기 규칙을 통과한다", () => {
    for (const s of SETTINGS) expect(validateSetting(s, s.default), s.key).toEqual({ ok: true, value: s.default });
  });

  it("줄 수·글자 수·이메일 형식을 검사하고 빈 값은 기본값 복원이다", () => {
    expect(validateSetting(def("home.headline"), "가\n나\n다")).toMatchObject({ ok: false });
    expect(validateSetting(def("home.headline"), "가".repeat(25))).toMatchObject({ ok: false });
    expect(validateSetting(def("home.headline"), " 가 \r\n\r\n 나 ")).toEqual({ ok: true, value: "가\n나" });
    expect(validateSetting(def("footer.owner"), "a\nb")).toMatchObject({ ok: false });
    expect(validateSetting(def("footer.owner"), "   ")).toEqual({ ok: true, value: "" });
    for (const bad of ["not-an-email", "a@b", "a b@example.com", "a@example.com?subject=x", "a@example.com&bcc=x@y.z", "<a@example.com>"]) {
      expect(validateSetting(def("contact.email"), bad), bad).toMatchObject({ ok: false });
    }
    expect(validateSetting(def("contact.email"), "hello@kyu.example")).toEqual({ ok: true, value: "hello@kyu.example" });
  });

  it("저장된 값이 규칙에 어긋나면 기본값을 쓰고, 모르는 키는 무시한다", () => {
    const r = resolveSettings({ "contact.email": "broken", "footer.owner": "홍길동", "unknown.key": "x" });
    expect(r["contact.email"]).toBe(defaultSettings()["contact.email"]);
    expect(r["footer.owner"]).toBe("홍길동");
    expect(r["unknown.key"]).toBeUndefined();
  });

  it("영문 슬로건을 두 줄과 강조어로 나눈다", () => {
    expect(splitSlogan("Dive deeper. Create beyond.")).toEqual({ line1: "Dive deeper.", line2Lead: "Create", accent: "beyond." });
    expect(splitSlogan("Just one line")).toEqual({ line1: "Just one line", line2Lead: "", accent: "" });
  });
});

describe("설정 저장 (PGlite)", () => {
  it("바꾼 값만 저장하고(기본값과 같은 입력은 바뀐 것이 아님), 읽으면 기본값과 합쳐진다", async () => {
    const result = await saveSettings(db, admin, [{ key: "contact.email", value: "hello@kyu.example", version: 0 }, { key: "footer.owner", value: "KYU · 이동규", version: 0 }], { confirmBrandCore: false });
    expect(result).toEqual({ ok: true, changed: 1 });
    const loaded = await loadSettings(db);
    expect(loaded["contact.email"]).toBe("hello@kyu.example");
    expect(loaded["footer.owner"]).toBe("KYU · 이동규");
    expect(await db.select().from(siteSettings)).toHaveLength(1);
  });

  it("전체가 유효해야 저장한다 (일부만 저장되지 않음)", async () => {
    const r = await saveSettings(db, admin, [{ key: "footer.owner", value: "정상", version: 0 }, { key: "contact.email", value: "broken", version: 0 }], { confirmBrandCore: false });
    expect(r).toMatchObject({ ok: false, errors: { "contact.email": expect.any(String) } });
    expect(await db.select().from(siteSettings)).toHaveLength(0);
  });

  it("브랜드 핵심 문구는 확인 없이는 바뀌지 않는다", async () => {
    const input = [{ key: "home.slogan", value: "Explore more. Dream bigger.", version: 0 }];
    expect(await saveSettings(db, admin, input, { confirmBrandCore: false })).toMatchObject({ ok: false, errors: { "home.slogan": expect.stringContaining("확인") } });
    expect(await saveSettings(db, admin, input, { confirmBrandCore: true })).toEqual({ ok: true, changed: 1 });
    expect((await loadSettings(db))["home.slogan"]).toBe("Explore more. Dream bigger.");
  });

  it("같은 값을 다시 저장해도 version 이 오르지 않고, 값을 지우면 기본값으로 돌아간다", async () => {
    await saveSettings(db, admin, [{ key: "footer.owner", value: "홍길동", version: 0 }], { confirmBrandCore: false });
    let stored = await listStoredSettings(db, admin);
    expect(stored["footer.owner"]?.version).toBe(1);
    expect(await saveSettings(db, admin, [{ key: "footer.owner", value: "홍길동", version: 1 }], { confirmBrandCore: false })).toEqual({ ok: true, changed: 0 });
    await saveSettings(db, admin, [{ key: "footer.owner", value: "김철수", version: 1 }], { confirmBrandCore: false });
    stored = await listStoredSettings(db, admin);
    expect(stored["footer.owner"]).toMatchObject({ value: "김철수", version: 2 });
    expect(await saveSettings(db, admin, [{ key: "footer.owner", value: "", version: 2 }], { confirmBrandCore: false })).toEqual({ ok: true, changed: 1 });
    expect((await loadSettings(db))["footer.owner"]).toBe(defaultSettings()["footer.owner"]);
  });

  it("다른 곳에서 먼저 저장했으면 덮어쓰지 않고 충돌로 알린다", async () => {
    await saveSettings(db, admin, [{ key: "footer.owner", value: "첫 저장", version: 0 }], { confirmBrandCore: false });
    // 같은 화면(version 1)을 연 두 사람 중 한 사람이 먼저 저장
    await saveSettings(db, admin, [{ key: "footer.owner", value: "먼저", version: 1 }], { confirmBrandCore: false });
    const late = await saveSettings(db, admin, [{ key: "footer.owner", value: "나중", version: 1 }], { confirmBrandCore: false });
    expect(late).toMatchObject({ ok: false, conflict: true });
    expect((await loadSettings(db))["footer.owner"]).toBe("먼저");
    // 처음 저장하는 키를 동시에 저장하는 경우도 막는다
    await saveSettings(db, admin, [{ key: "seo.title", value: "제목 A", version: 0 }], { confirmBrandCore: false });
    expect(await saveSettings(db, admin, [{ key: "seo.title", value: "제목 B", version: 0 }], { confirmBrandCore: false })).toMatchObject({ ok: false, conflict: true });
  });

  it("알 수 없는 키는 거부하고, 활동 기록에는 키만 남는다", async () => {
    await expect(saveSettings(db, admin, [{ key: "evil.key", value: "x", version: 0 }], { confirmBrandCore: false })).rejects.toThrow("알 수 없는");
    await saveSettings(db, admin, [{ key: "contact.email", value: "secret-person@example.com", version: 0 }], { confirmBrandCore: false });
    const { items } = await listAudit(db, admin, 1);
    expect(items[0]).toMatchObject({ action: "settings.update", targetId: "contact.email" });
    expect(JSON.stringify(items)).not.toContain("secret-person");
  });
});

describe("동의 문구 버전 (PGlite)", () => {
  it("게시된 버전이 없으면 기본 문구와 옛 버전 표기를 쓴다", async () => {
    expect(await loadCurrentConsent(db, "reservation")).toEqual({ version: BUILTIN_VERSION, text: DEFAULT_CONSENT_TEXT.reservation });
    expect(await loadCurrentPrivacy(db)).toBeNull();
  });

  it("새 버전을 게시하면 번호가 오르고 이전 버전은 남는다", async () => {
    expect(await publishConsentVersion(db, admin, "reservation", "새 동의 문구 1")).toEqual({ version: 1 });
    expect(await publishConsentVersion(db, admin, "reservation", "새 동의 문구 2")).toEqual({ version: 2 });
    expect(await publishConsentVersion(db, admin, "notice", "소식 문구")).toEqual({ version: 1 });
    expect(await loadCurrentConsent(db, "reservation")).toEqual({ version: "reservation:2", text: "새 동의 문구 2" });
    const all = await listConsentVersions(db, admin, "reservation");
    expect(all.map((v) => v.version)).toEqual([2, 1]);
    expect(all[1]?.body).toBe("새 동의 문구 1");
    await expect(publishConsentVersion(db, admin, "reservation", "새 동의 문구 2")).rejects.toThrow("같은 내용");
  });

  it("검증: 빈 문구·긴 문구·줄바꿈(체크 문구)·알 수 없는 종류를 거부한다. 방침은 여러 줄을 허용한다", async () => {
    await expect(publishConsentVersion(db, admin, "reservation", "   ")).rejects.toThrow();
    await expect(publishConsentVersion(db, admin, "reservation", "가".repeat(201))).rejects.toThrow("200자");
    await expect(publishConsentVersion(db, admin, "notice", "줄1\n줄2")).rejects.toThrow("한 줄");
    await expect(publishConsentVersion(db, admin, "hack" as never, "x")).rejects.toThrow();
    expect(await publishConsentVersion(db, admin, "privacy", "1. 수집 항목\n\n2. 보관 기간")).toEqual({ version: 1 });
    const p = await loadCurrentPrivacy(db);
    expect(p?.body).toContain("2. 보관 기간");
  });

  it("DB 제약이 이상한 종류와 같은 버전 중복을 막는다", async () => {
    await expect(client.query(`insert into consent_versions (kind, version, body, created_by) values ('hack', 1, 'x', 'a')`)).rejects.toThrow();
    await client.query(`insert into consent_versions (kind, version, body, created_by) values ('notice', 1, 'x', 'a')`);
    await expect(client.query(`insert into consent_versions (kind, version, body, created_by) values ('notice', 1, 'y', 'a')`)).rejects.toThrow();
  });

  it("신청에 남길 버전: 폼이 본 버전이 실제로 있으면 그대로, 조작된 값이면 현재 버전", async () => {
    await publishConsentVersion(db, admin, "reservation", "문구 v1");
    await publishConsentVersion(db, admin, "reservation", "문구 v2");
    expect(await resolveConsentVersion(db, "reservation", undefined)).toBe("reservation:2");
    expect(await resolveConsentVersion(db, "reservation", "reservation:1")).toBe("reservation:1"); // 오래된 화면에서 제출
    expect(await resolveConsentVersion(db, "reservation", "reservation:99")).toBe("reservation:2");
    expect(await resolveConsentVersion(db, "reservation", "notice:1")).toBe("reservation:2");
    expect(await resolveConsentVersion(db, "reservation", "<script>")).toBe("reservation:2");
    expect(await resolveConsentVersion(db, "notice", BUILTIN_VERSION)).toBe(BUILTIN_VERSION);
  });

  it("버전 표기 만들기·풀기", () => {
    expect(versionLabel("notice", 3)).toBe("notice:3");
    expect(parseVersionLabel("notice:3")).toEqual({ kind: "notice", version: 3 });
    expect(parseVersionLabel("2026-11-08.1")).toBeNull();
    expect(parseVersionLabel("privacy:x")).toBeNull();
    expect(validateConsentBody("reservation", "동의합니다.")).toEqual({ ok: true, value: "동의합니다." });
  });
});
