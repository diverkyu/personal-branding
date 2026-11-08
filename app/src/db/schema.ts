/**
 * 데이터베이스 스키마 (Drizzle, PostgreSQL). 지금은 문의·소식 신청(Inquiry)만 있다.
 * 스토리·투어·장비·후기·관리자 계정 테이블은 어드민(CMS) 단계에서 추가한다 — 그때까지 콘텐츠는 data/fixtures 가 돌려준다.
 * 투어는 아직 DB 테이블이 아니므로 tour_slug 는 외래키 없이 문자열로만 둔다 (투어 테이블이 생기면 연결한다).
 */
import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
    /**
     * 처리 상태 (SCREEN-SPEC ADM-INQ). 어드민이 바꾼다.
     * 예약 문의: new(신규) / checked(확인) / confirmed(확정) / cancelled(취소). 소식 받기: new / notified(안내 완료).
     */
    status: text("status").notNull().default("new"),
    /** 운영자 메모 (어드민) */
    memo: text("memo"),
  },
  (t) => [
    check("inquiries_kind_check", sql`${t.kind} in ('reservation', 'notice')`),
    check(
      "inquiries_status_check",
      sql`(${t.kind} = 'reservation' and ${t.status} in ('new', 'checked', 'confirmed', 'cancelled')) or (${t.kind} = 'notice' and ${t.status} in ('new', 'notified'))`,
    ),
    check("inquiries_people_check", sql`${t.people} is null or (${t.people} >= 1 and ${t.people} <= 10)`),
    index("inquiries_tour_kind_idx").on(t.tourSlug, t.kind),
    index("inquiries_received_idx").on(t.receivedAt),
  ],
);

/**
 * 활동 기록 (SECURITY §14, ADMIN-DESIGN §5.2). 누가 무엇을 했는지만 남기고 **개인정보는 남기지 않는다**(이름·연락처·메모 내용 금지).
 * actor_id 는 외래키가 아니다 — 계정을 지워도 기록은 남는다.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    meta: jsonb("meta").$type<Record<string, string | number | boolean | null>>().notNull().default({}),
  },
  (t) => [index("audit_log_at_idx").on(t.at), index("audit_log_target_idx").on(t.targetType, t.targetId)],
);

export type AuditRow = typeof auditLog.$inferSelect;

export type InquiryRow = typeof inquiries.$inferSelect;
export type NewInquiryRow = typeof inquiries.$inferInsert;

export * from "./auth-schema";
