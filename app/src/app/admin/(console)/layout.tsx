import { logoutAction } from "../actions";
import { requireAdmin } from "@/lib/auth/session";
import styles from "../admin.module.css";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";

/** 로그인과 2차 인증을 마친 관리자만 들어온다. 이 검사를 건너뛰는 어드민 화면은 없다 (ADMIN-DESIGN §4.4). */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className={styles.shell}>
      <nav className={styles.side} aria-label="어드민 메뉴">
        <p className={styles.brand}>
          KYU <small>어드민</small>
        </p>
        <AdminNav />
        <div className={styles.sideFoot}>
          <p>{admin.name}</p>
          <form action={logoutAction}>
            <button type="submit" className={styles.linkButton} style={{ color: "inherit" }}>
              로그아웃
            </button>
          </form>
        </div>
      </nav>
      <main id="main" tabIndex={-1} className={styles.main}>
        {children}
      </main>
    </div>
  );
}
