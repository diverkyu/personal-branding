/**
 * 페이지 메타데이터 공통 규칙 (W-4 SEO, docs/phase1/SEO-GEO.md §3). 순수 함수.
 * - 모든 공개 페이지는 **자기 주소를 정규 주소(canonical)** 로 밝힌다. 같은 내용이 여러 주소(임시 vercel.app 주소,
 *   diverkyu.com ↔ www, ?status= 같은 필터)로 열려도 검색엔진이 SITE_URL 의 한 주소로 모은다.
 * - Next 는 openGraph 를 얕게 합친다(자식이 쓰면 부모 값이 사라진다). 그래서 사이트 이름·언어를 매번 함께 넣는다.
 * - layout 에는 canonical 을 두지 않는다. 두면 canonical 을 빠뜨린 페이지가 모두 홈을 가리키게 된다.
 */
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { resolveSiteUrl } from "@/config/env";
import { pageSeo, type SeoPagePath } from "@/config/pageSeo";

type OpenGraph = NonNullable<Metadata["openGraph"]>;

export const BASE_OPEN_GRAPH = { siteName: siteConfig.name, locale: siteConfig.locale, type: "website" } as const;
export const DEFAULT_SHARE_IMAGE = { url: "/images/kyu-share.png", width: 1200, height: 630, alt: "KYU 이동규 · 프리다이빙과 AI 영상" };
export const PAGE_AUTHORS = [{ name: siteConfig.ownerName, url: "/about" }];

/** 빈 목록만 개별 noindex. 항목이 있으면 layout 의 운영/프리뷰 검색 정책을 그대로 상속한다. */
export function sectionMeta(path: SeoPagePath, count?: number): Metadata {
  const copy = pageSeo[path];
  const empty = count === 0;
  return pageMeta(path, {
    title: copy.title,
    description: empty && "emptyDescription" in copy ? copy.emptyDescription : copy.description,
    ...(empty ? { robots: { index: false, follow: false } } : {}),
  });
}

/** path 는 "/"로 시작하는 경로. 주소 앞부분은 layout 의 metadataBase(SITE_URL)가 붙인다 */
export function pageMeta(path: string, meta: Omit<Metadata, "alternates"> & { openGraph?: OpenGraph } = {}): Metadata {
  const { openGraph, ...rest } = meta;
  // 공유 미리보기 제목·설명은 페이지 제목·설명과 같게 (Next 는 title 을 og:title 로 자동으로 옮기지 않는다)
  const title = typeof meta.title === "string" ? siteConfig.titleTemplate.replace("%s", meta.title)
    : meta.title && "absolute" in meta.title ? meta.title.absolute : undefined;
  const description = typeof meta.description === "string" ? meta.description : undefined;
  // Next가 루트 URL을 origin으로 직렬화하므로 sitemap도 같은 표기를 쓴다.
  const canonical = path === "/" ? resolveSiteUrl(process.env).url.origin : path;
  const images = openGraph?.images ?? [DEFAULT_SHARE_IMAGE];
  return {
    ...rest,
    alternates: { canonical },
    openGraph: { ...BASE_OPEN_GRAPH, url: canonical, ...(title ? { title } : {}), ...(description ? { description } : {}), ...openGraph, images } as OpenGraph,
    twitter: { card: "summary_large_image", ...(title ? { title } : {}), ...(description ? { description } : {}), images, ...meta.twitter } as Metadata["twitter"],
  };
}

/**
 * 검색엔진 소유 확인 태그 (구글 서치콘솔·네이버 서치어드바이저·빙). 값은 각 서비스가 주는 공개 문자열이지만
 * 계정마다 다르므로 코드에 쓰지 않는다. 어드민 사이트 설정 > 검색·공유(seo.verify.*)가 먼저이고,
 * 비어 있으면 환경변수(GOOGLE_/NAVER_/BING_SITE_VERIFICATION)를 쓴다. 둘 다 없으면 태그를 넣지 않는다.
 */
export function verificationOf(env: Record<string, string | undefined>, settings: Record<string, string> = {}): Metadata["verification"] | undefined {
  const pick = (key: string, envKey: string) => settings[key]?.trim() || env[envKey]?.trim() || undefined;
  const google = pick("seo.verify.google", "GOOGLE_SITE_VERIFICATION");
  const naver = pick("seo.verify.naver", "NAVER_SITE_VERIFICATION");
  const bing = pick("seo.verify.bing", "BING_SITE_VERIFICATION");
  const other: Record<string, string> = {};
  if (naver) other["naver-site-verification"] = naver;
  if (bing) other["msvalidate.01"] = bing;
  if (!google && Object.keys(other).length === 0) return undefined;
  return { ...(google ? { google } : {}), ...(Object.keys(other).length > 0 ? { other } : {}) };
}
