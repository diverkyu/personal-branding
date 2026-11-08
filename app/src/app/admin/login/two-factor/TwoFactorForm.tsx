"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { verifyBackupAction, verifyTotpAction, type FormState } from "../../actions";
import styles from "../../admin.module.css";

export function TwoFactorForm() {
  const [useBackup, setUseBackup] = useState(false);
  const [totpState, totpAction, totpPending] = useActionState<FormState, FormData>(verifyTotpAction, {});
  const [backupState, backupAction, backupPending] = useActionState<FormState, FormData>(verifyBackupAction, {});
  const state = useBackup ? backupState : totpState;
  const pending = useBackup ? backupPending : totpPending;
  return (
    <form action={useBackup ? backupAction : totpAction} className={styles.form} noValidate>
      {state.error ? (
        <p role="alert" className={styles.alert}>
          {state.error}
        </p>
      ) : null}
      {useBackup ? (
        <TextField id="code" name="code" label="복구 코드" autoComplete="off" required surface="light" hint="저장해 둔 복구 코드 중 하나를 입력합니다. 한 번 쓰면 다시 쓸 수 없습니다." />
      ) : (
        <TextField id="code" name="code" label="인증 코드 (6자리)" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required surface="light" />
      )}
      <Button type="submit" busy={pending} variant="dark" surface="light">
        {pending ? "확인 중" : "로그인"}
      </Button>
      <button type="button" className={styles.linkButton} onClick={() => setUseBackup((v) => !v)}>
        {useBackup ? "인증 앱 코드로 로그인" : "인증 앱을 쓸 수 없나요? 복구 코드로 로그인"}
      </button>
      <Link href="/admin/login" className={styles.linkButton}>
        처음으로
      </Link>
    </form>
  );
}
