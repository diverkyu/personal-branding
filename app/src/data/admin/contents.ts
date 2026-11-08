/**
 * 어드민의 콘텐츠 데이터 함수 (ADMIN-DESIGN §5.0, §7, §14). 모든 함수는 `admin: AdminSession`을 받고 변경은 활동 기록에 남는다.
 * - 저장은 version 이 맞을 때만 한다 (다른 곳에서 먼저 저장했으면 덮어쓰지 않고 충돌로 알림).
 * - 발행된 글을 고치면 수정 내용은 draft 칸에 쌓이고, "수정 내용 발행"을 눌러야 공개 내용에 반영된다.
 * - 발행·예약 전에는 점검(제목·본문·요약 길이·자동 생성 글 검토)을 통과해야 한다.
 */
import { and, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { contents, media, publishJobs, type ContentRow, type PublishJobRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import type { AdminSession } from "@/lib/auth/types";
import { EMPTY_BODY, collectMediaIds, isBodyEmpty, plainTextFromBody, sanitizeBody, type BodyDoc } from "@/content/body";
import {
  ORIGINS,
  STATUSES,
  allowedTransitions,
  canTransition,
  publishChecks,
  validatePublishAt,
  type ContentOrigin,
  type ContentStatus,
} from "@/content/publish";
import { isContentType, slugFromTitle, validateSlug } from "@/content/types";
import { recordAudit } from "./audit";
import type { AdminDb } from "./db";
import { isUuid } from "./inquiryQuery";

export const CONTENT_PAGE_SIZE = 20;

export const LIMITS = { title: 80, summary: 300, tag: 20, tags: 5, answer: 80, answers: 10, seoTitle: 70, seoDescription: 160, originNote: 500 } as const;

/** 편집 화면이 고치는 항목 (발행된 글에서는 draft 칸에 이 모양으로 쌓인다) */
export interface ContentEdit {
  title: string;
  slug: string;
  summary: string;
  /** 본문 JSON (편집기 출력). 서버가 허용 목록으로 다시 만든다 */
  body: unknown;
  tags: string[];
  answers: string[];
  seoTitle: string;
  seoDescription: string;
  origin: ContentOrigin;
  originNote: string;
}

type CleanEdit = Omit<ContentEdit, "body"> & { body: BodyDoc };

function cleanList(values: string[], max: number, maxLen: number, label: string): string[] {
  const out = [...new Set(values.map((v) => v.replace(/\s+/g, " ").trim()).filter(Boolean))];
  if (out.length > max) throw new AppError("validation", `${label}은(는) ${max}개까지 쓸 수 있습니다.`);
  if (out.some((v) => v.length > maxLen)) throw new AppError("validation", `${label} 하나는 ${maxLen}자까지 쓸 수 있습니다.`);
  return out;
}

export function cleanEdit(input: ContentEdit): CleanEdit {
  const title = input.title.replace(/\s+/g, " ").trim();
  if (!title) throw new AppError("validation", "제목을 입력해 주세요.");
  if (title.length > LIMITS.title) throw new AppError("validation", `제목은 ${LIMITS.title}자까지 쓸 수 있습니다.`);
  const slugError = validateSlug(input.slug);
  if (slugError) throw new AppError("validation", slugError);
  const summary = input.summary.replace(/\s+/g, " ").trim();
  if (summary.length > LIMITS.summary) throw new AppError("validation", `요약은 ${LIMITS.summary}자까지 쓸 수 있습니다.`);
  const seoTitle = input.seoTitle.replace(/\s+/g, " ").trim();
  const seoDescription = input.seoDescription.replace(/\s+/g, " ").trim();
  if (seoTitle.length > LIMITS.seoTitle) throw new AppError("validation", `검색 제목은 ${LIMITS.seoTitle}자까지 쓸 수 있습니다.`);
  if (seoDescription.length > LIMITS.seoDescription) throw new AppError("validation", `검색 설명은 ${LIMITS.seoDescription}자까지 쓸 수 있습니다.`);
  const originNote = input.originNote.trim();
  if (originNote.length > LIMITS.originNote) throw new AppError("validation", `제작 메모는 ${LIMITS.originNote}자까지 쓸 수 있습니다.`);
  if (!(ORIGINS as readonly string[]).includes(input.origin)) throw new AppError("validation", "알 수 없는 제작 방식입니다.");
  const body = sanitizeBody(input.body);
  if (!body.ok) throw new AppError("validation", body.error);
  return {
    title,
    slug: input.slug,
    summary,
    body: body.doc,
    tags: cleanList(input.tags, LIMITS.tags, LIMITS.tag, "태그"),
    answers: cleanList(input.answers, LIMITS.answers, LIMITS.answer, "이 글이 답하는 질문"),
    seoTitle,
    seoDescription,
    origin: input.origin,
    originNote,
  };
}

export interface ContentSummary {
  id: string;
  type: string;
  title: string;
  slug: string;
  status: ContentStatus;
  origin: ContentOrigin;
  publishAt: Date | null;
  publishedAt: Date | null;
  updatedAt: Date;
  hasDraft: boolean;
}

export interface ContentQuery {
  type?: string;
  status?: ContentStatus;
  q?: string;
  page: number;
}

export function parseContentQuery(params: Record<string, string | string[] | undefined>): ContentQuery {
  const one = (k: string) => (Array.isArray(params[k]) ? params[k]?.[0] : (params[k] as string | undefined));
  const type = one("type");
  const status = one("status");
  const q = one("q")?.trim().slice(0, 60);
  const page = Number.parseInt(one("page") ?? "1", 10);
  return {
    type: type && isContentType(type) ? type : undefined,
    status: status && (STATUSES as readonly string[]).includes(status) ? (status as ContentStatus) : undefined,
    q: q || undefined,
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, 1000) : 1,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => "\\" + c);
}

function toSummary(row: ContentRow): ContentSummary {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    slug: row.slug,
    status: row.status as ContentStatus,
    origin: row.origin as ContentOrigin,
    publishAt: row.publishAt,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    hasDraft: row.draft !== null,
  };
}

