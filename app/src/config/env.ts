/**
 * 환경변수 해석. 사이트 주소는 SITE_URL 한 곳에서만 정한다 (PRD §5 도메인 독립성).
 * 순수 함수로 두어 process.env 없이 시험할 수 있다.
 */
export type EnvSource = Record<string, string | undefined>;

export const DEFAULT_SITE_URL = "http://localhost:3000";

export interface SiteUrlResult {
  url: URL;
  source: "env" | "default";
  /** 운영에서 문제가 될 수 있는 설정이면 사람이 읽을 안내. 없으면 null */
  problem: string | null;
}

export function resolveSiteUrl(env: EnvSource): SiteUrlResult {
  const raw = env.SITE_URL?.trim();
  const production = env.NODE_ENV === "production";

  if (!raw) {
    return {
      url: new URL(DEFAULT_SITE_URL),
      source: "default",
      problem: production ? "SITE_URL 이 지정되지 않아 로컬 주소를 쓰고 있습니다. 운영에서는 반드시 지정해야 합니다." : null,
    };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return {
      url: new URL(DEFAULT_SITE_URL),
      source: "default",
      problem: "SITE_URL 형식이 올바르지 않아 로컬 주소를 쓰고 있습니다.",
    };
  }

  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const problem = production && url.protocol !== "https:" && !local ? "운영 SITE_URL 은 https 주소여야 합니다." : null;
  return { url, source: "env", problem };
}

/** 검색엔진 색인 허용 여부. 공개 전 미리보기가 색인되지 않도록 기본은 꺼짐이다. */
export function isIndexingAllowed(env: EnvSource): boolean {
  return env.SITE_INDEXING === "on";
}
