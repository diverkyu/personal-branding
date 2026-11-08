/**
 * 활동 기록 (SECURITY §14). 개인정보는 남기지 않는다 — 대상은 id 와 종류로만 가리키고, meta 에는 숫자·상태 같은 값만 둔다.
 * 모든 함수는 첫 인자 뒤에 확인된 관리자(AdminSession)를 받는다.
 */
import { count, desc } from "drizzle-orm";
import { auditLog, type AuditRow } from "@/db/schema";
import type { AdminSession } from "@/lib/auth/types";
import { logger } from "@/lib/logger";
import type { AdminDb } from "./db";

export type AuditAction = "inquiry.view" | "inquiry.status_change" | "inquiry.memo_update" | "inquiry.delete" | "inquiry.export" | "settings.update" | "consent.publish";

export const AUDIT_LABELS: Record<AuditAction, string> = {
  "inquiry.view": "신청·문의 열람",
  "inquiry.status_change": "신청·문의 상태 변경",
  "inquiry.memo_update": "신청·문의 메모 수정",
  "inquiry.delete": "신청·문의 삭제(파기)",
  "inquiry.export": "신청·문의 CSV 내보내기",
  "settings.update": "사이트 설정 변경",
  "consent.publish": "동의 문구·방침 새 버전 게시",
};

export interface AuditEntry {
  action: AuditAction;
  targetType: string;
  targetId?: string;
  meta?: Record<string, string | number | boolean | null>;
}

const MAX_META_STRING = 60;

/** meta 의 문자열은 짧게 자른다 (실수로 긴 본문이 들어가는 것을 막는다) */
function safeMeta(meta: AuditEntry["meta"]): Record<string, string | number | boolean | null> {
  return Object.fromEntries(Object.entries(meta ?? {}).map(([k, v]) => [k, typeof v === "string" ? v.slice(0, MAX_META_STRING) : v]));
}

export async function recordAudit(db: AdminDb, admin: AdminSession, entry: AuditEntry): Promise<void> {
  await db.insert(auditLog).values({
    actorId: admin.userId,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId ?? null,
    meta: safeMeta(entry.meta),
  });
  logger.info("admin.audit", { action: entry.action, targetType: entry.targetType, outcome: "recorded" });
}

export const AUDIT_PAGE_SIZE = 30;

export async function listAudit(db: AdminDb, admin: AdminSession, page: number): Promise<{ items: AuditRow[]; total: number; page: number; pageSize: number }> {
  void admin;
  const safePage = Math.max(1, Math.min(Math.floor(page) || 1, 1000));
  const [row] = await db.select({ value: count() }).from(auditLog);
  const items = await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.at))
    .limit(AUDIT_PAGE_SIZE)
    .offset((safePage - 1) * AUDIT_PAGE_SIZE);
  return { items, total: row?.value ?? 0, page: safePage, pageSize: AUDIT_PAGE_SIZE };
}
