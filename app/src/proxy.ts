import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * /admin 아래 요청에서 세션 쿠키가 없으면 로그인 화면으로 보낸다 — 빠른 차단용일 뿐이다.
 * 진짜 권한 확인은 서버의 requireAdmin() 이 매번 다시 한다 (ADMIN-DESIGN §4.4).
 * 어드민 응답은 캐시하지 않고 검색 색인에서 제외한다 (SECURITY §12).
 */
const PUBLIC_ADMIN = new Set(["/admin/login", "/admin/login/two-factor"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const open = PUBLIC_ADMIN.has(pathname.replace(/\/$/, ""));
  if (!open && !getSessionCookie(request)) {
    const response = NextResponse.redirect(new URL("/admin/login", request.url));
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
