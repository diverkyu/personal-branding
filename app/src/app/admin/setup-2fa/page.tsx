import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import styles from "../admin.module.css";
import { SetupTwoFactor } from "./SetupTwoFactor";

export const dynamic = "force-dynamic";

export default async function SetupTwoFactorPage() {
  const user = await requireSession();
  if (user.twoFactorEnabled) redirect("/admin");
  return (
    <main id="main" className={styles.center}>
      <div className={styles.card}>
        <p className={styles.brand}>
          KYU <small>어드민</small>
        </p>
        <h1 className={styles.title}>2차 인증 등록</h1>
        <p className={styles.note}>어드민은 비밀번호에 더해 인증 앱 코드가 필요합니다. 등록을 마치기 전에는 다른 화면을 열 수 없습니다.</p>
        <SetupTwoFactor />
      </div>
    </main>
  );
}
