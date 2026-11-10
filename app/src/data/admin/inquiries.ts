/**
 * 어드민의 신청·문의 데이터 함수 (SCREEN-SPEC ADM-INQ). 개인정보를 다루므로:
 * - 모든 함수는 `admin: AdminSession`(requireAdmin() 이 만든 값)을 받는다. 시험이 이 규칙을 지키는지 확인한다.
 * - 열람(상세)·상태 변경·메모 수정·삭제·내보내기는 활동 기록에 남긴다. 기록에는 개인정보를 넣지 않는다.
 * - 값은 파라미터 바인딩으로만 들어가고, 검색어의 와일드카드는 이스케이프한다.
 */
import { and, count, desc, eq, gte, ilike, lt, or, type SQL } from "drizzle-orm";
import { inquiries, type InquiryRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import type { AdminSession } from "@/lib/auth/types";
import { recordAudit } from "./audit";
import type { AdminDb } from "./db";
import { INQUIRY_PAGE_SIZE, allowedStatuses, isUuid, type InquiryQuery, type InquiryStatus } from "./inquiryQuery";

export interface InquirySummary {
  id: string;
  kind: "reservation" | "notice";
  tourSlug: string;
  name: string;
  email: string;
  receivedAt: Date;
  status: InquiryStatus;
  /** 접수 알림 메일 결과 (failed 이면 어드민에 표시) */
  notifyStatus: string | null;
}

export const EXPORT_LIMIT = 5000;
export const MEMO_MAX = 1000;

const summaryColumns = {
  id: inquiries.id,
  kind: inquiries.kind,
  tourSlug: inquiries.tourSlug,
  name: inquiries.name,
  email: inquiries.email,
  receivedAt: inquiries.receivedAt,
  status: inquiries.status,
  notifyStatus: inquiries.notifyStatus,
};

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => "\\" + c);
}

function conditions(query: InquiryQuery): SQL | undefined {
  const parts: (SQL | undefined)[] = [];
  if (query.kind) parts.push(eq(inquiries.kind, query.kind));
  if (query.status) parts.push(eq(inquiries.status, query.status));
  if (query.tourSlug) parts.push(eq(inquiries.tourSlug, query.tourSlug));
  if (query.from) parts.push(gte(inquiries.receivedAt, new Date(`${query.from}T00:00:00+09:00`)));
  if (query.to) {
    const end = new Date(`${query.to}T00:00:00+09:00`);
    end.setUTCDate(end.getUTCDate() + 1);
    parts.push(lt(inquiries.receivedAt, end));
  }
  if (query.q) {
    const pattern = `%${escapeLike(query.q)}%`;
    parts.push(or(ilike(inquiries.name, pattern), ilike(inquiries.email, pattern), ilike(inquiries.tourSlug, pattern)));
  }
  return and(...parts);
}

export async function listInquiries(
  db: AdminDb,
  admin: AdminSession,
  query: InquiryQuery,
): Promise<{ items: InquirySummary[]; total: number; page: number; pageSize: number; newCount: number }> {
  void admin;
  const where = conditions(query);
  const [totalRow] = await db.select({ value: count() }).from(inquiries).where(where);
  const [newRow] = await db.select({ value: count() }).from(inquiries).where(eq(inquiries.status, "new"));
  const items = (await db
    .select(summaryColumns)
    .from(inquiries)
    .where(where)
    .orderBy(desc(inquiries.receivedAt))
    .limit(INQUIRY_PAGE_SIZE)
    .offset((query.page - 1) * INQUIRY_PAGE_SIZE)) as InquirySummary[];
  return { items, total: totalRow?.value ?? 0, page: query.page, pageSize: INQUIRY_PAGE_SIZE, newCount: newRow?.value ?? 0 };
}

