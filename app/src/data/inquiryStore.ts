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
  /** 접수 알림 메일의 결과를 남긴다 (실패를 어드민에 보이기 위해). 저장소가 지원하지 않으면 없다 */
  markNotify?(id: string, status: "sent" | "failed"): Promise<void>;
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

/**
 * 환경 설정에 맞는 저장소. 설정이 없거나 모자라면 undefined (= 접수 불가, 폼은 실패 안내).
 * - INQUIRY_STORE=postgres : DATABASE_URL 의 Postgres(Neon)에 저장
 * - INQUIRY_STORE=memory   : 개발·시험용 메모리 (서버를 다시 시작하면 사라짐)
 */
export function getInquiryStore(env: Record<string, string | undefined> = process.env): InquiryStore | undefined {
  if (env.INQUIRY_STORE === "memory") return memoryStore;
  if (env.INQUIRY_STORE === "postgres") {
    const url = env.DATABASE_URL?.trim();
    if (!url) return undefined;
    return postgresStore(url);
  }
  return undefined;
}

let postgres: { url: string; store: InquiryStore } | undefined;

function postgresStore(url: string): InquiryStore {
  if (!postgres || postgres.url !== url) {
    // 필요할 때만 불러온다 (메모리·시험 환경에서는 DB 드라이버를 읽지 않는다)
    postgres = {
      url,
      store: {
        async save(entry) {
          const [{ getDb }, { createPostgresInquiryStore }] = await Promise.all([import("@/db/client"), import("./postgresInquiryStore")]);
          return createPostgresInquiryStore(getDb(url)).save(entry);
        },
        async markNotify(id, status) {
          const [{ getDb }, { createPostgresInquiryStore }] = await Promise.all([import("@/db/client"), import("./postgresInquiryStore")]);
          return createPostgresInquiryStore(getDb(url)).markNotify!(id, status);
        },
      },
    };
  }
  return postgres.store;
}
