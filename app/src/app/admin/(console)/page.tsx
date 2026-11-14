import Link from "next/link";
import { adminDb } from "@/data/admin/dbServer";
import { contentDashboard, listTourOptions } from "@/data/admin/contents";
import { inquiryDashboard } from "@/data/admin/inquiries";
import { loadReadiness } from "@/data/admin/readiness";
import { KIND_LABELS, STATUS_LABELS } from "@/data/admin/inquiryQuery";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTimeKst } from "@/lib/format";
import { ReadinessCard } from "./ReadinessCard";
import styles from "../admin.module.css";

export const metadata = { title: "대시보드 · KYU 어드민" };

/** 대시보드. 아직 만들지 않은 콘텐츠 영역(임시저장 글, 모집 중 투어 등)의 카드는 해당 화면이 생길 때 추가한다 (ADMIN-DESIGN §3.1) */
export default async function DashboardPage() {
  const admin = await requireAdmin();
  const db = adminDb();
  const { newCount, notifyFailed, recent } = await inquiryDashboard(db, admin);
  const content = await contentDashboard(db, admin);
  const readiness = await loadReadiness(db, admin, process.env);
  const tourTitles = new Map((await listTourOptions(db, admin)).map((t) => [t.slug, t.title]));
  return (
    <>
      <h1 className={styles.h1}>대시보드</h1>
      <p className={styles.note}>{admin.name} 님, 오늘 처리할 일입니다.</p>

      {notifyFailed > 0 ? (
        <p className={styles.alert} role="status">
          알림 메일을 보내지 못한 새 신청이 {notifyFailed}건 있습니다. 신청 내용은 저장되어 있으니{" "}
          <Link href="/admin/inquiries?status=new" className={styles.linkButton}>
            신청·문의 목록
          </Link>
          에서 확인하고, 메일 서비스 연결을 점검해 주세요.
        </p>
      ) : null}
      <ReadinessCard items={readiness} />
      <div className={styles.cards}>
        <Link href="/admin/inquiries?status=new" className={styles.statCard}>
          <span className={styles.statLabel}>새 투어 신청·문의</span>
          <span className={styles.statValue}>{newCount}</span>
        </Link>
        <Link href="/admin/contents?status=draft" className={styles.statCard}>
          <span className={styles.statLabel}>임시저장 글</span>
          <span className={styles.statValue}>{content.draft}</span>
        </Link>
        <Link href="/admin/contents?status=review" className={styles.statCard}>
          <span className={styles.statLabel}>검토 필요</span>
          <span className={styles.statValue}>{content.review}</span>
        </Link>
        <Link href="/admin/schedule" className={styles.statCard}>
          <span className={styles.statLabel}>예약된 글{content.failedJobs > 0 ? ` · 실패 ${content.failedJobs}` : ""}</span>
          <span className={styles.statValue}>{content.scheduled}</span>
        </Link>
      </div>

      <h2 className={styles.h2}>최근 신청·문의</h2>
      {recent.length === 0 ? (
        <div className={styles.panel}>
          <p className={styles.note} style={{ margin: 0 }}>
            아직 접수된 신청이 없습니다.
          </p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">접수일시</th>
              <th scope="col">유형</th>
              <th scope="col">투어</th>
              <th scope="col">이름</th>
              <th scope="col">상태</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((item) => (
              <tr key={item.id}>
                <td data-label="접수일시">{formatDateTimeKst(item.receivedAt)}</td>
                <td data-label="유형">{KIND_LABELS[item.kind]}</td>
                <td data-label="투어">{tourTitles.get(item.tourSlug) ?? item.tourSlug}</td>
                <td data-label="이름">
                  <Link href={`/admin/inquiries/${item.id}`} className={styles.rowLink}>
                    {item.name}
                  </Link>
                </td>
                <td data-label="상태">
                  <span className={styles.statusTag} data-status={item.status}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ marginTop: 12 }}>
        <Link href="/admin/inquiries" className={styles.linkButton}>
          신청·문의 전체 보기
        </Link>
      </p>
    </>
  );
}