export async function listContents(
  db: AdminDb,
  admin: AdminSession,
  query: ContentQuery,
): Promise<{ items: ContentSummary[]; total: number; page: number; pageSize: number; counts: Record<ContentStatus, number> }> {
  void admin;
  const parts: (SQL | undefined)[] = [isNull(contents.deletedAt)];
  if (query.type) parts.push(eq(contents.type, query.type));
  if (query.status) parts.push(eq(contents.status, query.status));
  if (query.q) {
    const pattern = `%${escapeLike(query.q)}%`;
    parts.push(or(ilike(contents.title, pattern), ilike(contents.slug, pattern)));
  }
  const where = and(...parts);
  const [totalRow] = await db.select({ value: count() }).from(contents).where(where);
  const rows = await db
    .select()
    .from(contents)
    .where(where)
    .orderBy(desc(contents.updatedAt))
    .limit(CONTENT_PAGE_SIZE)
    .offset((query.page - 1) * CONTENT_PAGE_SIZE);
  const grouped = await db.select({ status: contents.status, value: count() }).from(contents).where(isNull(contents.deletedAt)).groupBy(contents.status);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<ContentStatus, number>;
  for (const g of grouped) counts[g.status as ContentStatus] = g.value;
  return { items: rows.map(toSummary), total: totalRow?.value ?? 0, page: query.page, pageSize: CONTENT_PAGE_SIZE, counts };
}

export async function getContent(db: AdminDb, admin: AdminSession, id: string): Promise<ContentRow | null> {
  void admin;
  if (!isUuid(id)) return null;
  const [row] = await db.select().from(contents).where(and(eq(contents.id, id), isNull(contents.deletedAt))).limit(1);
  return row ?? null;
}

