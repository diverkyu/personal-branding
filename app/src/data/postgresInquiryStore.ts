import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { inquiries } from "@/db/schema";
import type { InquiryInput, NoticeInput } from "@/lib/forms/inquiry";
import type { InquiryStore } from "./inquiryStore";

/** neon-http 와 pglite(시험) 모두 PgDatabase 이므로 같은 어댑터를 쓴다 */
type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

/**
 * 문의·소식 신청을 PostgreSQL 에 저장한다. 값은 파라미터 바인딩으로만 들어간다 (SECURITY §5).
 * 오류는 삼키지 않고 던진다 — 호출하는 쪽(processSubmission)이 로그를 남기고 사용자에게는 일반 실패를 알린다.
 */
export function createPostgresInquiryStore(db: AnyPgDatabase): InquiryStore {
  return {
    async save(entry) {
      const isReservation = entry.kind === "reservation";
      const data = entry.data as InquiryInput & NoticeInput;
      const [row] = await db
        .insert(inquiries)
        .values({
          kind: entry.kind,
          tourSlug: entry.tourSlug,
          name: data.name,
          email: data.email,
          phone: isReservation ? data.phone : null,
          people: isReservation ? data.people : null,
          experience: isReservation ? data.experience || null : null,
          message: isReservation ? data.message || null : null,
          consentAt: new Date(entry.consentAt),
          consentVersion: entry.consentVersion,
          receivedAt: new Date(entry.receivedAt),
        })
        .returning({ id: inquiries.id });
      if (!row) throw new Error("저장 결과가 비어 있습니다");
      return { id: row.id };
    },
  };
}
