import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import styles from "../../admin.module.css";
import { TwoFactorForm } from "./TwoFactorForm";

export const dynamic = "force-dynamic";

export default async function TwoFactorPage() {
  const { configured, access } = await readSession();
  if (!configured) redirect("/admin/login");
  if (access === "ok") redirect("/admin");
  if (access === "needs_two_factor") redirect("/admin/setup-2fa");
  return (
    <main id="main" className={styles.center}>
      <div className={styles.card}>
        <p className={styles.brand}>
          KYU <small>어드민</small>
        </p>
        <h1 className={styles.title}>2차 인증</h1>
        <p className={styles.note}>인증 앱에 표시된 6자리 코드를 입력해 주세요.</p>
        <TwoFactorForm />
      </div>
    </main>
  );
}
