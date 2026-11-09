import Link from "next/link";
import { listSchedule, type ScheduleItem } from "@/data/admin/contents";
import { adminDb } from "@/data/admin/dbServer";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTimeKst } from "@/lib/format";
import styles from "../../admin.module.css";
import { RetryJobForm } from "../contents/ContentForms";

export const metadata = { title: "발행 일정 · KYU 어드민" };

const STATE_LABELS: Record<string, string> = { pending: "대기", running: "실행 중", done: "완료", failed: "실패", cancelled: "취소" };

function Table({ items, empty, retry }: { items: ScheduleItem[]; empty: string; retry?: boolean }) {
  if (items.length === 0) {
    return (
      <div className={styles.panel}>
        <p className={styles.note} style={{ margin: 0 }}>
          {empty}
        </p>
      </div>
    );
  }
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">공개 예정</th>
          <th scope="col">제목</th>
          <th scope="col">작업</th>
          {retry ? <th scope="col">조치</th> : null}
        </tr>
      </thead>
      <tbody>
        {items.map(({ content, job }) => (
          <tr key={job?.id ?? content.id}>
            <td data-label="공개 예정">{job ? formatDateTimeKst(job.runAt) : "-"}</td>
            <td data-label="제목">
              <Link href={`/admin/contents/${content.id}`} className={styles.rowLink}>
                {content.title}
              </Link>
            </td>
            <td data-label="작업">
              {job ? `${STATE_LABELS[job.state] ?? job.state}${job.attempts > 0 ? ` · ${job.attempts}회 시도` : ""}` : "-"}
            </td>
            {retry && job ? (
              <td data-label="조치">
                <RetryJobForm id={job.id} />
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function SchedulePage() {
  const admin = await requireAdmin();
  const { upcoming, failed, recentDone } = await listSchedule(adminDb(), admin);
  return (
    <>
      <h1 className={styles.h1}>발행 일정</h1>
      <p className={styles.note}>예약한 글과 자동 발행 기록입니다. 시각은 한국 시간입니다. 예약 시각이 지나면 공개 화면에는 5분 안에 나타나고, 이 목록의 '발행됨' 표시는 자동 실행 때 정리됩니다. 지금은 하루 한 번 실행됩니다.</p>

      {failed.length > 0 ? (
        <>
          <h2 className={styles.h2}>실패한 발행</h2>
          <Table items={failed} empty="" retry />
        </>
      ) : null}

      <h2 className={styles.h2}>예약된 글</h2>
      <Table items={upcoming} empty="예약된 글이 없습니다. 글 편집 화면에서 '예약하기'로 시각을 정할 수 있습니다." />

      <h2 className={styles.h2}>최근 2주 발행 기록</h2>
      <Table items={recentDone} empty="최근 자동 발행 기록이 없습니다." />
    </>
  );
}
