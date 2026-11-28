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

export type IndexingReason = "forced-off" | "forced-on" | "not-production" | "temporary-host" | "setting-off" | "on";

/** 임시 주소(vercel.app·localhost)인지. 이런 주소는 검색엔진에 알리지 않는다 */
export function isTemporaryHost(env: EnvSource): boolean {
  const host = resolveSiteUrl(env).url.hostname.toLowerCase();
  return host.endsWith(".vercel.app") || host === "localhost" || host === "127.0.0.1";
}

/**
 * 검색엔진 색인 허용 여부 (SEO-GEO §3·§4 D). 순서대로 본다.
 * 1. 환경변수 SITE_INDEXING=off → 강제 차단(비상용), =on → 강제 허용(예전 방식 호환)
 * 2. Vercel 운영 배포(VERCEL_ENV=production)가 아니면 차단 — 프리뷰는 dev DB 를 쓰므로 어드민 스위치와 관계없이 막는다
 * 3. SITE_URL 이 임시 주소면 차단
 * 4. 어드민 사이트 설정 > 검색·공유 > "검색엔진에 노출"(seo.indexing)이 on 일 때만 허용
 */
export function indexingDecision(env: EnvSource, setting: string | undefined): { allowed: boolean; reason: IndexingReason } {
  if (env.SITE_INDEXING === "off") return { allowed: false, reason: "forced-off" };
  if (env.SITE_INDEXING === "on") return { allowed: true, reason: "forced-on" };
  if (env.VERCEL_ENV !== "production") return { allowed: false, reason: "not-production" };
  if (isTemporaryHost(env)) return { allowed: false, reason: "temporary-host" };
  if (setting !== "on") return { allowed: false, reason: "setting-off" };
  return { allowed: true, reason: "on" };
}
