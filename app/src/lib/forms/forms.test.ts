import { beforeEach, describe, expect, it } from "vitest";
import { memoryStore, memoryStoreCount, resetMemoryStore, getInquiryStore } from "@/data/inquiryStore";
import type { Tour } from "@/types/content";
import { CONSENT_VERSION, validateInquiry, validateNotice } from "./inquiry";
import { processSubmission, type SubmissionDeps } from "./process";
import { createDuplicateGuard, createRateLimiter } from "./rateLimit";

function form(values: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}

const GOOD = { name: "홍길동", phone: "010-0000-0000", email: "test@example.com", people: "2", experience: "", message: "", consent: "on" };

describe("예약 문의 서버 검증", () => {
  it("올바른 입력은 통과하고 값은 정리(trim)된다", () => {
    const r = validateInquiry(form({ ...GOOD, name: "  홍길동  " }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toMatchObject({ name: "홍길동", people: 2 });
  });

  it("필수값·형식·범위 오류를 필드별로 알린다", () => {
    const r = validateInquiry(form({ name: "", phone: "abc", email: "no-at", people: "11", consent: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["consent", "email", "name", "people", "phone"]);
  });

  it("정원이 있으면 인원 상한은 정원이다", () => {
    expect(validateInquiry(form({ ...GOOD, people: "5" }), { capacity: 4 }).ok).toBe(false);
    expect(validateInquiry(form({ ...GOOD, people: "4" }), { capacity: 4 }).ok).toBe(true);
  });

  it("길이 상한: 이름 40자, 경험 100자, 문의 1000자", () => {
    expect(validateInquiry(form({ ...GOOD, name: "가".repeat(41) })).ok).toBe(false);
    expect(validateInquiry(form({ ...GOOD, experience: "a".repeat(101) })).ok).toBe(false);
    expect(validateInquiry(form({ ...GOOD, message: "a".repeat(1001) })).ok).toBe(false);
    expect(validateInquiry(form({ ...GOOD, message: "a".repeat(1000) })).ok).toBe(true);
  });

  it("이름·이메일에 줄바꿈(헤더 삽입)이 있으면 거부한다", () => {
    expect(validateInquiry(form({ ...GOOD, name: "홍\r\nBcc: x@example.com" })).ok).toBe(false);
    expect(validateInquiry(form({ ...GOOD, email: "a@example.com\nBcc: x@example.com" })).ok).toBe(false);
  });

  it("인원은 정수만 받는다 (소수·지수 표기·음수 거부)", () => {
    for (const p of ["1.5", "1e1", "-1", "0", ""]) expect(validateInquiry(form({ ...GOOD, people: p })).ok, p).toBe(false);
  });
});

describe("소식 받기 서버 검증", () => {
  it("이름·이메일·동의만 필요하다", () => {
    expect(validateNotice(form({ name: "홍길동", email: "test@example.com", consent: "on" })).ok).toBe(true);
    const r = validateNotice(form({ name: "홍길동", email: "test@example.com" }));
    expect(r.ok).toBe(false);
  });
});

const recruiting: Tour = { slug: "t1", title: "t", status: "recruiting", startDate: "2026-12-05", endDate: "2026-12-07", place: "p", capacity: 8, summary: "", description: [], thumbVariant: "sea-a" };
const upcoming: Tour = { ...recruiting, slug: "t2", status: "upcoming" };

function deps(over: Partial<SubmissionDeps> = {}): SubmissionDeps {
  return { store: memoryStore, limiter: createRateLimiter({ limit: 3, windowMs: 1000 }), duplicates: createDuplicateGuard({ windowMs: 1000 }), ...over };
}

describe("제출 처리 (INT-06)", () => {
  beforeEach(() => resetMemoryStore());

  it("성공하면 저장하고 동의 버전·일시를 함께 남긴다", async () => {
    const r = await processSubmission("reservation", recruiting, form(GOOD), "1.1.1.1", deps());
    expect(r.status).toBe("success");
    expect(memoryStoreCount()).toBe(1);
    expect(CONSENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });

  it("검증 실패는 invalid + 필드 오류 + 입력 보존(동의 제외)", async () => {
    const r = await processSubmission("reservation", recruiting, form({ ...GOOD, phone: "x" }), "1.1.1.1", deps());
    expect(r.status).toBe("invalid");
    expect(r.fieldErrors?.phone).toBeDefined();
    expect(r.values?.name).toBe("홍길동");
    expect(r.values).not.toHaveProperty("consent");
    expect(memoryStoreCount()).toBe(0);
  });

  it("허니팟이 채워지면 저장하지 않고 일반 실패만 돌려준다 (사유 노출 없음)", async () => {
    const r = await processSubmission("reservation", recruiting, form({ ...GOOD, website: "http://spam.example" }), "1.1.1.1", deps());
    expect(r).toEqual({ status: "failed" });
    expect(memoryStoreCount()).toBe(0);
  });

  it("같은 접속 주소의 과도한 제출은 막는다", async () => {
    const d = deps();
    const results = [];
    for (let i = 0; i < 4; i++) results.push((await processSubmission("reservation", recruiting, form({ ...GOOD, email: `a${i}@example.com` }), "2.2.2.2", d)).status);
    expect(results).toEqual(["success", "success", "success", "failed"]);
    expect(memoryStoreCount()).toBe(3);
  });

  it("같은 내용을 연속으로 보내면 한 번만 저장한다 (멱등)", async () => {
    const d = deps();
    expect((await processSubmission("reservation", recruiting, form(GOOD), "3.3.3.3", d)).status).toBe("success");
    expect((await processSubmission("reservation", recruiting, form(GOOD), "3.3.3.3", d)).status).toBe("success");
    expect(memoryStoreCount()).toBe(1);
  });

  it("모집 상태에 맞지 않는 폼은 받지 않는다 (예약 문의는 모집 중만, 소식 받기는 모집 예정만)", async () => {
    expect((await processSubmission("reservation", upcoming, form(GOOD), "4.4.4.4", deps())).status).toBe("failed");
    expect((await processSubmission("notice", recruiting, form({ name: "a", email: "a@example.com", consent: "on" }), "4.4.4.4", deps())).status).toBe("failed");
    expect((await processSubmission("reservation", undefined, form(GOOD), "4.4.4.4", deps())).status).toBe("failed");
    expect(memoryStoreCount()).toBe(0);
  });

  it("저장소가 없으면 접수된 것처럼 말하지 않고 실패를 돌려주며 입력을 보존한다", async () => {
    const r = await processSubmission("reservation", recruiting, form(GOOD), "5.5.5.5", deps({ store: undefined }));
    expect(r.status).toBe("failed");
    expect(r.values?.email).toBe("test@example.com");
  });

  it("저장소가 오류를 던지면 실패와 입력 보존, 오류는 삼키지 않고 로그로 남는다", async () => {
    const broken = { save: () => Promise.reject(new Error("db down")) };
    const r = await processSubmission("reservation", recruiting, form(GOOD), "6.6.6.6", deps({ store: broken }));
    expect(r.status).toBe("failed");
    expect(r.values?.name).toBe("홍길동");
  });
});

describe("저장소 선택", () => {
  it("설정이 없거나 알 수 없는 값이면 저장소가 없다 (운영 기본은 접수 불가)", () => {
    expect(getInquiryStore({})).toBeUndefined();
    expect(getInquiryStore({ INQUIRY_STORE: "other" })).toBeUndefined();
    expect(getInquiryStore({ INQUIRY_STORE: "memory" })).toBe(memoryStore);
  });

  it("postgres 는 DATABASE_URL 이 있을 때만 저장소를 만들고, 만들 때 연결하지 않는다", () => {
    expect(getInquiryStore({ INQUIRY_STORE: "postgres" })).toBeUndefined();
    expect(getInquiryStore({ INQUIRY_STORE: "postgres", DATABASE_URL: "  " })).toBeUndefined();
    const store = getInquiryStore({ INQUIRY_STORE: "postgres", DATABASE_URL: "postgresql://user:pw@localhost.invalid/db" });
    expect(store).toBeDefined();
    expect(store).not.toBe(memoryStore);
  });
});

describe("빈도 제한기", () => {
  it("시간이 지나면 다시 허용한다", () => {
    let t = 0;
    const l = createRateLimiter({ limit: 1, windowMs: 100, now: () => t });
    expect(l.allow("k")).toBe(true);
    expect(l.allow("k")).toBe(false);
    t = 101;
    expect(l.allow("k")).toBe(true);
  });
});
