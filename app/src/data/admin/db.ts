import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

/** neon-http 와 pglite(시험) 모두 PgDatabase 이므로 어드민 데이터 함수는 같은 코드로 동작한다 */
export type AdminDb = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;
