/**
 * 어드민의 수강 후기 데이터 함수 (ADMIN-DESIGN §24). 모든 함수는 `admin: AdminSession`을 받고 변경은 활동 기록에 남는다.
 * - 후기는 **동의 확인 없이는 공개할 수 없다**: 서버가 먼저 막고, DB 제약(reviews_consent_check)이 한 번 더 막는다.
 * - 고칠 때마다 그 시점의 내용을 review_revisions 에 남긴다(만들기·수정·공개 전환·철회·삭제).
 * - 저장은 version 이 맞을 때만 한다(다른 곳에서 먼저 저장했으면 덮어쓰지 않고 충돌로 알림).
 * - 활동 기록에는 후기 내용·수강생 표기를 남기지 않는다(개인정보 제외).
 */
import { and, count, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { contents, reviewRevisions, reviews, type ReviewRevisionRow, type ReviewRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import type { AdminSession } from "@/lib/auth/types";
import { kstDate } from "@/data/storyQueries";
import { REVIEW_STATUSES, cleanReview, type CleanReview, type ReviewInput, type ReviewStatus } from "@/reviews/fields";
import { recordAudit } from "./audit";
import type { AdminDb } from "./db";
import { isUuid } from "./inquiryQuery";

export const REVIEW_PAGE_SIZE = 20;

export interface ReviewQuery {
  status?: ReviewStatus;
  tour?: string;
  q?: string;
  page: number;
}

export function parseReviewQuery(params: Record<string, string | string[] | undefined>): ReviewQuery {
  const one = (k: string) => (Array.isArray(params[k]) ? params[k]?.[0] : (params[k] as string | undefined));
  const status = one("status");
  const tour = one("tour")?.trim().slice(0, 80);
  const q = one("q")?.trim().slice(0, 60);
  const page = Number.parseInt(one("page") ?? "1", 10);
  return {
    status: status && (REVIEW_STATUSES as readonly string[]).includes(status) ? (status as ReviewStatus) : undefined,
    tour: tour || undefined,
    q: q || undefined,
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, 1000) : 1,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => "\\" + c);
}

export interface ReviewSummary {
  id: string;
  /** 목록에 보이는 원문 앞부분 */
  preview: string;
  authorLabel: string;
  writtenOn: string;
  status: ReviewStatus;
  featured: boolean;
  consentConfirmed: boolean;
  tourSlug: string | null;
  updatedAt: Date;
}

const toSummary = (r: ReviewRow): ReviewSummary => ({
  id: r.id,
  preview: r.body.length > 60 ? `${r.body.slice(0, 60)}…` : r.body,
  authorLabel: r.authorLabel,
  writtenOn: r.writtenOn,
  status: r.status as ReviewStatus,
  featured: r.isFeatured,
  consentConfirmed: r.consentConfirmed,
  tourSlug: r.tourSlug,
  updatedAt: r.updatedAt,
});

export async function listReviews(db: AdminDb, admin: AdminSession, query: ReviewQuery): Promise<{ items: ReviewSummary[]; total: number; page: number; pageSize: number; counts: Record<ReviewStatus, number> }> {
  void admin;
  const parts: (SQL | undefined)[] = [isNull(reviews.deletedAt)];
  if (query.status) parts.push(eq(reviews.status, query.status));
  if (query.tour) parts.push(eq(reviews.tourSlug, query.tour));
  if (query.q) {
    const pattern = `%${escapeLike(query.q)}%`;
    parts.push(or(ilike(reviews.body, pattern), ilike(reviews.authorLabel, pattern)));
  }
  const where = and(...parts);
  const [totalRow] = await db.select({ value: count() }).from(reviews).where(where);
  const rows = await db
    .select()
    .from(reviews)
    .where(where)
    .orderBy(desc(reviews.writtenOn), desc(reviews.createdAt))
    .limit(REVIEW_PAGE_SIZE)
    .offset((query.page - 1) * REVIEW_PAGE_SIZE);
  const grouped = await db.select({ status: reviews.status, value: count() }).from(reviews).where(isNull(reviews.deletedAt)).groupBy(reviews.status);
  const counts: Record<ReviewStatus, number> = { private: 0, public: 0 };
  for (const g of grouped) counts[g.status as ReviewStatus] = g.value;
  return { items: rows.map(toSummary), total: totalRow?.value ?? 0, page: query.page, pageSize: REVIEW_PAGE_SIZE, counts };
}

export async function getReview(db: AdminDb, admin: AdminSession, id: string): Promise<ReviewRow | null> {
  void admin;
  if (!isUuid(id)) return null;
  const [row] = await db.select().from(reviews).where(and(eq(reviews.id, id), isNull(reviews.deletedAt))).limit(1);
  return row ?? null;
}

/** 연결할 투어는 실제로 있는(삭제되지 않은) 투어여야 한다 */
async function assertTourExists(db: AdminDb, slug: string | null): Promise<void> {
  if (!slug) return;
  const [hit] = await db.select({ id: contents.id }).from(contents).where(and(eq(contents.type, "tour"), eq(contents.slug, slug), isNull(contents.deletedAt))).limit(1);
  if (!hit) throw new AppError("validation", "연결할 투어를 찾을 수 없습니다. 투어를 다시 골라 주세요.");
}

const columnsOf = (c: CleanReview) => ({
  body: c.body,
  authorLabel: c.authorLabel,
  labelKind: c.labelKind,
  writtenOn: c.writtenOn,
  sourceKind: c.sourceKind,
  sourceNote: c.sourceNote,
  tourSlug: c.tourSlug,
  isFeatured: c.featured,
  featuredOrder: c.featuredOrder,
  consentConfirmed: c.consentConfirmed,
  consentNote: c.consentNote,
});

/** 수정 이력에 남기는 그 시점의 내용 */
function snapshotOf(row: ReviewRow): Record<string, unknown> {
  return {
    body: row.body,
    authorLabel: row.authorLabel,
    labelKind: row.labelKind,
    writtenOn: row.writtenOn,
    sourceKind: row.sourceKind,
    sourceNote: row.sourceNote,
    tourSlug: row.tourSlug,
    featured: row.isFeatured,
    featuredOrder: row.featuredOrder,
    consentConfirmed: row.consentConfirmed,
    consentNote: row.consentNote,
    status: row.status,
  };
}

async function writeRevision(db: AdminDb, admin: AdminSession, row: ReviewRow, reason: ReviewRevisionRow["reason"]): Promise<void> {
  await db.insert(reviewRevisions).values({ reviewId: row.id, version: row.version, reason, snapshot: snapshotOf(row), changedBy: admin.userId });
}

export async function createReview(db: AdminDb, admin: AdminSession, input: ReviewInput, now: Date = new Date()): Promise<ReviewRow> {
  const clean = cleanReview(input, kstDate(now));
  await assertTourExists(db, clean.tourSlug);
  const [row] = await db
    .insert(reviews)
    .values({ ...columnsOf(clean), status: "private", createdBy: admin.userId, updatedBy: admin.userId })
    .returning();
  if (!row) throw new AppError("external", "저장 결과가 비어 있습니다.");
  await writeRevision(db, admin, row, "create");
  await recordAudit(db, admin, { action: "review.create", targetType: "review", targetId: row.id });
  return row;
}

export async function saveReview(db: AdminDb, admin: AdminSession, id: string, version: number, input: ReviewInput, now: Date = new Date()): Promise<{ version: number }> {
  const current = await getReview(db, admin, id);
  if (!current) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  const clean = cleanReview(input, kstDate(now));
  if (current.status === "public" && !clean.consentConfirmed) {
    throw new AppError("validation", "공개 중인 후기는 동의 확인을 해제할 수 없습니다. 철회 요청이라면 먼저 “철회(즉시 비공개)”를 눌러 주세요.");
  }
  await assertTourExists(db, clean.tourSlug);
  const [updated] = await db
    .update(reviews)
    .set({ ...columnsOf(clean), version: version + 1, updatedAt: now, updatedBy: admin.userId })
    .where(and(eq(reviews.id, id), eq(reviews.version, version), isNull(reviews.deletedAt)))
    .returning();
  if (!updated) throw new AppError("validation", "다른 곳에서 먼저 저장했습니다. 새로고침한 뒤 내용을 확인하고 다시 저장해 주세요.");
  await writeRevision(db, admin, updated, "edit");
  await recordAudit(db, admin, { action: "review.save", targetType: "review", targetId: id, meta: { version: updated.version, status: updated.status } });
  return { version: updated.version };
}

/** 공개·비공개 전환. 공개로 바꾸려면 동의 확인이 있어야 한다 */
export async function setReviewStatus(db: AdminDb, admin: AdminSession, id: string, version: number, status: ReviewStatus, now: Date = new Date()): Promise<{ version: number }> {
  if (!(REVIEW_STATUSES as readonly string[]).includes(status)) throw new AppError("validation", "알 수 없는 상태입니다.");
  const current = await getReview(db, admin, id);
  if (!current) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  if (current.status === status) throw new AppError("validation", status === "public" ? "이미 공개된 후기입니다." : "이미 비공개인 후기입니다.");
  if (status === "public") {
    if (!current.consentConfirmed) throw new AppError("validation", "수강생의 공개 동의를 확인해 체크한 뒤에 공개할 수 있습니다.");
    await assertTourExists(db, current.tourSlug);
  }
  const [updated] = await db
    .update(reviews)
    .set({ status, version: version + 1, updatedAt: now, updatedBy: admin.userId })
    .where(and(eq(reviews.id, id), eq(reviews.version, version), isNull(reviews.deletedAt)))
    .returning();
  if (!updated) throw new AppError("validation", "다른 곳에서 먼저 저장했습니다. 새로고침한 뒤 다시 시도해 주세요.");
  await writeRevision(db, admin, updated, "status");
  await recordAudit(db, admin, { action: "review.status", targetType: "review", targetId: id, meta: { from: current.status, to: status } });
  return { version: updated.version };
}

/**
 * 철회 요청: 수강생이 공개를 원치 않을 때 **즉시 비공개**로 돌리고 철회로 기록한다 (SECURITY §8).
 * 낡은 화면(version 불일치)이어도 철회는 막지 않는다 — 가장 안전한 쪽(비공개)으로 가는 작업이기 때문이다.
 */
export async function withdrawReview(db: AdminDb, admin: AdminSession, id: string, now: Date = new Date()): Promise<void> {
  const current = await getReview(db, admin, id);
  if (!current) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  const [updated] = await db
    .update(reviews)
    .set({ status: "private", version: current.version + 1, updatedAt: now, updatedBy: admin.userId })
    .where(and(eq(reviews.id, id), eq(reviews.version, current.version), isNull(reviews.deletedAt)))
    .returning();
  if (!updated) throw new AppError("validation", "다른 곳에서 먼저 저장했습니다. 새로고침한 뒤 다시 시도해 주세요.");
  await writeRevision(db, admin, updated, "withdraw");
  await recordAudit(db, admin, { action: "review.withdraw", targetType: "review", targetId: id, meta: { was: current.status } });
}

/** 삭제(목록에서 숨김). 수정 이력은 남는다. 복원·영구 삭제는 휴지통 단계(6c)에서 만든다 */
export async function deleteReview(db: AdminDb, admin: AdminSession, id: string, now: Date = new Date()): Promise<void> {
  const current = await getReview(db, admin, id);
  if (!current) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  const [updated] = await db
    .update(reviews)
    .set({ status: "private", deletedAt: now, version: current.version + 1, updatedAt: now, updatedBy: admin.userId })
    .where(and(eq(reviews.id, id), isNull(reviews.deletedAt)))
    .returning();
  if (!updated) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  await writeRevision(db, admin, updated, "delete");
  await recordAudit(db, admin, { action: "review.delete", targetType: "review", targetId: id });
}

/** 수정 이력 (최근 것부터) */
export async function listReviewRevisions(db: AdminDb, admin: AdminSession, id: string): Promise<ReviewRevisionRow[]> {
  void admin;
  if (!isUuid(id)) return [];
  return db.select().from(reviewRevisions).where(eq(reviewRevisions.reviewId, id)).orderBy(desc(reviewRevisions.version), desc(reviewRevisions.changedAt));
}

/** 대시보드·신청 화면용 개수 */
export async function reviewCounts(db: AdminDb, admin: AdminSession): Promise<Record<ReviewStatus, number>> {
  void admin;
  const grouped = await db.select({ status: reviews.status, value: count() }).from(reviews).where(isNull(reviews.deletedAt)).groupBy(reviews.status);
  const counts: Record<ReviewStatus, number> = { private: 0, public: 0 };
  for (const g of grouped) counts[g.status as ReviewStatus] = g.value;
  return counts;
}
