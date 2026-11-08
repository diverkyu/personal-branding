"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, TextField, Textarea } from "@/components/ui/Field";
import { publishConsentAction, type ConsentState } from "../../siteActions";
import styles from "../../admin.module.css";

export function ConsentForm({ kind, multiline, current, maxLength }: { kind: string; multiline: boolean; current: string; maxLength: number }) {
  const [state, action, pending] = useActionState<ConsentState, FormData>(publishConsentAction.bind(null, kind), {});
  const label = multiline ? "새 버전 본문" : "새 버전 문구";
  const value = state.error && state.body !== undefined ? state.body : current;
  return (
    <form action={action} className={styles.form} noValidate aria-label={`${label} 게시`}>
      {state.error ? (
        <p role="alert" className={styles.alert}>
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className={styles.alert}>
          버전 {state.version}을 게시했습니다. 공개 화면에는 몇 초 안에 반영되고(바로 안 보이면 새로고침), 이후 접수되는 신청에 이 버전이 기록됩니다.
        </p>
      ) : null}
      {multiline ? (
        <Textarea key={`${current}-${state.body ?? ""}`} id={`c-${kind}`} name="body" label={label} rows={14} defaultValue={value} hint="빈 줄로 문단을 나눕니다." surface="light" />
      ) : (
        <TextField key={`${current}-${state.body ?? ""}`} id={`c-${kind}`} name="body" label={label} defaultValue={value} maxLength={maxLength + 5} hint={`한 줄, ${maxLength}자까지`} surface="light" />
      )}
      <Checkbox id={`confirm-${kind}`} name="confirm" label="새 버전을 게시합니다. 이전 버전은 기록으로 남고, 이미 접수된 신청의 동의 기록은 바뀌지 않습니다." surface="light" />
      <Button type="submit" busy={pending} variant="dark" surface="light" size="S">
        {pending ? "게시 중" : "새 버전 게시"}
      </Button>
    </form>
  );
}
