/**
 * 동의 문구·개인정보 처리방침의 기본값과 버전 표기 (순수 코드).
 * 어드민에서 새 버전을 게시하기 전에는 아래 기본 문구와 옛 버전 표기(CONSENT_VERSION)를 쓴다.
 * 접수된 신청에는 신청자가 본 문구의 버전 표기가 남는다 (SECURITY §8).
 */
import { CONSENT_VERSION } from "@/lib/forms/inquiry";

export type ConsentKind = "reservation" | "notice" | "privacy";
export const CONSENT_KINDS: ConsentKind[] = ["reservation", "notice", "privacy"];

export const CONSENT_LABELS: Record<ConsentKind, string> = {
  reservation: "예약 문의 동의 문구",
  notice: "소식 받기 동의 문구",
  privacy: "개인정보 처리방침",
};

export const DEFAULT_CONSENT_TEXT: Record<"reservation" | "notice", string> = {
  reservation: "개인정보 수집·이용에 동의합니다.",
  notice: "이 투어의 모집이 시작되면 이메일로 안내를 받는 데 동의합니다.",
};

/** 어드민에서 새 버전을 만들기 전의 표기. 신청에는 이 값이 남는다 */
export const BUILTIN_VERSION = CONSENT_VERSION;

export const CONSENT_LIMITS = { checkbox: 200, privacy: 20000 } as const;

/** DB 에 저장되는 버전 표기: reservation:3 */
export function versionLabel(kind: ConsentKind, version: number): string {
  return `${kind}:${version}`;
}

/** 표기를 풀어 낸다. 옛 표기(BUILTIN_VERSION)나 모르는 형식이면 null */
export function parseVersionLabel(label: string): { kind: ConsentKind; version: number } | null {
  const m = /^(reservation|notice|privacy):(\d{1,6})$/.exec(label);
  return m ? { kind: m[1] as ConsentKind, version: Number.parseInt(m[2]!, 10) } : null;
}

export interface CurrentConsent {
  /** 신청에 남길 버전 표기 */
  version: string;
  text: string;
}

export function validateConsentBody(kind: ConsentKind, raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return { ok: false, error: "문구를 입력해 주세요." };
  if (kind === "privacy") {
    if (text.length > CONSENT_LIMITS.privacy) return { ok: false, error: `${CONSENT_LIMITS.privacy.toLocaleString("ko-KR")}자까지 쓸 수 있습니다.` };
    return { ok: true, value: text };
  }
  if (text.includes("\n")) return { ok: false, error: "동의 문구는 한 줄로 입력해 주세요." };
  if (text.length > CONSENT_LIMITS.checkbox) return { ok: false, error: `${CONSENT_LIMITS.checkbox}자까지 쓸 수 있습니다.` };
  return { ok: true, value: text };
}
