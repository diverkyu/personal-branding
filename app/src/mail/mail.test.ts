import { describe, expect, it } from "vitest";
import { getMailer, inquiryNotification, notifyInquiry, resendMailer, type Mailer } from "./mail";

const ok = (status = 200) => (async () => new Response("{}", { status })) as unknown as typeof fetch;

describe("Resend 발송기", () => {
  it("키는 헤더로만 보내고, 본문에는 받는 사람·제목·글만 담긴다", async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    const r = await resendMailer({ apiKey: "KEY", from: "KYU <noreply@example.com>" }, fetchImpl).send({ to: "a@example.com", subject: "s", text: "t" });
    expect(r).toEqual({ status: "sent" });
    expect(seen!.url).toBe("https://api.resend.com/emails");
    expect((seen!.init.headers as Record<string, string>).Authorization).toBe("Bearer KEY");
    expect(String(seen!.init.body)).not.toContain("KEY");
    expect(JSON.parse(String(seen!.init.body))).toEqual({ from: "KYU <noreply@example.com>", to: ["a@example.com"], subject: "s", text: "t" });
  });

  it("실패는 던지지 않고 이유 종류만 돌려준다 (HTTP 오류·네트워크 오류·잘못된 수신자)", async () => {
    const m = (f: typeof fetch) => resendMailer({ apiKey: "K", from: "f@example.com" }, f);
    expect(await m(ok(500)).send({ to: "a@example.com", subject: "s", text: "t" })).toEqual({ status: "failed", reason: "http_500" });
    expect(await m((async () => { throw new Error("net"); }) as unknown as typeof fetch).send({ to: "a@example.com", subject: "s", text: "t" })).toEqual({ status: "failed", reason: "network" });
    expect(await m(ok()).send({ to: "not-an-address", subject: "s", text: "t" })).toEqual({ status: "failed", reason: "invalid_recipient" });
    expect(await m(ok()).send({ to: "a@example.com\nBcc: x@example.com", subject: "s", text: "t" })).toEqual({ status: "failed", reason: "invalid_recipient" });
  });
});

describe("발송기 선택", () => {
  it("키나 발신 주소가 없으면 보내지 않는다", () => {
    expect(getMailer({})).toBeUndefined();
    expect(getMailer({ RESEND_API_KEY: "k" })).toBeUndefined();
    expect(getMailer({ MAIL_FROM: "f@example.com" })).toBeUndefined();
  });

  it("프리뷰 환경에서는 키가 있어도 보내지 않는다 (SECURITY §8)", () => {
    const env = { RESEND_API_KEY: "k", MAIL_FROM: "f@example.com" };
    expect(getMailer({ ...env, VERCEL_ENV: "preview" })).toBeUndefined();
    expect(getMailer({ ...env, VERCEL_ENV: "production" })).toBeDefined();
    expect(getMailer(env)).toBeDefined();
  });
});

describe("알림 내용", () => {
  it("신청자 입력이 들어갈 자리가 없다: 종류별 고정 제목 + 어드민 링크", () => {
    const n = inquiryNotification("reservation", "11111111-1111-1111-1111-111111111111", "https://site.example");
    expect(n.subject).toBe("[KYU] 새 투어 예약 문의가 도착했습니다");
    expect(n.text).toContain("https://site.example/admin/inquiries/11111111-1111-1111-1111-111111111111");
    expect(inquiryNotification("notice", "i", "https://s.example").subject).toContain("소식 받기");
  });

  it("수신자나 발송기가 없으면 skipped, 발송기가 던져도 failed 로 돌려준다", async () => {
    const throwing: Mailer = { send: () => Promise.reject(new Error("x")) };
    const sent: Mailer = { send: async () => ({ status: "sent" }) };
    const base = { siteOrigin: "https://s.example" };
    expect((await notifyInquiry({ ...base, mailer: undefined, recipient: "a@example.com" }, "notice", "i")).outcome).toBe("skipped");
    expect((await notifyInquiry({ ...base, mailer: sent, recipient: "" }, "notice", "i")).outcome).toBe("skipped");
    expect((await notifyInquiry({ ...base, mailer: throwing, recipient: "a@example.com" }, "notice", "i")).outcome).toBe("failed");
    expect((await notifyInquiry({ ...base, mailer: sent, recipient: "a@example.com" }, "notice", "i")).outcome).toBe("sent");
  });
});
