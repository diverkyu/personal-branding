/**
 * 서버에서 어드민 권한을 확인하는 유일한 입구. 프록시(proxy.ts)의 쿠키 확인은 편의일 뿐이고,
 * 모든 어드민 페이지·서버 액션·데이터 함수가 여기를 다시 거친다 (SECURITY §3, ADMIN-DESIGN §2, §4.4).
 */
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./index";
import { evaluateAdminAccess, type AdminAccess } from "./policy";
import type { AdminSession } from "./types";

export type { AdminSession } from "./types";

export const ADMIN_LOGIN = "/admin/login";
export const ADMIN_SETUP_2FA = "/admin/setup-2fa";

export async function readSession() {
  const auth = getAuth();
  if (!auth) return { configured: false as const, session: null, access: "no_session" as AdminAccess };
  const session = await auth.api.getSession({ headers: await headers() });
  return { configured: true as const, session, access: evaluateAdminAccess(session) };
}

/** 어드민을 열 수 있는 사람만 통과한다. 아니면 알맞은 화면으로 보낸다 (돌아올 주소는 받지 않는다) */
export async function requireAdmin(): Promise<AdminSession> {
  const { session, access } = await readSession();
  if (access === "needs_two_factor") redirect(ADMIN_SETUP_2FA);
  if (access !== "ok" || !session) redirect(ADMIN_LOGIN);
  return { userId: session.user.id, name: session.user.name, email: session.user.email };
}

/** 2차 인증 등록 화면용: 비밀번호로 로그인했으면 통과(등록 전·후 모두) */
export async function requireSession(): Promise<AdminSession & { twoFactorEnabled: boolean }> {
  const { session, access } = await readSession();
  if (!session || access === "no_session" || access === "expired") redirect(ADMIN_LOGIN);
  return { userId: session.user.id, name: session.user.name, email: session.user.email, twoFactorEnabled: access === "ok" };
}
