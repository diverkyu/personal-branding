/**
 * 페이지 메타데이터 공통 규칙 (W-4 SEO, docs/phase1/SEO-GEO.md §3). 순수 함수.
 * - 모든 공개 페이지는 **자기 주소를 정규 주소(canonical)** 로 밝힌다. 같은 내용이 여러 주소(임시 vercel.app 주소,
 *   diverkyu.com ↔ www, ?status= 같은 필터)로 열려도 검색엔진이 SITE_URL 의 한 주소로 모은다.
 * - Next 는 openGraph 를 얕게 합친다(자식이 쓰면 부모 값이 사라진다). 그래서 사이트 이름·언어를 매번 함께 넣는다.
 * - layout 에는 canonical 을 두지 않는다. 두면 canonical 을 빠뜨린 페이지가 모두 홈을 가리키게 된다.
 */
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

type OpenGraph = NonNullable<Metadata["openGraph"]>;

export const BASE_OPEN_GRAPH = { siteName: siteConfig.name, locale: siteConfig.locale, type: "website" } as const;

/** path 는 "/"로 시작하는 경로. 주소 앞부분은 layout 의 metadataBase(SITE_URL)가 붙인다 */
export function pageMeta(path: string, meta: Omit<Metadata, "alternates"> & { openGraph?: OpenGraph } = {}): Metadata {
  const { openGraph, ...rest } = meta;
  // 공유 미리보기 제목·설명은 페이지 제목·설명과 같게 (Next 는 title 을 og:title 로 자동으로 옮기지 않는다)
  const title = typeof meta.title === "string" ? siteConfig.titleTemplate.replace("%s", meta.title) : undefined;
  const description = typeof meta.description === "string" ? meta.description : undefined;
  return {
    ...rest,
    alternates: { canonical: path },
    openGraph: { ...BASE_OPEN_GRAPH, url: path, ...(title ? { title } : {}), ...(description ? { description } : {}), ...(openGraph ?? {}) } as OpenGraph,
  };
}

/**
 * 검색엔진 소유 확인 태그 (구글 서치콘솔·네이버 서치어드바이저·빙). 값은 각 서비스가 주는 공개 문자열이지만
 * 계정마다 다르므로 코드에 쓰지 않고 환경변수로 받는다. 없으면 태그를 넣지 않는다.
 */
export function verificationOf(env: Record<string, string | undefined>): Metadata["verification"] | undefined {
  const google = env.GOOGLE_SITE_VERIFICATION?.trim();
  const naver = env.NAVER_SITE_VERIFICATION?.trim();
  const bing = env.BING_SITE_VERIFICATION?.trim();
  const other: Record<string, string> = {};
  if (naver) other["naver-site-verification"] = naver;
  if (bing) other["msvalidate.01"] = bing;
  if (!google && Object.keys(other).length === 0) return undefined;
  return { ...(google ? { google } : {}), ...(Object.keys(other).length > 0 ? { other } : {}) };
}
