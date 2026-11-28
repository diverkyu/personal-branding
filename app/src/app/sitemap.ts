import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/config/env";
import { listEquipment } from "@/data/equipment";
import { listPastTours, listUpcomingTours } from "@/data/tours";
import { listFilms } from "@/data/films";
import { listTravel } from "@/data/travel";
import { listStories } from "@/data/stories";
import { listReviews } from "@/data/reviews";

/** 공개 주소 목록. 개발용(/dev)·어드민은 넣지 않는다. 주소는 SITE_URL 기준이다. */
/** 예약 발행된 글이 5분 안에 올라오도록 */
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = resolveSiteUrl(process.env).url.origin;
  const fixed = ["/", "/about", "/story", "/freediving", "/freediving/tours", "/contact", "/privacy"];
  const [films, travel, equipment, reviews] = await Promise.all([listFilms(), listTravel(), listEquipment(), listReviews()]);
  return [
    ...fixed.map((path) => ({ url: `${origin}${path}` })),
    // 장비·후기 목록은 공개된 것이 있을 때만 — 빈 목록("준비 중")을 검색엔진에 알리지 않는다
    ...(equipment.length > 0 ? [{ url: `${origin}/freediving/equipment` }] : []),
    ...(reviews.length > 0 ? [{ url: `${origin}/freediving/reviews` }] : []),
    // Films 는 공개된 작품이 있을 때만 (메뉴·홈 구역과 같은 규칙 — 결정 10)
    ...(films.length > 0 ? [{ url: `${origin}/films` }] : []),
    ...films.map((f) => ({ url: `${origin}/films/${f.slug}`, lastModified: f.publishedAtIso })),
    // 여행 추천도 공개된 글이 있을 때만 (메뉴와 같은 규칙 — 결정 T-2)
    ...(travel.length > 0 ? [{ url: `${origin}/freediving/travel` }] : []),
    ...travel.map((t) => ({ url: `${origin}/freediving/travel/${t.slug}`, lastModified: t.publishedAtIso })),
    ...(await listStories()).map((s) => ({ url: `${origin}/story/${s.slug}`, lastModified: s.publishedAtIso })),
    ...[...(await listUpcomingTours()), ...(await listPastTours())].map((t) => ({ url: `${origin}/freediving/tours/${t.slug}` })),
    ...equipment.map((e) => ({ url: `${origin}/freediving/equipment/${e.slug}` })),
  ];
}