/** 편집 화면이 보여 줄 값: 발행된 글에 수정 중인 내용이 있으면 그것, 없으면 공개 내용 */
export function editableView(row: ContentRow): ContentEdit & { hasDraft: boolean } {
  const d = (row.draft ?? null) as Partial<ContentEdit> | null;
  return {
    title: d?.title ?? row.title,
    slug: row.slug,
    summary: d?.summary ?? row.summary,
    body: d?.body ?? row.body,
    tags: d?.tags ?? row.tags,
    answers: d?.answers ?? row.answers,
    seoTitle: d?.seoTitle ?? row.seoTitle,
    seoDescription: d?.seoDescription ?? row.seoDescription,
    origin: (d?.origin ?? row.origin) as ContentOrigin,
    originNote: d?.originNote ?? row.originNote,
    hasDraft: row.draft !== null,
  };
}

async function uniqueSlug(db: AdminDb, type: string, base: string): Promise<string> {
  for (let i = 1; i <= 50; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    const [hit] = await db.select({ id: contents.id }).from(contents).where(and(eq(contents.type, type), eq(contents.slug, candidate), isNull(contents.deletedAt))).limit(1);
    if (!hit) return candidate;
  }
  throw new AppError("validation", "주소 이름을 만들 수 없습니다. 직접 입력해 주세요.");
}

