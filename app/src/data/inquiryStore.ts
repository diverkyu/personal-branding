/**
 * 문의·소식 신청의 저장 입구. 저장소(DB)가 아직 정해지지 않아, 지금은 개발·시험용 메모리 구현만 있다.
 * **운영에서 `INQUIRY_STORE` 가 비어 있으면 저장하지 않고 "사용할 수 없음"을 돌려준다** — 저장하지 못한 신청을 접수됐다고 말하지 않기 위해서다.
 */
import type { InquiryInput, NoticeInput } from "@/lib/forms/inquiry";

export type InquiryKind = "reservation" | "notice";

export interface StoredInquiry {
  id: string;
  kind: InquiryKind;
  tourSlug: string;
  receivedAt: string;
  consentAt: string;
  consentVersion: string;
  data: InquiryInput | NoticeInput;
}

export interface InquiryStore {
  save(entry: Omit<StoredInquiry, "id">): Promise<{ id: string }>;
}

const memory: StoredInquiry[] = [];

export const memoryStore: InquiryStore = {
  async save(entry) {
    const id = `mem-${memory.length + 1}`;
    memory.push({ id, ...entry });
    return { id };
  },
};

/** 시험에서 저장된 개수를 확인하는 용도 (개인정보를 반환하지 않는다) */
export function memoryStoreCount(): number {
  return memory.length;
}

export function resetMemoryStore(): void {
  memory.length = 0;
}

/** 환경 설정에 맞는 저장소. 설정이 없으면 undefined (= 접수 불가) */
export function getInquiryStore(env: Record<string, string | undefined> = process.env): InquiryStore | undefined {
  return env.INQUIRY_STORE === "memory" ? memoryStore : undefined;
}
