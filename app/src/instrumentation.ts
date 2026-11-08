import { resolveSiteUrl } from "@/config/env";

/** 서버 시작 때 한 번 실행된다. 운영 설정 실수를 시작 로그에서 바로 알 수 있게 한다. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logger } = await import("@/lib/logger");
  const site = resolveSiteUrl(process.env);
  if (site.problem) {
    logger.warn("config.site_url", { problem: site.problem, source: site.source });
  } else {
    logger.info("server.start", { siteOrigin: site.url.origin, source: site.source });
  }
}
