import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import type { Surface } from "./types";
import styles from "./Field.module.css";

interface FieldBase {
  /** 모든 입력은 보이는 라벨이 있다. id 는 호출하는 쪽이 정한다 (라벨 연결, 오류 연결에 쓴다) */
  id: string;
  label: string;
  hint?: string;
  /** 오류 문구. 있으면 aria-invalid 와 aria-describedby 로 입력과 연결한다 */
  error?: string;
  surface?: Surface;
}

function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

function Messages({ id, hint, error }: Pick<FieldBase, "id" | "hint" | "error">) {
  return (
    <>
      {hint ? (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-error`} role="alert" className={styles.error}>
          {error}
        </span>
      ) : null}
    </>
  );
}

type TextFieldProps = FieldBase & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className" | "aria-invalid" | "aria-describedby">;

/** 한 줄 입력. 높이 44px, 모서리는 둥글리지 않는다. */
export function TextField({ id, label, hint, error, surface = "dark", required, ...rest }: TextFieldProps) {
  return (
    <div className={styles.field} data-surface={surface}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required ? <span className={styles.required}> (필수)</span> : null}
      </label>
      <input id={id} className={styles.input} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} {...rest} />
      <Messages id={id} hint={hint} error={error} />
    </div>
  );
}

type TextareaProps = FieldBase & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "className" | "aria-invalid" | "aria-describedby">;

export function Textarea({ id, label, hint, error, surface = "dark", required, rows = 4, ...rest }: TextareaProps) {
  return (
    <div className={styles.field} data-surface={surface}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required ? <span className={styles.required}> (필수)</span> : null}
      </label>
      <textarea
        id={id}
        rows={rows}
        className={cx(styles.input, styles.textarea)}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      />
      <Messages id={id} hint={hint} error={error} />
    </div>
  );
}

type CheckboxProps = Omit<FieldBase, "label" | "hint"> & {
  /** 동의 문구처럼 링크를 포함할 수 있다 */
  label: ReactNode;
  name?: string;
  required?: boolean;
  defaultChecked?: boolean;
};

export function Checkbox({ id, label, error, surface = "dark", required, name, defaultChecked }: CheckboxProps) {
  return (
    <div className={styles.checkboxWrap} data-surface={surface}>
      <div className={styles.checkboxRow}>
        <input
          id={id}
          name={name}
          type="checkbox"
          className={styles.checkbox}
          required={required}
          defaultChecked={defaultChecked}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, undefined, error)}
        />
        <label htmlFor={id} className={styles.checkboxLabel}>
          {label}
        </label>
      </div>
      <Messages id={id} error={error} />
    </div>
  );
}

type NoticeKind = "info" | "success" | "error";

/** 폼 아래의 안내·결과 문구. 성공·안내는 role=status, 오류는 role=alert 로 보조기기에 알린다. */
export function FormNotice({ kind = "info", surface = "dark", children }: { kind?: NoticeKind; surface?: Surface; children: ReactNode }) {
  return (
    <p className={styles.notice} data-kind={kind} data-surface={surface} role={kind === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}
