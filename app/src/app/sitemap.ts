import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/config/env";
import { listEquipment, listPastTours, listUpcomingTours } from "@/data";
import { listStories } from "@/data/stories";

/** 공개 주소 목록. 개발용(/dev)·어드민은 넣지 않는다. 주소는 SITE_URL 기준이다. */
/** 예약 발행된 글이 5분 안에 올라오도록 */
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = resolveSiteUrl(process.env).url.origin;
  const fixed = ["/", "/about", "/story", "/freediving", "/freediving/tours", "/freediving/equipment", "/freediving/reviews", "/contact", "/privacy"];
  return [
    ...fixed.map((path) => ({ url: `${origin}${path}` })),
    ...(await listStories()).map((s) => ({ url: `${origin}/story/${s.slug}`, lastModified: s.publishedAtIso })),
    ...[...listUpcomingTours(), ...listPastTours()].map((t) => ({ url: `${origin}/freediving/tours/${t.slug}` })),
    ...listEquipment().map((e) => ({ url: `${origin}/freediving/equipment/${e.slug}` })),
  ];
}
