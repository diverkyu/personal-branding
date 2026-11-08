import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

/** Better Auth 의 HTTP 입구 (/api/auth/*). 인증이 설정되지 않았으면 404 로 닫혀 있다. */
const notConfigured = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  const auth = getAuth();
  return auth ? toNextJsHandler(auth).GET(request) : notConfigured();
}

export async function POST(request: Request) {
  const auth = getAuth();
  return auth ? toNextJsHandler(auth).POST(request) : notConfigured();
}
