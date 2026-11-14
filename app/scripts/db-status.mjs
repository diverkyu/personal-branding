// 마이그레이션 적용 상태를 읽기만 해서 알려 준다 (DB 를 바꾸지 않는다).
//   npm run db:status   (.env.local 의 DATABASE_URL 대상. 운영은 임시 파일로, AGENTS §8)
// 코드의 drizzle/meta/_journal.json 과 DB 의 drizzle.__drizzle_migrations 를 비교해 빠진 마이그레이션을 보여 준다.
// 연결 주소·비밀번호는 출력하지 않는다 (호스트의 첫 부분만).
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL 이 없습니다 (.env.local 확인)");
  process.exit(1);
}

const journal = JSON.parse(readFileSync(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"));
const expected = journal.entries.map((e) => ({ tag: e.tag, when: Number(e.when) }));

try {
  const sql = neon(url);
  const applied = await sql`select created_at::bigint as created_at from drizzle.__drizzle_migrations`;
  const done = new Set(applied.map((r) => Number(r.created_at)));
  const missing = expected.filter((e) => !done.has(e.when));
  const host = new URL(url).hostname.split(".")[0];
  console.log(`대상 DB 호스트: ${host}`);
  console.log(`코드 마이그레이션 ${expected.length}개 / DB 적용 ${applied.length}개`);
  if (missing.length === 0) {
    console.log("OK: 빠진 마이그레이션이 없습니다.");
  } else {
    console.log(`누락 ${missing.length}개: ${missing.map((m) => m.tag).join(", ")}`);
    console.log("→ 이 DB 를 쓰는 환경을 배포하기 전에 `npm run db:migrate` 로 적용하세요 (운영은 확인 후, AGENTS §8).");
    process.exitCode = 2;
  }
} catch {
  console.error("확인하지 못했습니다. DATABASE_URL 과 연결을 확인해 주세요 (오류 원문은 출력하지 않습니다).");
  process.exit(1);
}
