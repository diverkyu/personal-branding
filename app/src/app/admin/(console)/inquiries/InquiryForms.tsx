"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { deleteInquiryAction, updateMemoAction, updateStatusAction, type ActionState } from "../../inquiryActions";
import styles from "../../admin.module.css";

export function StatusForm({ id, status, options }: { id: string; status: string; options: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateStatusAction, {});
  return (
    <form action={action} className={styles.form} noValidate>
      <input type="hidden" name="id" value={id} />
      <label htmlFor="status" className={styles.fieldLabel}>
        처리 상태
      </label>
      <select key={status} id="status" name="status" defaultValue={status} className={styles.select}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {state.error ? (
        <p role="alert" className={styles.alert}>
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className={styles.alert}>
          저장했습니다.
        </p>
      ) : null}
      <Button type="submit" busy={pending} variant="dark" surface="light" size="S">
        {pending ? "저장 중" : "상태 저장"}
      </Button>
    </form>
  );
}

export function MemoForm({ id, memo }: { id: string; memo: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateMemoAction, {});
  return (
    <form action={action} className={styles.form} noValidate>
      <input type="hidden" name="id" value={id} />
      <Textarea key={memo} id="memo" name="memo" label="내부 메모" defaultValue={memo} maxLength={1000} rows={5} surface="light" hint="규강 전용입니다. 방문자에게 공개되지 않습니다." />
      {state.error ? (
        <p role="alert" className={styles.alert}>
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className={styles.alert}>
          저장했습니다.
        </p>
      ) : null}
      <Button type="submit" busy={pending} variant="dark" surface="light" size="S">
        {pending ? "저장 중" : "메모 저장"}
      </Button>
    </form>
  );
}

export function DeleteForm({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(deleteInquiryAction, {});
  if (!open) {
    return (
      <button type="button" className={styles.dangerLink} onClick={() => setOpen(true)}>
        삭제(파기)…
      </button>
    );
  }
  return (
    <form action={action} className={styles.dangerBox} noValidate>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="confirm" value="yes" />
      <p className={styles.note} style={{ margin: 0 }}>
        이 신청을 <strong>영구 삭제</strong>합니다. 휴지통이 없고 <strong>되돌릴 수 없습니다.</strong> 활동 기록에는 삭제했다는 사실만 남습니다.
      </p>
      {state.error ? (
        <p role="alert" className={styles.alert}>
          {state.error}
        </p>
      ) : null}
      <div className={styles.row}>
        <Button type="submit" busy={pending} variant="dark" surface="light" size="S">
          {pending ? "삭제 중" : "영구 삭제"}
        </Button>
        <button type="button" className={styles.linkButton} onClick={() => setOpen(false)}>
          취소
        </button>
      </div>
    </form>
  );
}
