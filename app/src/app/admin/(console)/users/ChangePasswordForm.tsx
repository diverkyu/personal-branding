"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { changePasswordAction } from "../../actions";
import styles from "../../admin.module.css";

type State = { error?: string; done?: boolean };

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<State, FormData>(changePasswordAction, {});
  return (
    <form action={action} className={styles.form} noValidate>
      {state.error ? (
        <p role="alert" className={styles.alert}>
          {state.error}
        </p>
      ) : null}
      {state.done ? (
        <p role="status" className={styles.alert}>
          비밀번호를 바꿨습니다. 다른 기기의 로그인은 해제되었습니다.
        </p>
      ) : null}
      <TextField id="current" name="current" type="password" label="현재 비밀번호" autoComplete="current-password" required surface="light" />
      <TextField id="next" name="next" type="password" label="새 비밀번호" autoComplete="new-password" required surface="light" hint="12자 이상" />
      <TextField id="again" name="again" type="password" label="새 비밀번호 확인" autoComplete="new-password" required surface="light" />
      <Button type="submit" busy={pending} variant="dark" surface="light">
        {pending ? "변경 중" : "비밀번호 변경"}
      </Button>
    </form>
  );
}
