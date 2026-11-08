/**
 * 어드민 인증 구성 (Better Auth). 설계는 docs/phase1/ADMIN-DESIGN.md §4.
 * - 공개 가입 없음 (disableSignUp). 계정은 서버에서 스크립트로만 만든다.
 * - TOTP 2차 인증. 등록이 끝나기 전에는 어드민 화면을 열 수 없다 (policy.ts 가 판단, session.ts 가 강제).
 * - 세션은 최대 8시간, 연장하지 않는다 (SECURITY §2).
 * - 속도 제한은 DB 에 저장한다 (서버리스 인스턴스끼리 공유).
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { authSchema } from "@/db/auth-schema";

export const SESSION_MAX_SECONDS = 8 * 60 * 60;
export const MIN_PASSWORD_LENGTH = 12;
export const AUTH_ISSUER = "KYU 어드민";

/** 로그인·2차 인증 경로의 시도 제한: 10분에 5회 (SECURITY §2) */
export const SENSITIVE_RATE_LIMIT = { window: 600, max: 5 } as const;

export const AUTH_RATE_LIMIT_RULES = {
  "/sign-in/email": SENSITIVE_RATE_LIMIT,
  "/two-factor/verify-totp": SENSITIVE_RATE_LIMIT,
  "/two-factor/verify-backup-code": SENSITIVE_RATE_LIMIT,
  "/two-factor/enable": SENSITIVE_RATE_LIMIT,
  "/change-password": SENSITIVE_RATE_LIMIT,
} as const;

type DrizzleDb = Parameters<typeof drizzleAdapter>[0];

export interface AuthOptions {
  db: DrizzleDb;
  secret: string;
  /** 사이트 주소 (SITE_URL). 쿠키·CSRF 출처 확인의 기준 */
  baseURL: string;
  /** 운영(https)에서만 Secure 쿠키. 로컬 http 에서는 끈다 */
  secureCookies?: boolean;
  /** 시험에서만 끈다 */
  rateLimitEnabled?: boolean;
}

export function createAuth(options: AuthOptions) {
  return betterAuth({
    appName: AUTH_ISSUER,
    baseURL: options.baseURL,
    basePath: "/api/auth",
    secret: options.secret,
    trustedOrigins: [new URL(options.baseURL).origin],
    database: drizzleAdapter(options.db, { provider: "pg", schema: authSchema }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },
    session: {
      expiresIn: SESSION_MAX_SECONDS,
      // 접속할 때마다 연장하지 않는다: 로그인 후 8시간이 지나면 반드시 다시 로그인
      disableSessionRefresh: true,
    },
    rateLimit: {
      enabled: options.rateLimitEnabled ?? true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: { ...AUTH_RATE_LIMIT_RULES },
    },
    advanced: {
      useSecureCookies: options.secureCookies ?? true,
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    },
    // nextCookies 는 서버 액션이 Set-Cookie 를 쿠키 저장소에 반영하게 한다. 반드시 마지막 (Next 밖에서는 아무 일도 하지 않는다)
    plugins: [twoFactor({ issuer: AUTH_ISSUER }), nextCookies()],
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;