export async function createContent(db: AdminDb, admin: AdminSession, input: { type: string; title: string }): Promise<ContentRow> {
  if (!isContentType(input.type)) throw new AppError("validation", "알 수 없는 콘텐츠 유형입니다.");
  const title = input.title.replace(/\s+/g, " ").trim();
  if (!title) throw new AppError("validation", "제목을 입력해 주세요.");
  if (title.length > LIMITS.title) throw new AppError("validation", `제목은 ${LIMITS.title}자까지 쓸 수 있습니다.`);
  const fromTitle = slugFromTitle(title);
  const base = validateSlug(fromTitle) === null ? fromTitle : `${input.type}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  const slug = await uniqueSlug(db, input.type, base);
  const [row] = await db
    .insert(contents)
    .values({ type: input.type, slug, title, body: EMPTY_BODY as unknown as Record<string, unknown>, createdBy: admin.userId, updatedBy: admin.userId })
    .returning();
  if (!row) throw new AppError("external", "저장 결과가 비어 있습니다.");
  await recordAudit(db, admin, { action: "content.create", targetType: "content", targetId: row.id, meta: { type: input.type } });
  return row;
}

function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}

/** 본문에 넣은 이미지가 모두 라이브러리에 있는지(삭제되지 않았는지) 확인한다 */
async function assertBodyMedia(db: AdminDb, doc: BodyDoc): Promise<void> {
  const ids = collectMediaIds(doc);
  if (ids.length === 0) return;
  const found = await db.select({ id: media.id }).from(media).where(and(inArray(media.id, ids), isNull(media.deletedAt)));
  if (found.length !== ids.length) throw new AppError("validation", "본문에 삭제되었거나 없는 이미지가 있습니다. 이미지를 지우고 다시 넣어 주세요.");
}

/**
 * 발행 전 점검 전체: 글 내용 점검 + 본문 이미지의 대체 텍스트(없으면 막는다).
 * 수정 중인 내용이 있으면 그것을 기준으로 한다. 편집 화면의 점검 표시와 발행·예약·수정 내용 반영이 같은 함수를 쓴다.
 */
export async function publishProblems(db: AdminDb, admin: AdminSession, row: ContentRow, reviewed: boolean): Promise<string[]> {
  void admin;
  const problems = publishChecks(checkInput(row, reviewed));
  const body = sanitizeBody(editableView(row).body);
  if (body.ok) {
    const ids = collectMediaIds(body.doc);
    if (ids.length > 0) {
      const rows = await db.select({ id: media.id, alt: media.alt }).from(media).where(and(inArray(media.id, ids), isNull(media.deletedAt)));
      if (rows.length !== ids.length) problems.push("본문에 삭제되었거나 없는 이미지가 있습니다.");
      const missing = rows.filter((r) => !r.alt || !r.alt.trim()).length;
      if (missing > 0) problems.push(`본문 이미지 ${missing}개에 대체 텍스트가 없습니다. 어드민 > 미디어에서 입력해 주세요.`);
    }
  }
  return problems;
}

export async function saveContent(db: AdminDb, admin: AdminSession, id: string, version: number, input: ContentEdit): Promise<{ version: number; savedAsDraft: boolean }> {
  if (!isUuid(id)) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  const edit = cleanEdit(input);
  await assertBodyMedia(db, edit.body);
  const current = await getContent(db, admin, id);
  if (!current) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  const published = current.status === "published";
  if (published && edit.slug !== current.slug) throw new AppError("validation", "발행된 글의 주소 이름은 바꿀 수 없습니다. 먼저 발행을 취소해 주세요.");
  const now = new Date();
  try {
    const patch = published
      ? { draft: { ...edit, body: edit.body } as unknown as Record<string, unknown> }
      : {
          title: edit.title,
          slug: edit.slug,
          summary: edit.summary,
          body: edit.body as unknown as Record<string, unknown>,
          tags: edit.tags,
          answers: edit.answers,
          seoTitle: edit.seoTitle,
          seoDescription: edit.seoDescription,
          origin: edit.origin,
          originNote: edit.originNote,
        };
    const updated = await db
      .update(contents)
      .set({ ...patch, version: version + 1, updatedAt: now, updatedBy: admin.userId })
      .where(and(eq(contents.id, id), eq(contents.version, version), isNull(contents.deletedAt)))
      .returning({ version: contents.version });
    if (updated.length === 0) throw new AppError("validation", "다른 곳에서 먼저 저장했습니다. 새로고침한 뒤 내용을 확인하고 다시 저장해 주세요.");
    await recordAudit(db, admin, { action: "content.save", targetType: "content", targetId: id, meta: { version: version + 1, draft: published } });
    return { version: version + 1, savedAsDraft: published };
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError("validation", "같은 주소 이름이 이미 있습니다. 다른 이름을 써 주세요.");
    throw error;
  }
}

/** 발행 점검에 쓸 값: 수정 중인 내용이 있으면 그것 */
function checkInput(row: ContentRow, reviewed: boolean) {
  const view = editableView(row);
  const body = sanitizeBody(view.body);
  return {
    title: view.title,
    slug: row.slug,
    bodyEmpty: !body.ok || isBodyEmpty(body.doc),
    summary: view.summary,
    origin: view.origin,
    reviewed,
  };
}

export async function transitionContent(
  db: AdminDb,
  admin: AdminSession,
  id: string,
  to: ContentStatus,
  options: { version: number; publishAt?: Date; now?: Date },
): Promise<{ status: ContentStatus; version: number }> {
  const now = options.now ?? new Date();
  const row = await getContent(db, admin, id);
  if (!row) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  const from = row.status as ContentStatus;
  if (!canTransition(from, to)) throw new AppError("validation", "이 상태에서는 선택한 상태로 바꿀 수 없습니다.");

  if (to === "published" || to === "scheduled") {
    const problems = await publishProblems(db, admin, row, from === "review");
    if (problems.length > 0) throw new AppError("validation", problems.join(" "));
  }
  if (to === "scheduled") {
    const err = options.publishAt ? validatePublishAt(options.publishAt, now) : "예약 시각을 입력해 주세요.";
    if (err) throw new AppError("validation", err);
  }

  const set: Partial<typeof contents.$inferInsert> = { status: to, version: options.version + 1, updatedAt: now, updatedBy: admin.userId };
  if (to === "published") {
    // 수정 중인 내용이 있으면 이때 공개 내용에 반영한다
    const view = editableView(row);
    const clean = cleanEdit({ ...view, slug: row.slug });
    Object.assign(set, {
      title: clean.title,
      summary: clean.summary,
      body: clean.body as unknown as Record<string, unknown>,
      tags: clean.tags,
      answers: clean.answers,
      seoTitle: clean.seoTitle,
      seoDescription: clean.seoDescription,
      origin: clean.origin,
      originNote: clean.originNote,
      draft: null,
      publishedAt: now,
      publishAt: null,
    });
  } else if (to === "scheduled") {
    set.publishAt = options.publishAt!;
  } else {
    set.publishAt = null;
    if (from === "published") set.publishedAt = null;
  }

  const updated = await db
    .update(contents)
    .set(set)
    .where(and(eq(contents.id, id), eq(contents.version, options.version), eq(contents.status, from), isNull(contents.deletedAt)))
    .returning({ version: contents.version });
  if (updated.length === 0) throw new AppError("validation", "다른 곳에서 먼저 저장했습니다. 새로고침한 뒤 다시 시도해 주세요.");

  // 예약 작업: 예약하면 만들고, 예약에서 벗어나면 취소한다
  if (from === "scheduled") {
    await db.update(publishJobs).set({ state: "cancelled", finishedAt: now }).where(and(eq(publishJobs.contentId, id), sql`${publishJobs.state} in ('pending', 'running')`));
  }
  if (to === "scheduled") {
    await db.insert(publishJobs).values({ contentId: id, runAt: options.publishAt! });
  }
  await recordAudit(db, admin, { action: "content.transition", targetType: "content", targetId: id, meta: { from, to } });
  return { status: to, version: options.version + 1 };
}

/** 발행된 글의 수정 중인 내용을 버린다 */
export async function discardDraft(db: AdminDb, admin: AdminSession, id: string, version: number): Promise<void> {
  const row = await getContent(db, admin, id);
  if (!row || row.draft === null) throw new AppError("not_found", "버릴 수정 내용이 없습니다.");
  const updated = await db
    .update(contents)
    .set({ draft: null, version: version + 1, updatedAt: new Date(), updatedBy: admin.userId })
    .where(and(eq(contents.id, id), eq(contents.version, version)))
    .returning({ id: contents.id });
  if (updated.length === 0) throw new AppError("validation", "다른 곳에서 먼저 저장했습니다. 새로고침한 뒤 다시 시도해 주세요.");
  await recordAudit(db, admin, { action: "content.discard_draft", targetType: "content", targetId: id });
}

/** 발행된 글의 수정 내용을 공개 내용에 반영한다 (발행 점검을 다시 거친다) */
export async function publishDraft(db: AdminDb, admin: AdminSession, id: string, version: number): Promise<{ version: number }> {
  const row = await getContent(db, admin, id);
  if (!row || row.status !== "published" || row.draft === null) throw new AppError("validation", "반영할 수정 내용이 없습니다.");
  const problems = await publishProblems(db, admin, row, true);
  if (problems.length > 0) throw new AppError("validation", problems.join(" "));
  const clean = cleanEdit({ ...editableView(row), slug: row.slug });
  const updated = await db
    .update(contents)
    .set({
      title: clean.title,
      summary: clean.summary,
      body: clean.body as unknown as Record<string, unknown>,
      tags: clean.tags,
      answers: clean.answers,
      seoTitle: clean.seoTitle,
      seoDescription: clean.seoDescription,
      origin: clean.origin,
      originNote: clean.originNote,
      draft: null,
      version: version + 1,
      updatedAt: new Date(),
      updatedBy: admin.userId,
    })
    .where(and(eq(contents.id, id), eq(contents.version, version), eq(contents.status, "published")))
    .returning({ version: contents.version });
  if (updated.length === 0) throw new AppError("validation", "다른 곳에서 먼저 저장했습니다. 새로고침한 뒤 다시 시도해 주세요.");
  await recordAudit(db, admin, { action: "content.publish_draft", targetType: "content", targetId: id });
  return { version: version + 1 };
}

/** 삭제(휴지통으로). 예약 작업은 취소한다. 복원·영구 삭제는 휴지통 단계(AD-6)에서 만든다 */
export async function deleteContent(db: AdminDb, admin: AdminSession, id: string): Promise<void> {
  if (!isUuid(id)) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  const now = new Date();
  const removed = await db.update(contents).set({ deletedAt: now, updatedAt: now, updatedBy: admin.userId }).where(and(eq(contents.id, id), isNull(contents.deletedAt))).returning({ status: contents.status });
  if (removed.length === 0) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  await db.update(publishJobs).set({ state: "cancelled", finishedAt: now }).where(and(eq(publishJobs.contentId, id), sql`${publishJobs.state} in ('pending', 'running')`));
  await recordAudit(db, admin, { action: "content.delete", targetType: "content", targetId: id, meta: { status: removed[0]!.status } });
}

export interface ScheduleItem {
  content: ContentSummary;
  job: PublishJobRow | null;
}

/** 발행 일정 화면: 예약된 콘텐츠와 최근 작업(실패 포함) */
export async function listSchedule(db: AdminDb, admin: AdminSession, now: Date = new Date()): Promise<{ upcoming: ScheduleItem[]; failed: ScheduleItem[]; recentDone: ScheduleItem[] }> {
  void admin;
  const rows = await db
    .select({ content: contents, job: publishJobs })
    .from(publishJobs)
    .innerJoin(contents, eq(contents.id, publishJobs.contentId))
    .where(isNull(contents.deletedAt))
    .orderBy(publishJobs.runAt);
  const toItem = (r: { content: ContentRow; job: PublishJobRow }): ScheduleItem => ({ content: toSummary(r.content), job: r.job });
  const upcoming = rows.filter((r) => ["pending", "running"].includes(r.job.state)).map(toItem);
  const failed = rows.filter((r) => r.job.state === "failed").map(toItem);
  const recentDone = rows
    .filter((r) => r.job.state === "done" && r.job.finishedAt && now.getTime() - r.job.finishedAt.getTime() < 14 * 24 * 60 * 60 * 1000)
    .map(toItem)
    .reverse();
  return { upcoming, failed, recentDone };
}

/** 실패한 예약 작업을 다시 시도하게 한다 (예약 시각이 지났으면 곧바로 실행 대상이 된다) */
export async function retryPublishJob(db: AdminDb, admin: AdminSession, jobId: string): Promise<void> {
  if (!isUuid(jobId)) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  const updated = await db
    .update(publishJobs)
    .set({ state: "pending", attempts: 0, lastErrorKind: null, finishedAt: null, claimedAt: null })
    .where(and(eq(publishJobs.id, jobId), eq(publishJobs.state, "failed")))
    .returning({ contentId: publishJobs.contentId });
  if (updated.length === 0) throw new AppError("not_found", "다시 시도할 작업이 없습니다.");
  await recordAudit(db, admin, { action: "content.retry_job", targetType: "content", targetId: updated[0]!.contentId });
}

export async function contentDashboard(db: AdminDb, admin: AdminSession): Promise<{ draft: number; review: number; scheduled: number; failedJobs: number }> {
  void admin;
  const grouped = await db.select({ status: contents.status, value: count() }).from(contents).where(isNull(contents.deletedAt)).groupBy(contents.status);
  const get = (s: string) => grouped.find((g) => g.status === s)?.value ?? 0;
  const [failed] = await db.select({ value: count() }).from(publishJobs).where(eq(publishJobs.state, "failed"));
  return { draft: get("draft"), review: get("review"), scheduled: get("scheduled"), failedJobs: failed?.value ?? 0 };
}

export function summaryOf(row: ContentRow): string {
  if (row.summary) return row.summary;
  const body = sanitizeBody(row.body);
  return body.ok ? plainTextFromBody(body.doc).slice(0, 160) : "";
}

export { allowedTransitions };
