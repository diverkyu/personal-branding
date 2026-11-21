/**
 * 스토리 유형의 항목 (ADMIN-DESIGN §41). 지금은 대표 이미지(목록·카드의 썸네일) 하나다.
 * 대표 이미지는 **그 글의 본문에 넣은 이미지 중에서** 고른다(편집 화면이 본문의 이미지만 보여 준다). 본문에서 그 이미지를 빼면
 * 저장할 때 대표 지정도 사라진다(`withCoverInBody`). 순수 함수만 둔다.
 */
import { AppError } from "@/lib/errors";

export interface StoryFields {
  /** 대표 이미지 id. 없으면 카드는 장식 배경을 쓴다 */
  coverMediaId: string | null;
}

export const EMPTY_STORY_FIELDS: StoryFields = { coverMediaId: null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cleanStoryFields(input: unknown): StoryFields {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const value = typeof raw.coverMediaId === "string" ? raw.coverMediaId.trim() : "";
  if (!value) return { coverMediaId: null };
  if (!UUID.test(value)) throw new AppError("validation", "대표 이미지가 올바르지 않습니다. 다시 골라 주세요.");
  return { coverMediaId: value.toLowerCase() };
}

/** 저장된 값을 읽는다. 깨진 값은 비어 있는 것으로 본다 (읽기에서는 던지지 않는다) */
export function readStoryFields(stored: unknown): StoryFields {
  const raw = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  const value = typeof raw.coverMediaId === "string" ? raw.coverMediaId.trim() : "";
  return { coverMediaId: UUID.test(value) ? value.toLowerCase() : null };
}

/** 대표 이미지는 본문 이미지이므로 존재·대체 텍스트 점검은 본문 점검이 이미 한다 (같은 경고를 두 번 내지 않는다) */
export function storyMediaIds(): string[] {
  return [];
}

/** 대표 이미지는 선택 항목이라 발행을 막지 않는다 */
export function storyProblems(): string[] {
  return [];
}

/** 대표 이미지가 본문에 없으면 지운다 (본문에서 이미지를 뺀 경우) */
export function withCoverInBody(fields: StoryFields, bodyMediaIds: readonly string[]): StoryFields {
  return fields.coverMediaId && bodyMediaIds.includes(fields.coverMediaId) ? fields : { coverMediaId: null };
}
