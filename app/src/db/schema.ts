/**
 * 데이터베이스 스키마 (Drizzle, PostgreSQL). 지금은 문의·소식 신청(Inquiry)만 있다.
 * 스토리·투어·장비·후기·관리자 계정 테이블은 어드민(CMS) 단계에서 추가한다 — 그때까지 콘텐츠는 data/fixtures 가 돌려준다.
 * 투어는 아직 DB 테이블이 아니므로 tour_slug 는 외래키 없이 문자열로만 둔다 (투어 테이블이 생기면 연결한다).
 */
import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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

/**
 * 사이트 설정 (SCREEN-SPEC §7.6). 키 목록·규칙·기본값은 코드(settings/registry.ts)에 있고 여기에는 바꾼 값만 둔다.
 * version 은 저장할 때마다 올라가며 동시 편집 충돌 확인에 쓴다 (ADMIN-DESIGN §7).
 */
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by").notNull(),
});

/**
 * 동의 문구·개인정보 처리방침의 버전 기록. 한 번 만든 버전은 고치거나 지우지 않는다(변경 이력 보존, SECURITY §8).
 * kind: reservation(예약 문의 동의), notice(소식 받기 동의), privacy(개인정보 처리방침).
 */
export const consentVersions = pgTable(
  "consent_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    version: integer("version").notNull(),
    body: text("body").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").notNull(),
  },
  (t) => [
    unique("consent_versions_kind_version_uq").on(t.kind, t.version),
    check("consent_versions_kind_check", sql`${t.kind} in ('reservation', 'notice', 'privacy')`),
  ],
);

/**
 * 미디어 라이브러리 (ADMIN-DESIGN §9). 파일은 외부 객체 스토리지에 있고 여기에는 위치와 정보만 둔다.
 * 업로드된 이미지는 서버가 WebP 로 다시 만들어 저장하므로 mime 은 항상 image/webp 다 (SECURITY §7).
 * 원본 파일명은 저장하지 않는다. deleted_at 이 있으면 라이브러리에서 숨겨진 것이고 파일 정리는 휴지통 단계(AD-6)에서 한다.
 */
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** blob(Vercel Blob) | local(개발 전용) */
    storage: text("storage").notNull(),
    /** 스토리지 안의 경로. 서버가 무작위로 만든다 */
    storageKey: text("storage_key").notNull().unique(),
    url: text("url").notNull(),
    mime: text("mime").notNull(),
    bytes: integer("bytes").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    /** 대체 텍스트. 비어 있으면 공개 콘텐츠의 대표 이미지로 쓸 수 없다 */
    alt: text("alt"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    check("media_mime_check", sql`${t.mime} = 'image/webp'`),
    check("media_storage_check", sql`${t.storage} in ('blob', 'local')`),
    check("media_size_check", sql`${t.bytes} > 0 and ${t.width} > 0 and ${t.height} > 0`),
    index("media_created_idx").on(t.createdAt),
  ],
);

export type MediaRow = typeof media.$inferSelect;

/**
 * 발행형 콘텐츠 (ADMIN-DESIGN §5.0, §14). 스토리·영상·여행 추천 같은 유형을 한 테이블에 둔다.
 * - status: draft(임시저장) / review(검토 필요) / scheduled(예약) / published(발행) / archived(보관)
 * - 발행된 글을 고치는 중이면 수정 내용은 draft 칸에 두고, 다시 발행할 때 본문 칸으로 옮긴다 (공개 내용이 바로 바뀌지 않는다)
 * - version 은 저장마다 오르며 동시 편집 충돌 확인에 쓴다. deleted_at 이 있으면 삭제(휴지통)다.
 * - 유형별 항목은 fields(JSON)에 두고 유형 정의가 검증한다.
 */
export const contents = pgTable(
  "contents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    coverMediaId: uuid("cover_media_id").references(() => media.id),
    body: jsonb("body").$type<Record<string, unknown>>().notNull(),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    answers: text("answers").array().notNull().default(sql`'{}'::text[]`),
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
    fields: jsonb("fields").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").notNull().default("draft"),
    /** 예약 시각 (status 가 scheduled 일 때 필수) */
    publishAt: timestamp("publish_at", { withTimezone: true }),
    /** 실제로 공개된 시각 (서버가 기록) */
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** manual(직접) / ai_assisted(AI 도움) / automated(자동 입력) */
    origin: text("origin").notNull().default("manual"),
    /** 비공개 메모 (사용한 도구 등) */
    originNote: text("origin_note").notNull().default(""),
    /** 발행된 글의 수정 중인 내용 (제목·요약·본문 등). 없으면 null */
    draft: jsonb("draft").$type<Record<string, unknown>>(),
    version: integer("version").notNull().default(1),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("contents_type_slug_uq").on(t.type, t.slug).where(sql`${t.deletedAt} is null`),
    check("contents_status_check", sql`${t.status} in ('draft', 'review', 'scheduled', 'published', 'archived')`),
    check("contents_origin_check", sql`${t.origin} in ('manual', 'ai_assisted', 'automated')`),
    check("contents_scheduled_check", sql`${t.status} <> 'scheduled' or ${t.publishAt} is not null`),
    check("contents_published_check", sql`${t.status} <> 'published' or ${t.publishedAt} is not null`),
    index("contents_status_updated_idx").on(t.status, t.updatedAt),
    index("contents_type_idx").on(t.type),
  ],
);

/**
 * 예약 발행 작업 (ADMIN-DESIGN §14.3). 예약한 콘텐츠마다 활성 작업이 하나다.
 * 실행은 멱등이다: 선점(pending→running)을 조건부 갱신으로 하고, 이미 발행된 것은 건너뛴다.
 * last_error_kind 에는 오류 종류만 남긴다 (원문 메시지·개인정보 제외).
 */
export const publishJobs = pgTable(
  "publish_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    runAt: timestamp("run_at", { withTimezone: true }).notNull(),
    state: text("state").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastErrorKind: text("last_error_kind"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** 실행을 시작한 시각. 오래 running 으로 남은 작업을 다시 시도하는 기준이다 */
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    check("publish_jobs_state_check", sql`${t.state} in ('pending', 'running', 'done', 'failed', 'cancelled')`),
    uniqueIndex("publish_jobs_active_uq").on(t.contentId).where(sql`${t.state} in ('pending', 'running')`),
    index("publish_jobs_due_idx").on(t.state, t.runAt),
  ],
);

export type ContentRow = typeof contents.$inferSelect;
export type PublishJobRow = typeof publishJobs.$inferSelect;

export type SiteSettingRow = typeof siteSettings.$inferSelect;
export type ConsentVersionRow = typeof consentVersions.$inferSelect;

export type AuditRow = typeof auditLog.$inferSelect;

export type InquiryRow = typeof inquiries.$inferSelect;
export type NewInquiryRow = typeof inquiries.$inferInsert;

export * from "./auth-schema";
