/**
 * 데이터베이스 스키마 (Drizzle, PostgreSQL). 지금은 문의·소식 신청(Inquiry)만 있다.
 * 스토리·투어·장비·후기·관리자 계정 테이블은 어드민(CMS) 단계에서 추가한다 — 그때까지 콘텐츠는 data/fixtures 가 돌려준다.
 * 투어는 아직 DB 테이블이 아니므로 tour_slug 는 외래키 없이 문자열로만 둔다 (투어 테이블이 생기면 연결한다).
 */
import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** reservation = 예약 문의, notice = 소식 받기 (SCREEN-SPEC ADM-INQ 유형) */
    kind: text("kind").notNull(),
    tourSlug: text("tour_slug").notNull(),
    name: text("name").notNull(),
    /** 소식 받기에는 없다 */
    phone: text("phone"),
    email: text("email").notNull(),
    people: integer("people"),
    experience: text("experience"),
    message: text("message"),
    /** 동의한 일시와 동의 문구 버전 (SECURITY §8) */
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    consentVersion: text("consent_version").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    /** 처리 상태: new(신규) → 처리 중 → 완료. 어드민이 바꾼다 */
    status: text("status").notNull().default("new"),
    /** 운영자 메모 (어드민) */
    memo: text("memo"),
  },
  (t) => [
    check("inquiries_kind_check", sql`${t.kind} in ('reservation', 'notice')`),
    check("inquiries_status_check", sql`${t.status} in ('new', 'in_progress', 'done')`),
    check("inquiries_people_check", sql`${t.people} is null or (${t.people} >= 1 and ${t.people} <= 10)`),
    index("inquiries_tour_kind_idx").on(t.tourSlug, t.kind),
    index("inquiries_received_idx").on(t.receivedAt),
  ],
);

export type InquiryRow = typeof inquiries.$inferSelect;
export type NewInquiryRow = typeof inquiries.$inferInsert;
