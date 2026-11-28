import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, or, lt, sql } from "drizzle-orm";
import { seoSync, seoJournal, seoFields } from "@/db/schema";
import type { AdminDb } from "@/data/admin/db";
import type { AdminSession } from "@/lib/auth/types";
import { AppError } from "@/lib/errors";
import { recordAudit } from "@/data/admin/audit";
import { isUuid } from "@/data/admin/inquiryQuery";
import { SYNC, cleanJournal, safeUrl, FIELD_LABELS, TRANSITIONS, type JournalInput, type JournalStatus, type ContentField, type AutoEngine, type Snapshot } from "@/seo/model";

export async function readSeo(db: AdminDb, admin: AdminSession, scopes: string[]) {
  void admin;
  const [sync, journal, fields] = await Promise.all([
    db.select().from(seoSync).where(or(...scopes.map(scope => eq(seoSync.scope, scope)))),
    db.select().from(seoJournal).where(isNull(seoJournal.deletedAt)).orderBy(desc(seoJournal.updatedAt)).limit(200),
    db.select().from(seoFields),
  ]);
  return { sync, journal, fields: Object.fromEntries(fields.map(r => [r.path, r.field as ContentField])) };
}

export async function saveJournal(db: AdminDb, admin: AdminSession, input: JournalInput, origin: string, id?: string, version?: number, status?: string) {
  const clean = cleanJournal(input, origin);
  if (!id) {
    const [row] = await db.insert(seoJournal).values({ ...clean, updatedBy: admin.userId }).returning();
    if (!row) throw new AppError("external", "저장 결과를 확인하지 못했습니다.");
    await recordAudit(db, admin, { action: "seo.journal.create", targetType: "seo", targetId: row.id });
    return row;
  }
  if (!isUuid(id) || !Number.isInteger(version) || !status || !Object.hasOwn(TRANSITIONS, status)) throw new AppError("validation", "점검 항목 또는 상태를 확인해 주세요.");
  const [current] = await db.select().from(seoJournal).where(and(eq(seoJournal.id, id), isNull(seoJournal.deletedAt)));
  if (!current) throw new AppError("not_found", "점검 항목을 찾을 수 없습니다.");
  if (status !== current.status && !TRANSITIONS[current.status as JournalStatus].includes(status as JournalStatus)) throw new AppError("validation", "수정 완료 후 재검사를 거쳐 해결 여부를 기록해 주세요.");
  const [row] = await db.update(seoJournal).set({ ...clean, status, version: version! + 1, updatedAt: new Date(), updatedBy: admin.userId }).where(and(eq(seoJournal.id, id), eq(seoJournal.version, version!), isNull(seoJournal.deletedAt))).returning();
  if (!row) throw new AppError("validation", "다른 곳에서 먼저 수정했습니다. 새로고침 후 다시 확인해 주세요.");
  await recordAudit(db, admin, { action: "seo.journal.save", targetType: "seo", targetId: id, meta: { status, version: row.version } });
  return row;
}
export async function deleteJournal(db: AdminDb, admin: AdminSession, id: string, version: number, confirmed: boolean) {
  if (!isUuid(id) || !confirmed || !Number.isInteger(version)) throw new AppError("validation", "삭제 확인을 선택해 주세요.");
  const [row] = await db.update(seoJournal).set({ deletedAt: new Date(), updatedBy: admin.userId, version: version + 1 }).where(and(eq(seoJournal.id, id), eq(seoJournal.version, version), isNull(seoJournal.deletedAt))).returning();
  if (!row) throw new AppError("validation", "다른 곳에서 변경되었습니다. 새로고침해 주세요.");
  await recordAudit(db, admin, { action: "seo.journal.delete", targetType: "seo", targetId: id });
}
export async function saveField(db: AdminDb, admin: AdminSession, url: string, field: string, origin: string) {
  if (!Object.hasOwn(FIELD_LABELS, field)) throw new AppError("validation", "콘텐츠 분야를 선택해 주세요.");
  const path = new URL(safeUrl(url, origin)).pathname.replace(/\/$/, "") || "/";
  await db.insert(seoFields).values({ path, field, updatedBy: admin.userId }).onConflictDoUpdate({ target: seoFields.path, set: { field, updatedBy: admin.userId } });
  await recordAudit(db, admin, { action: "seo.field.save", targetType: "seo", meta: { field } });
}

/** One atomic conditional UPDATE arbitrates concurrent cron/admin requests across instances. */
export async function claimSync(db: AdminDb, scope: string, engine: AutoEngine, now: Date) {
  await db.insert(seoSync).values({ scope, engine }).onConflictDoNothing();
  const midnight = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const lease = randomUUID();
  const [claimed] = await db.update(seoSync).set({ lease, leaseUntil: new Date(now.getTime() + SYNC.leaseMs), attemptedAt: now, errorCode: null }).where(and(
    eq(seoSync.scope, scope),
    or(isNull(seoSync.leaseUntil), lt(seoSync.leaseUntil, now)),
    or(isNull(seoSync.succeededAt), lt(seoSync.succeededAt, midnight)),
    or(isNull(seoSync.attemptedAt), lt(seoSync.attemptedAt, new Date(now.getTime() - SYNC.retryMs))),
  )).returning();
  return claimed ? lease : null;
}
export async function finishSync(db: AdminDb, scope: string, lease: string, result: { snapshot: Snapshot } | { error: string }, now = new Date()) {
  const success = "snapshot" in result;
  const [row] = await db.update(seoSync).set({ lease: null, leaseUntil: null, errorCode: success ? null : result.error,
    ...(success ? { snapshot: result.snapshot, succeededAt: now } : {}),
  }).where(and(eq(seoSync.scope, scope), eq(seoSync.lease, lease), sql`${seoSync.leaseUntil} > ${now}`)).returning({ scope: seoSync.scope });
  return !!row;
}
