/**
 * 홈 히어로 이미지 (HOME-07, ADMIN-DESIGN §47). 순수 함수 — DB 없이 시험한다.
 * - 기본은 직접 만든 수중 일러스트(HeroArt)다. 어드민에서 이미지를 정하면 그 이미지로 바뀐다.
 * - About 처럼 저장하면 "수정 중"으로만 쌓이고, **공개 반영**을 눌러야 공개 화면이 바뀐다.
 * - 저장 위치: 기존 `site_settings` 표의 한 행(`home.heroImage`). 값은 JSON 이다. **DB 마이그레이션 없음.**
 *   `{ "published": "<미디어 id>" | null, "draft": { "mediaId": "<미디어 id>" | null } | null }`
 *   - published 가 null 이면 기본 일러스트.
 *   - draft 가 null 이면 수정 중인 내용 없음. draft.mediaId 가 null 이면 "기본 일러스트로 되돌리기"를 수정 중인 것.
 */
import { AppError } from "@/lib/errors";

export const HERO_SETTING_KEY = "home.heroImage";

/** 권장 크기: 히어로 아치(가로 640 × 세로 780 비율)를 채운다. 비율이 다르면 가운데를 기준으로 잘린다 */
export const HERO_RECOMMENDED = { width: 1280, height: 1560 } as const;

export interface HeroState {
  published: string | null;
  draft: { mediaId: string | null } | null;
}

export const EMPTY_HERO: HeroState = { published: null, draft: null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const idOrNull = (v: unknown): string | null => (typeof v === "string" && UUID.test(v) ? v.toLowerCase() : null);

/** 저장된 값을 읽는다. 깨진 값은 던지지 않고 기본(일러스트, 수정 없음)으로 읽는다 → 공개 화면이 깨지지 않는다 */
export function readHeroState(value: string | undefined | null): HeroState {
  if (!value) return EMPTY_HERO;
  try {
    const raw: unknown = JSON.parse(value);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return EMPTY_HERO;
    const r = raw as Record<string, unknown>;
    const d = r.draft;
    const draft = d && typeof d === "object" && !Array.isArray(d) ? { mediaId: idOrNull((d as Record<string, unknown>).mediaId) } : null;
    return { published: idOrNull(r.published), draft };
  } catch {
    return EMPTY_HERO;
  }
}

export function writeHeroState(state: HeroState): string {
  return JSON.stringify({ published: state.published, draft: state.draft ? { mediaId: state.draft.mediaId } : null });
}

/** 폼에서 온 미디어 id. 빈 값은 "기본 일러스트"이고, 형식이 틀리면 거부한다 */
export function cleanHeroMediaId(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (!UUID.test(v)) throw new AppError("validation", "히어로 이미지를 다시 골라 주세요.");
  return v.toLowerCase();
}

/** 편집 화면이 보여 줄 값: 수정 중인 것 → 공개 중인 것 */
export function editableHero(state: HeroState): string | null {
  return state.draft ? state.draft.mediaId : state.published;
}

/** 공개 반영하면 막힐 문제. 이미지가 있으면 대체 텍스트가 있어야 한다 (기본 일러스트는 점검할 것이 없다) */
export function heroProblems(mediaId: string | null, image: { alt: string } | undefined): string[] {
  if (!mediaId) return [];
  if (!image) return ["고른 이미지가 삭제되었거나 없습니다. 다른 이미지를 골라 주세요."];
  if (!image.alt.trim()) return ["이미지에 대체 텍스트가 없습니다. 어드민 > 미디어에서 입력해 주세요."];
  return [];
}
