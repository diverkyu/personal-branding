/**
 * 어드민 접근 판단 (순수 함수). "로그인했다"와 "어드민을 열 수 있다"는 다르다:
 * 2차 인증 등록이 끝나지 않은 계정은 등록 화면만 쓸 수 있다 (ADMIN-DESIGN §4.2).
 */
export interface SessionLike {
  user: { id: string; twoFactorEnabled?: boolean | null };
  session: { expiresAt: Date | string };
}

export type AdminAccess = "ok" | "no_session" | "expired" | "needs_two_factor";

export function evaluateAdminAccess(session: SessionLike | null | undefined, now = new Date()): AdminAccess {
  if (!session) return "no_session";
  if (new Date(session.session.expiresAt).getTime() <= now.getTime()) return "expired";
  if (session.user.twoFactorEnabled !== true) return "needs_two_factor";
  return "ok";
}

/**
 * 입력한 2차 인증 코드를 비교용으로 정리한다. TOTP 는 공백·하이픈을 허용하고,
 * 복구 코드는 발급된 모양(하이픈 포함) 그대로 비교한다 — 하이픈을 지우면 맞는 코드도 거부된다.
 */
export function normalizeTwoFactorCode(method: "totp" | "backup", raw: string): string {
  return method === "totp" ? raw.replace(/\s|-/g, "") : raw.trim();
}