/** 대시보드용: 새 신청 수, 알림 메일 실패 수(DASH-04), 최근 5건 */
export async function inquiryDashboard(db: AdminDb, admin: AdminSession): Promise<{ newCount: number; notifyFailed: number; recent: InquirySummary[] }> {
  void admin;
  const [newRow] = await db.select({ value: count() }).from(inquiries).where(eq(inquiries.status, "new"));
  // 알림 메일이 실패했고 아직 "신규"인 신청 (처리하면 더 알릴 필요가 없다)
  const [failedRow] = await db.select({ value: count() }).from(inquiries).where(and(eq(inquiries.notifyStatus, "failed"), eq(inquiries.status, "new")));
  const recent = (await db.select(summaryColumns).from(inquiries).orderBy(desc(inquiries.receivedAt)).limit(5)) as InquirySummary[];
  return { newCount: newRow?.value ?? 0, notifyFailed: failedRow?.value ?? 0, recent };
}

/** 상세. 열람은 활동 기록에 남는다. 없거나 형식이 틀리면 null (화면은 404) */
export async function getInquiry(db: AdminDb, admin: AdminSession, id: string): Promise<InquiryRow | null> {
  if (!isUuid(id)) return null;
  const [row] = await db.select().from(inquiries).where(eq(inquiries.id, id)).limit(1);
  if (!row) return null;
  await recordAudit(db, admin, { action: "inquiry.view", targetType: "inquiry", targetId: id, meta: { kind: row.kind } });
  return row;
}

export async function updateInquiryStatus(db: AdminDb, admin: AdminSession, id: string, status: string): Promise<{ from: string; to: string }> {
  if (!isUuid(id)) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  const [row] = await db.select({ kind: inquiries.kind, status: inquiries.status }).from(inquiries).where(eq(inquiries.id, id)).limit(1);
  if (!row) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  const allowed = allowedStatuses(row.kind as "reservation" | "notice") as readonly string[];
  if (!allowed.includes(status)) throw new AppError("validation", "이 유형에서는 쓸 수 없는 상태입니다.");
  if (row.status !== status) {
    await db.update(inquiries).set({ status }).where(eq(inquiries.id, id));
    await recordAudit(db, admin, { action: "inquiry.status_change", targetType: "inquiry", targetId: id, meta: { from: row.status, to: status } });
  }
  return { from: row.status, to: status };
}

/** 메모는 규강 전용 내부 기록이다. 기록에는 내용이 아닌 길이만 남긴다 */
export async function updateInquiryMemo(db: AdminDb, admin: AdminSession, id: string, memo: string): Promise<void> {
  if (!isUuid(id)) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  const text = memo.replace(/\r\n/g, "\n").trim();
  if (text.length > MEMO_MAX) throw new AppError("validation", `메모는 ${MEMO_MAX}자 이하여야 합니다.`);
  const updated = await db.update(inquiries).set({ memo: text || null }).where(eq(inquiries.id, id)).returning({ id: inquiries.id });
  if (updated.length === 0) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  await recordAudit(db, admin, { action: "inquiry.memo_update", targetType: "inquiry", targetId: id, meta: { length: text.length } });
}

/** 파기: 휴지통 없이 즉시 영구 삭제한다 (PRD A-7). 되돌릴 수 없다 */
export async function deleteInquiry(db: AdminDb, admin: AdminSession, id: string): Promise<void> {
  if (!isUuid(id)) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  const removed = await db.delete(inquiries).where(eq(inquiries.id, id)).returning({ kind: inquiries.kind });
  if (removed.length === 0) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  await recordAudit(db, admin, { action: "inquiry.delete", targetType: "inquiry", targetId: id, meta: { kind: removed[0]!.kind } });
}

/** CSV 내보내기용 행. 문의 본문과 메모는 내보내지 않는다. 내보내기는 활동 기록에 남는다 */
export async function listInquiriesForExport(db: AdminDb, admin: AdminSession, query: InquiryQuery): Promise<InquiryRow[]> {
  const rows = await db
    .select()
    .from(inquiries)
    .where(conditions(query))
    .orderBy(desc(inquiries.receivedAt))
    .limit(EXPORT_LIMIT);
  await recordAudit(db, admin, {
    action: "inquiry.export",
    targetType: "inquiry",
    meta: { count: rows.length, filtered: Boolean(query.kind || query.status || query.tourSlug || query.q || query.from || query.to) },
  });
  return rows;
}
