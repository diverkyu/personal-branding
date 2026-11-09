import { EMPTY_EQUIPMENT_FIELDS, EQUIPMENT_LIMITS, cleanEquipmentFields, equipmentMediaIds, equipmentProblems, readEquipmentFields } from "./equipmentFields";
import { EMPTY_TOUR_FIELDS, cleanTourFields, readTourFields, tourMediaIds, tourProblems } from "./tourFields";

/**
 * 콘텐츠 유형 정의 (ADMIN-DESIGN §14.1). 새 유형 = 여기에 정의 하나를 더하고 공개 경로를 연결한다.
 * 스토리와 투어가 있다. 영상·여행 추천은 AD-6d 에서 같은 모양으로 추가한다.
 */
export interface FieldsDef {
  /** 새로 만들 때의 기본값 */
  empty: () => Record<string, unknown>;
  /** 입력(폼·저장된 값)을 검사해 깨끗한 값으로 만든다. 잘못되면 AppError(validation) */
  clean: (input: unknown) => Record<string, unknown>;
  /** 발행·예약 전에 막아야 할 문제 (저장된 값 기준) */
  problems: (stored: unknown) => string[];
  /** 이 항목이 쓰는 이미지 id (존재 확인·사용 집계에 쓴다) */
  mediaIds: (stored: unknown) => string[];
  /** 발행 점검 문구에서 이미지를 부르는 이름 (예: "갤러리 사진") */
  mediaLabel: string;
}

export interface ContentTypeDef {
  key: string;
  /** 메뉴·목록에 보이는 이름 */
  label: string;
  /** 주소 이름(slug)이 고유한 범위는 유형 안이다 */
  publicPath: (slug: string) => string;
  /** 유형별 항목. 없으면 공통 항목만 쓴다 */
  fields?: FieldsDef;
  /** 제목 최대 글자 수 (기본 80) */
  titleMax?: number;
  /** 요약 최대 글자 수 (기본 300). 장비는 "한 줄 추천 이유"라 짧다 */
  summaryMax?: number;
  /** true 이면 요약이 비어 있을 때 발행할 수 없다 */
  summaryRequired?: boolean;
  /** true 이면 본문이 비어 있어도 발행할 수 있다 (장비의 추천 이유 상세처럼 선택인 경우) */
  bodyOptional?: boolean;
  /** 화면에서 요약·본문을 부르는 이름 */
  summaryLabel?: string;
  bodyLabel?: string;
}

export const CONTENT_TYPES: Record<string, ContentTypeDef> = {
  story: { key: "story", label: "스토리", publicPath: (slug) => `/story/${slug}` },
  tour: {
    key: "tour",
    label: "투어",
    publicPath: (slug) => `/freediving/tours/${slug}`,
    fields: {
      empty: () => ({ ...EMPTY_TOUR_FIELDS }) as unknown as Record<string, unknown>,
      clean: (input) => cleanTourFields(input) as unknown as Record<string, unknown>,
      problems: (stored) => tourProblems(readTourFields(stored)),
      mediaIds: (stored) => tourMediaIds(readTourFields(stored)),
      mediaLabel: "갤러리 사진",
    },
    bodyLabel: "투어 소개",
  },
  equipment: {
    key: "equipment",
    label: "장비",
    publicPath: (slug) => `/freediving/equipment/${slug}`,
    titleMax: EQUIPMENT_LIMITS.title,
    summaryMax: EQUIPMENT_LIMITS.summary,
    summaryRequired: true,
    bodyOptional: true,
    summaryLabel: "한 줄 추천 이유",
    bodyLabel: "추천 이유 상세 (선택)",
    fields: {
      empty: () => ({ ...EMPTY_EQUIPMENT_FIELDS }) as unknown as Record<string, unknown>,
      clean: (input) => cleanEquipmentFields(input) as unknown as Record<string, unknown>,
      problems: (stored) => equipmentProblems(readEquipmentFields(stored)),
      mediaIds: (stored) => equipmentMediaIds(readEquipmentFields(stored)),
      mediaLabel: "장비 이미지",
    },
  },
};

export type ContentTypeKey = keyof typeof CONTENT_TYPES;

export const CONTENT_TYPE_KEYS = Object.keys(CONTENT_TYPES);

export function isContentType(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(CONTENT_TYPES, value);
}

/** 주소 이름으로 쓸 수 없는 예약어 (SECURITY §6). 경로·시스템과 겹치는 이름이다 */
export const RESERVED_SLUGS = new Set(["admin", "api", "new", "edit", "draft", "preview", "static", "_next", "media", "media-dev", "sitemap", "robots", "feed", "rss", "tag", "tags", "page", "undefined", "null"]);

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSlug(slug: string): string | null {
  if (slug.length < 1 || slug.length > 80) return "주소 이름은 1~80자여야 합니다.";
  if (!SLUG_RE.test(slug)) return "주소 이름은 영소문자·숫자·하이픈만 쓸 수 있습니다.";
  if (RESERVED_SLUGS.has(slug)) return "사용할 수 없는 주소 이름입니다.";
  return null;
}

/**
 * 제목에서 주소 이름을 만든다. 영문·숫자만 남기므로 한글 제목은 비게 되고, 그때는 호출하는 쪽이 대체 이름(story-날짜 등)을 쓴다.
 */
export function slugFromTitle(title: string): string {
  return title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}
