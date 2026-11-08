/**
 * 운영 DB 연결 (Neon Postgres, HTTP 방식). 서버리스 호출마다 연결을 새로 맺지 않는 stateless 드라이버라 Vercel 같은 환경에 맞다.
 * DATABASE_URL 은 시크릿이다 — 코드·로그·저장소에 쓰지 않는다. 연결 문자열 자체는 로그에 남기지 않는다.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

let cached: ReturnType<typeof drizzle> | undefined;
let cachedUrl: string | undefined;

export function getDb(url: string): ReturnType<typeof drizzle> {
  if (!cached || cachedUrl !== url) {
    cached = drizzle({ client: neon(url) });
    cachedUrl = url;
  }
  return cached;
}
