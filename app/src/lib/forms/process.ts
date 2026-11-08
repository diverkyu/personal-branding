import { createHash } from "node:crypto";
import type { InquiryKind, InquiryStore } from "@/data/inquiryStore";
import type { Tour } from "@/types/content";
import { logger } from "@/lib/logger";
import { CONSENT_VERSION, isHoneypotFilled, preservedValues, validateInquiry, validateNotice } from "./inquiry";
import type { createDuplicateGuard, createRateLimiter } from "./rateLimit";
import type { FormState } from "./state";

const FIELDS: Record<InquiryKind, string[]> = {
  reservation: ["name", "phone", "email", "people", "experience", "message"],
  notice: ["name", "email"],
};

/** 어떤 투어 상태에서 어떤 폼을 받는가 (SCREEN-SPEC §5.7.1) */
const ACCEPTS: Record<InquiryKind, Tour["status"]> = { reservation: "recruiting", notice: "upcoming" };

export interface SubmissionDeps {
  store: InquiryStore | undefined;
  limiter: ReturnType<typeof createRateLimiter>;
  duplicates: ReturnType<typeof createDuplicateGuard>;
  now?: () => Date;
}

const FAILED: FormState = { status: "failed" };

/**
 * 폼 제출 처리 (INT-06 ③). 순서: 허니팟 → 빈도 제한 → 대상 투어 확인 → 서버 검증 → 중복 확인 → 저장.
 * 차단된 경우에도 사용자에게는 일반 실패만 돌려주고 사유는 로그에만 남긴다. 로그에는 입력값(개인정보)을 쓰지 않는다.
 */
export async function processSubmission(
  kind: InquiryKind,
  tour: Tour | undefined,
  data: FormData,
  ip: string,
  deps: SubmissionDeps,
): Promise<FormState> {
  const now = deps.now ?? (() => new Date());
  const base = { kind, tourSlug: tour?.slug };

  if (isHoneypotFilled(data)) {
    logger.warn("inquiry.blocked", { ...base, reason: "honeypot" });
    return FAILED;
  }
  if (!deps.limiter.allow(ip)) {
    logger.warn("inquiry.blocked", { ...base, reason: "rate_limit" });
    return FAILED;
  }
  if (!tour || tour.status !== ACCEPTS[kind]) {
    logger.warn("inquiry.rejected", { ...base, reason: "tour_not_accepting" });
    return FAILED;
  }

  const result = kind === "reservation" ? validateInquiry(data, { capacity: tour.capacity }) : validateNotice(data);
  if (!result.ok) {
    return { status: "invalid", fieldErrors: result.errors, values: preservedValues(data, FIELDS[kind]) };
  }

  const fingerprint = createHash("sha256").update(JSON.stringify([kind, tour.slug, result.value])).digest("hex");
  if (!deps.duplicates.firstTime(fingerprint)) {
    // 같은 내용의 연속 제출: 한 번만 저장하고 사용자에게는 성공으로 보인다 (멱등)
    logger.info("inquiry.duplicate", base);
    return { status: "success" };
  }

  if (!deps.store) {
    logger.error("inquiry.store_unavailable", { ...base, hint: "INQUIRY_STORE 가 설정되지 않아 저장하지 못했습니다" });
    return { ...FAILED, values: preservedValues(data, FIELDS[kind]) };
  }

  const receivedAt = now().toISOString();
  try {
    await logger.operation(
      "inquiry.save",
      () => deps.store!.save({ kind, tourSlug: tour.slug, receivedAt, consentAt: receivedAt, consentVersion: CONSENT_VERSION, data: result.value }),
      base,
    );
  } catch {
    // operation() 이 이미 오류를 구조화 로그로 남겼다. 사용자에게는 입력을 보존한 채 실패를 알린다.
    return { ...FAILED, values: preservedValues(data, FIELDS[kind]) };
  }
  return { status: "success" };
}
