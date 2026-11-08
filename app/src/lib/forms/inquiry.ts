/**
 * 예약 문의·소식 받기 폼의 서버 검증 (SCREEN-SPEC §5.7.2 TOUR-F, §5.7.3 TOUR-N, SECURITY §5·§8).
 * 클라이언트 검증은 편의일 뿐이라, 여기가 유일한 기준이다. 순수 함수라 입력만으로 결과가 정해진다.
 */

/** 동의 문구의 버전. 문구가 바뀌면 올리고, 제출 시 함께 저장한다 (SECURITY §8) */
export const CONSENT_VERSION = "2026-11-08.1";

export const LIMITS = {
  nameMax: 40,
  emailMax: 100,
  experienceMax: 100,
  messageMax: 1000,
  peopleMin: 1,
  peopleMax: 10,
  phoneMin: 9,
  phoneMax: 15,
} as const;

export type FieldErrors = Record<string, string>;

export interface InquiryInput {
  name: string;
  phone: string;
  email: string;
  people: number;
  experience: string;
  message: string;
}

export interface NoticeInput {
  name: string;
  email: string;
}

export type Validated<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9-]+$/;
// 줄바꿈 등 제어 문자는 한 줄 입력에서 허용하지 않는다 (헤더 삽입 방지, SECURITY §5)
const CONTROL = /[\u0000-\u001f\u007f]/;

function text(data: FormData, key: string): string {
  const v = data.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function validName(name: string, errors: FieldErrors) {
  if (name.length < 1 || name.length > LIMITS.nameMax || CONTROL.test(name)) errors.name = `이름을 ${LIMITS.nameMax}자 이내로 입력해주세요.`;
}

function validEmail(email: string, errors: FieldErrors) {
  if (email.length < 1 || email.length > LIMITS.emailMax || CONTROL.test(email) || !EMAIL.test(email)) errors.email = "이메일을 확인해주세요.";
}

/** 동의 체크는 값이 "on" 일 때만 동의로 본다 */
export function hasConsent(data: FormData): boolean {
  return data.get("consent") === "on";
}

/** 허니팟: 사람에게는 보이지 않는 칸. 값이 있으면 자동 입력으로 본다 (TOUR-F08) */
export function isHoneypotFilled(data: FormData): boolean {
  return text(data, "website") !== "";
}

export function validateInquiry(data: FormData, opts: { capacity?: number } = {}): Validated<InquiryInput> {
  const errors: FieldErrors = {};
  const name = text(data, "name");
  const phone = text(data, "phone");
  const email = text(data, "email");
  const peopleRaw = text(data, "people");
  const experience = text(data, "experience");
  const message = text(data, "message");

  validName(name, errors);
  if (!PHONE.test(phone) || phone.length < LIMITS.phoneMin || phone.length > LIMITS.phoneMax) errors.phone = "연락처를 확인해주세요.";
  validEmail(email, errors);

  const people = Number(peopleRaw);
  const max = opts.capacity ? Math.min(opts.capacity, LIMITS.peopleMax) : LIMITS.peopleMax;
  if (!/^[0-9]+$/.test(peopleRaw) || !Number.isInteger(people) || people < LIMITS.peopleMin || people > max) {
    errors.people = `인원을 ${LIMITS.peopleMin}~${max}명 사이로 입력해주세요.`;
  }

  if (experience.length > LIMITS.experienceMax || CONTROL.test(experience)) errors.experience = `${LIMITS.experienceMax}자 이내로 입력해주세요.`;
  if (message.length > LIMITS.messageMax) errors.message = `${LIMITS.messageMax}자 이내로 입력해주세요.`;
  if (!hasConsent(data)) errors.consent = "개인정보 수집·이용에 동의해주세요.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, phone, email, people, experience, message } };
}

export function validateNotice(data: FormData): Validated<NoticeInput> {
  const errors: FieldErrors = {};
  const name = text(data, "name");
  const email = text(data, "email");
  validName(name, errors);
  validEmail(email, errors);
  if (!hasConsent(data)) errors.consent = "안내 수신에 동의해주세요.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, email } };
}

/** 오류가 났을 때 폼에 다시 채워 줄 값. 동의 체크와 허니팟은 보존하지 않는다 */
export function preservedValues(data: FormData, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = data.get(k);
    if (typeof v === "string") out[k] = v;
  }
  return out;
}
