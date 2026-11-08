import { requireAdmin } from "@/lib/auth/session";
import styles from "../admin.module.css";

export default async function DashboardPage() {
  const admin = await requireAdmin();
  return (
    <>
      <h1 className={styles.h1}>대시보드</h1>
      <div className={styles.panel}>
        <p className={styles.note} style={{ margin: 0 }}>
          {admin.name} 님, 환영합니다. 신청·문의 처리, 콘텐츠 발행 같은 화면은 다음 단계에서 이 메뉴에 추가됩니다.
        </p>
      </div>
    </>
  );
}
