import { describe, expect, it } from "vitest";
import { BUILTIN_VERSION } from "@/settings/consent";
import { readinessChecks, todoCount, type ReadinessInput } from "./readiness";

const READY: ReadinessInput = {
  env: { RESEND_API_KEY: "re_secret_value_1234", MAIL_FROM: "KYU <noreply@diverkyu.com>", MEDIA_STORE: "blob", BLOB_READ_WRITE_TOKEN: "vercel_blob_secret_token", CRON_SECRET: "x".repeat(24), SITE_URL: "https://www.diverkyu.com", SITE_INDEXING: "on" },
  settings: { "contact.email": "hello@diverkyu.com", "notify.email": "owner@diverkyu.com" },
  privacyPublished: true,
  consentVersions: { reservation: "reservation:2", notice: "notice:1" },
};
const get = (input: ReadinessInput, id: string) => readinessChecks(input).find((i) => i.id === id)!;

describe("공개 준비 점검", () => {
  it("모두 갖춰지면 해야 할 일이 없다", () => {
    const items = readinessChecks(READY);
    expect(todoCount(items)).toBe(0);
    expect(items.map((i) => i.id)).toEqual(["contact", "privacy", "consent", "mail", "media", "cron", "domain", "indexing"]);
  });

  it("처음 상태(기본값)에서는 해야 할 일이 모두 보인다", () => {
    const items = readinessChecks({ env: {}, settings: {}, privacyPublished: false, consentVersions: { reservation: BUILTIN_VERSION, notice: BUILTIN_VERSION } });
    expect(items.filter((i) => i.status === "todo").map((i) => i.id)).toEqual(["contact", "privacy", "consent", "mail", "media", "cron"]);
    expect(get({ env: {}, settings: {}, privacyPublished: false, consentVersions: READY.consentVersions }, "domain").status).toBe("info");
  });

  it("연락 이메일이 예시 주소면 해야 할 일이다(기본값·example 도메인·빈 값·형식 오류)", () => {
    for (const email of ["contact@example.com", "a@example.org", "x@test.example", "", "no-at-sign"]) {
      expect(get({ ...READY, settings: { ...READY.settings, "contact.email": email } }, "contact").status, email).toBe("todo");
    }
    expect(get({ ...READY, settings: {} }, "contact").status).toBe("todo"); // 설정이 비면 코드 기본값(예시 주소)
  });

  it("동의 문구는 둘 중 하나라도 기본값이면 어느 쪽인지 알려 준다", () => {
    const one = get({ ...READY, consentVersions: { reservation: BUILTIN_VERSION, notice: "notice:1" } }, "consent");
    expect(one.status).toBe("todo");
    expect(one.detail).toContain("예약 문의");
    expect(one.detail).not.toContain("소식 받기");
    expect(get({ ...READY, consentVersions: { reservation: BUILTIN_VERSION, notice: BUILTIN_VERSION } }, "consent").detail).toContain("예약 문의·소식 받기");
  });

  it("알림 메일은 수신 이메일·키·발신 주소가 모두 있어야 완료이고, 빠진 것을 이름으로 알려 준다", () => {
    expect(get({ ...READY, settings: { ...READY.settings, "notify.email": "" } }, "mail").detail).toContain("알림 수신 이메일");
    const noKey = get({ ...READY, env: { ...READY.env, RESEND_API_KEY: "" } }, "mail");
    expect(noKey.status).toBe("todo");
    expect(noKey.detail).toContain("RESEND_API_KEY");
    expect(noKey.detail).not.toContain("MAIL_FROM");
    expect(get({ ...READY, env: { ...READY.env, MAIL_FROM: undefined } }, "mail").detail).toContain("MAIL_FROM");
  });

  it("이미지 저장소는 MEDIA_STORE=blob 과 토큰이 둘 다 있어야 완료다", () => {
    expect(get({ ...READY, env: { ...READY.env, BLOB_READ_WRITE_TOKEN: undefined } }, "media").status).toBe("todo");
    expect(get({ ...READY, env: { ...READY.env, MEDIA_STORE: "local" } }, "media").status).toBe("todo");
  });

  it("CRON_SECRET 은 16자 이상이어야 한다", () => {
    expect(get({ ...READY, env: { ...READY.env, CRON_SECRET: "short" } }, "cron").status).toBe("todo");
    expect(get({ ...READY, env: { ...READY.env, CRON_SECRET: "x".repeat(16) } }, "cron").status).toBe("ok");
  });

  it("임시 주소(vercel.app·localhost·형식 오류)는 참고이고, 임시 주소에서 검색 노출이 켜져 있으면 해야 할 일이다", () => {
    for (const url of ["https://personal-branding-l1sr.vercel.app", "http://localhost:3000", "not a url", undefined]) {
      expect(get({ ...READY, env: { ...READY.env, SITE_URL: url, SITE_INDEXING: undefined } }, "domain").status, String(url)).toBe("info");
    }
    expect(get({ ...READY, env: { ...READY.env, SITE_URL: "https://x.vercel.app", SITE_INDEXING: "on" } }, "indexing").status).toBe("todo");
    expect(get({ ...READY, env: { ...READY.env, SITE_INDEXING: "off" } }, "indexing").status).toBe("info");
  });

  it("info 는 해야 할 일 개수에 세지 않는다", () => {
    expect(todoCount([{ id: "a", label: "a", status: "info", detail: "", where: "domain" }, { id: "b", label: "b", status: "todo", detail: "", where: "admin" }])).toBe(1);
  });

  it("어떤 환경변수 값도 화면 글에 나오지 않는다 (이름만)", () => {
    const text = JSON.stringify(readinessChecks({ ...READY, env: { ...READY.env, RESEND_API_KEY: "SECRET-KEY-VALUE-1", MAIL_FROM: "SECRET-FROM", BLOB_READ_WRITE_TOKEN: "SECRET-BLOB-2", CRON_SECRET: "SECRET-CRON-3-xxxxxxxxxxxx", SITE_URL: "https://www.diverkyu.com" } }));
    for (const secret of ["SECRET-KEY-VALUE-1", "SECRET-FROM", "SECRET-BLOB-2", "SECRET-CRON-3"]) expect(text).not.toContain(secret);
    const missing = JSON.stringify(readinessChecks({ env: {}, settings: {}, privacyPublished: false, consentVersions: { reservation: BUILTIN_VERSION, notice: BUILTIN_VERSION } }));
    expect(missing).toContain("RESEND_API_KEY"); // 이름은 나온다
  });
});
