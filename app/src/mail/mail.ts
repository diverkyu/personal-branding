/**
 * 접수 알림 메일 어댑터 (INFRASTRUCTURE §4, SECURITY §8). 서비스는 Resend 이고, 호출하는 쪽은 `Mailer` 인터페이스만 안다.
 * 규칙:
 * - **수신자·제목·본문에 신청자가 입력한 값을 넣지 않는다.** 메일은 "새 신청이 도착했다"와 어드민 링크뿐이다(개인정보가 메일로 나가지 않는다).
 * - 메일이 실패해도 신청은 이미 저장되어 있다. 이 모듈은 던지지 않고 결과(`sent`/`failed`)를 돌려준다.
 * - 키(`RESEND_API_KEY`)와 발신 주소(`MAIL_FROM`)가 없거나, 프리뷰 환경이면 보내지 않는다(`undefined`). 키 값은 어디에도 남기지 않는다.
 * - 외부 요청은 5초 안에 끝나지 않으면 실패로 본다(신청자가 오래 기다리지 않게).
 */
import type { InquiryKind } from "@/data/inquiryStore";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export type MailResult = { status: "sent" } | { status: "failed"; reason: string };

export interface Mailer {
  send(message: MailMessage): Promise<MailResult>;
}

const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 5000;
/** 메일 주소 형식 (settings/registry 의 규칙과 같다) */
const EMAIL = /^[^\s@?&,;<>"']+@[^\s@?&,;<>"']+\.[^\s@?&,;<>"']+$/;

export const isMailAddress = (value: string): boolean => EMAIL.test(value);

export function resendMailer(config: { apiKey: string; from: string }, fetchImpl: typeof fetch = fetch): Mailer {
  return {
    async send(message) {
      if (!isMailAddress(message.to)) return { status: "failed", reason: "invalid_recipient" };
      try {
        const response = await fetchImpl(RESEND_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: config.from, to: [message.to], subject: message.subject, text: message.text }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        // 응답 본문에 수신자 정보가 있을 수 있어 읽지 않고 상태 코드만 쓴다
        return response.ok ? { status: "sent" } : { status: "failed", reason: `http_${response.status}` };
      } catch (error) {
        return { status: "failed", reason: error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network" };
      }
    },
  };
}

/**
 * 환경에 맞는 발송기. 키·발신 주소가 없거나 프리뷰(VERCEL_ENV 가 production 이 아님)이면 undefined — 실제로 보내지 않는다.
 * 로컬 개발(VERCEL_ENV 없음)에서도 키를 넣었을 때만 보낸다.
 */
export function getMailer(env: Record<string, string | undefined> = process.env): Mailer | undefined {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.MAIL_FROM?.trim();
  if (!apiKey || !from) return undefined;
  if (env.VERCEL_ENV && env.VERCEL_ENV !== "production") return undefined;
  return resendMailer({ apiKey, from });
}

const SUBJECTS: Record<InquiryKind, string> = {
  reservation: "[KYU] 새 투어 예약 문의가 도착했습니다",
  notice: "[KYU] 새 투어 소식 받기 신청이 도착했습니다",
};

/** 알림 내용. 신청자 입력은 하나도 넣지 않는다 — 종류와 어드민 링크(id 는 서버가 만든 값)뿐이다 */
export function inquiryNotification(kind: InquiryKind, id: string, siteOrigin: string): { subject: string; text: string } {
  return {
    subject: SUBJECTS[kind],
    text: `새 신청이 도착했습니다.\n\n어드민에서 확인해 주세요: ${siteOrigin}/admin/inquiries/${id}\n\n(개인정보 보호를 위해 신청 내용은 메일에 담지 않습니다.)\n`,
  };
}

export type NotifyOutcome = "sent" | "failed" | "skipped";

/** 알림을 보내고 결과를 돌려준다. 수신자나 발송기가 없으면 skipped(보내지 않음). 어떤 경우에도 던지지 않는다 */
export async function notifyInquiry(
  deps: { mailer: Mailer | undefined; recipient: string | undefined; siteOrigin: string },
  kind: InquiryKind,
  id: string,
): Promise<{ outcome: NotifyOutcome; reason?: string }> {
  const to = deps.recipient?.trim();
  if (!deps.mailer || !to) return { outcome: "skipped" };
  try {
    const result = await deps.mailer.send({ to, ...inquiryNotification(kind, id, deps.siteOrigin) });
    return result.status === "sent" ? { outcome: "sent" } : { outcome: "failed", reason: result.reason };
  } catch {
    return { outcome: "failed", reason: "unexpected" };
  }
}
