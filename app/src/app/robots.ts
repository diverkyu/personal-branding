import type { MetadataRoute } from "next";
import { isIndexingAllowed, resolveSiteUrl } from "@/config/env";

/** 색인을 허용하지 않는 동안(SITE_INDEXING 이 on 이 아님)에는 모든 크롤러를 막고 sitemap 도 알리지 않는다. */
export default function robots(): MetadataRoute.Robots {
  const allowed = isIndexingAllowed(process.env);
  if (!allowed) return { rules: { userAgent: "*", disallow: "/" } };
  const origin = resolveSiteUrl(process.env).url.origin;
  return { rules: { userAgent: "*", allow: "/", disallow: ["/dev/", "/admin/"] }, sitemap: `${origin}/sitemap.xml` };
}
