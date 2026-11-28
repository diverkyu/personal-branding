import type { MetadataRoute } from "next";
import { indexingDecision, resolveSiteUrl } from "@/config/env";
import { getSiteSettings } from "@/settings/read";

/** 어드민에서 검색 노출을 바꾸면 몇 분 안에 반영되도록 (설정 저장 때 캐시도 갱신된다) */
export const revalidate = 300;

/**
 * robots.txt (SEO-GEO §4). 검색 노출이 꺼져 있으면(어드민 설정·운영 배포·실제 주소 — config/env.ts) 모든 크롤러를 막고 사이트맵도 알리지 않는다.
 * 켜져 있으면 모두 허용하고 어드민·개발용·API·미리보기만 막는다. AI 검색·학습 크롤러도 허용한다(2026-11-28 Lucia 결정, 규강 확인 대기).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings();
  if (!indexingDecision(process.env, settings["seo.indexing"]).allowed) return { rules: { userAgent: "*", disallow: "/" } };
  const origin = resolveSiteUrl(process.env).url.origin;
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/dev/", "/api/", "/media-dev/"] }, sitemap: `${origin}/sitemap.xml` };
}
