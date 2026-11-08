/**
 * 운영 인증 인스턴스 (지연 생성). DATABASE_URL 또는 BETTER_AUTH_SECRET 이 없으면 null 을 돌려주고,
 * 어드민은 "아직 설정되지 않음" 상태로 닫혀 있는다 (빌드는 깨지지 않는다). 시크릿 값은 로그에 쓰지 않는다.
 */
import "server-only";
import { resolveSiteUrl } from "@/config/env";
import { getDb } from "@/db/client";
import { logger } from "@/lib/logger";
import { createAuth, type AuthInstance } from "./config";

let cached: AuthInstance | null | undefined;

export const MIN_SECRET_LENGTH = 32;

export function getAuth(env: Record<string, string | undefined> = process.env): AuthInstance | null {
  if (cached !== undefined) return cached;
  const url = env.DATABASE_URL?.trim();
  const secret = env.BETTER_AUTH_SECRET?.trim();
  if (!url || !secret || secret.length < MIN_SECRET_LENGTH) {
    logger.warn("auth.unconfigured", { hasDatabase: Boolean(url), hasAuthKey: Boolean(secret), authKeyLongEnough: (secret?.length ?? 0) >= MIN_SECRET_LENGTH });
    cached = null;
    return cached;
  }
  const site = resolveSiteUrl(env);
  cached = createAuth({
    db: getDb(url) as never,
    secret,
    baseURL: site.url.origin,
    secureCookies: site.url.protocol === "https:",
  });
  return cached;
}
