import { defineConfig } from "drizzle-kit";

/**
 * 마이그레이션 설정. `npm run db:generate` 는 스키마 변경으로 SQL 을 만들고(DB 접속 불필요),
 * `npm run db:migrate` 는 DATABASE_URL 의 DB 에 적용한다. 시크릿은 환경변수로만 받는다.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
