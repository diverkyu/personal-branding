import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import styles from "../admin.module.css";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const { configured, access } = await readSession();
  if (access === "ok") redirect("/admin");
  if (access === "needs_two_factor") redirect("/admin/setup-2fa");
  return (
    <main id="main" className={styles.center}>
      <div className={styles.card}>
        <p className={styles.brand}>
          KYU <small>어드민</small>
        </p>
        <h1 className={styles.title}>로그인</h1>
        {configured ? (
          <>
            <p className={styles.note}>관리자 계정으로 로그인합니다. 가입은 받지 않습니다.</p>
            <LoginForm />
          </>
        ) : (
          <p className={styles.alert}>어드민이 아직 설정되지 않았습니다. 설정이 끝나면 사용할 수 있습니다.</p>
        )}
      </div>
    </main>
  );
}
