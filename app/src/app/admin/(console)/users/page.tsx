import { requireAdmin } from "@/lib/auth/session";
import styles from "../../admin.module.css";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function UsersPage() {
  const admin = await requireAdmin();
  return (
    <>
      <h1 className={styles.h1}>사용자·보안</h1>
      <div className={styles.panel}>
        <dl className={styles.rows}>
          <dt>이름</dt>
          <dd>{admin.name}</dd>
          <dt>이메일</dt>
          <dd>{admin.email}</dd>
          <dt>2차 인증</dt>
          <dd>사용 중</dd>
          <dt>로그인 유지</dt>
          <dd>최대 8시간</dd>
        </dl>
      </div>
      <h2 className={styles.title}>비밀번호 변경</h2>
      <div className={styles.panel}>
        <ChangePasswordForm />
      </div>
    </>
  );
}
