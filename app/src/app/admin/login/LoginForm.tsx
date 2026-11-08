"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { loginAction, type FormState } from "../actions";
import styles from "../admin.module.css";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className={styles.form} noValidate>
      {state.error ? (
        <p role="alert" className={styles.alert}>
          {state.error}
        </p>
      ) : null}
      <TextField id="email" name="email" type="email" label="이메일" autoComplete="username" required surface="light" defaultValue={state.email} />
      <TextField id="password" name="password" type="password" label="비밀번호" autoComplete="current-password" required surface="light" />
      <Button type="submit" busy={pending} variant="dark" surface="light">
        {pending ? "확인 중" : "다음"}
      </Button>
    </form>
  );
}
