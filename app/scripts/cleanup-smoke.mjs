// 원격 스모크 시험이 남긴 가짜 문의(smoke-*@example.com)를 지운다. DATABASE_URL 의 DB 에서만 지운다.
//   npm run db:cleanup-smoke   (.env.local 의 DATABASE_URL 사용)
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL 이 없습니다 (.env.local 확인)");
  process.exit(1);
}
const sql = neon(url);
const deleted = await sql`delete from inquiries where email like 'smoke-%@example.com' returning id`;
const left = await sql`select count(*)::int as n from inquiries`;
console.log(`삭제: ${deleted.length}건, 남은 문의: ${left[0].n}건`);
