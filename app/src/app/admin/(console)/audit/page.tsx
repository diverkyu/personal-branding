import Link from "next/link";
import { AUDIT_LABELS, listAudit, type AuditAction } from "@/data/admin/audit";
import { adminDb } from "@/data/admin/dbServer";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTimeKst } from "@/lib/format";
import styles from "../../admin.module.css";

export const metadata = { title: "활동 기록 · KYU 어드민" };

function metaText(meta: Record<string, string | number | boolean | null>): string {
  const entries = Object.entries(meta);
  return entries.length ? entries.map(([k, v]) => `${k}: ${String(v)}`).join(", ") : "-";
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const admin = await requireAdmin();
  const { page: rawPage } = await searchParams;
  const { items, total, page, pageSize } = await listAudit(adminDb(), admin, Number.parseInt(rawPage ?? "1", 10));
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <>
      <h1 className={styles.h1}>활동 기록</h1>
      <p className={styles.note}>누가 무엇을 열람·변경·삭제·내보냈는지 남는 기록입니다. 개인정보는 기록하지 않습니다.</p>
      {items.length === 0 ? (
        <div className={styles.panel}>
          <p className={styles.note} style={{ margin: 0 }}>
            아직 기록이 없습니다.
          </p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">일시</th>
              <th scope="col">활동</th>
              <th scope="col">대상</th>
              <th scope="col">내용</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td data-label="일시">{formatDateTimeKst(item.at)}</td>
                <td data-label="활동">{AUDIT_LABELS[item.action as AuditAction] ?? item.action}</td>
                <td data-label="대상">{item.targetId ? `${item.targetType} ${item.targetId.slice(0, 8)}` : item.targetType}</td>
                <td data-label="내용">{metaText(item.meta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {pages > 1 ? (
        <nav className={styles.row} aria-label="쪽 이동" style={{ marginTop: 16 }}>
          {page > 1 ? (
            <Link href={`/admin/audit?page=${page - 1}`} className={styles.smallButton}>
              이전
            </Link>
          ) : null}
          {page < pages ? (
            <Link href={`/admin/audit?page=${page + 1}`} className={styles.smallButton}>
              다음
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
