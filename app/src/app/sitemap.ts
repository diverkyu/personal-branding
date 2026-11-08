import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/config/env";
import { listEquipment, listPastTours, listStories, listUpcomingTours } from "@/data";

/** 공개 주소 목록. 개발용(/dev)·어드민은 넣지 않는다. 주소는 SITE_URL 기준이다. */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = resolveSiteUrl(process.env).url.origin;
  const fixed = ["/", "/about", "/story", "/freediving", "/freediving/tours", "/freediving/equipment", "/freediving/reviews", "/contact", "/privacy"];
  return [
    ...fixed.map((path) => ({ url: `${origin}${path}` })),
    ...listStories().map((s) => ({ url: `${origin}/story/${s.slug}`, lastModified: s.publishedAt })),
    ...[...listUpcomingTours(), ...listPastTours()].map((t) => ({ url: `${origin}/freediving/tours/${t.slug}` })),
    ...listEquipment().map((e) => ({ url: `${origin}/freediving/equipment/${e.slug}` })),
  ];
}
