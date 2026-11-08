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

/** 요청 처리 중 던져진 오류를 구조화 로그로 남긴다. 화면에는 상세를 쓰지 않으므로 원인은 여기서 찾는다. */
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routePath: string; routeType: string; routerKind: string },
) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const [{ logger }, { errorKindOf }] = await Promise.all([import("@/lib/logger"), import("@/lib/errors")]);
  const digest = typeof error === "object" && error !== null && "digest" in error ? String((error as { digest: unknown }).digest) : undefined;
  logger.error("request.error", {
    errorKind: errorKindOf(error),
    digest,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
  });
}
