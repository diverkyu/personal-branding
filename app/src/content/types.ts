/**
 * 콘텐츠 유형 정의 (ADMIN-DESIGN §14.1). 새 유형 = 여기에 정의 하나를 더하고 공개 경로를 연결한다.
 * 지금은 스토리만 있다. 영상·여행 추천은 AD-6 에서 같은 모양으로 추가한다.
 */
export interface ContentTypeDef {
  key: string;
  /** 메뉴·목록에 보이는 이름 */
  label: string;
  /** 주소 이름(slug)이 고유한 범위는 유형 안이다 */
  publicPath: (slug: string) => string;
}

export const CONTENT_TYPES: Record<string, ContentTypeDef> = {
  story: { key: "story", label: "스토리", publicPath: (slug) => `/story/${slug}` },
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
