"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { Icon } from "./Icon";
import { Messages, describedBy } from "./Field";
import type { Surface } from "./types";
import styles from "./Field.module.css";

type PasswordFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  surface?: Surface;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className" | "type" | "aria-invalid" | "aria-describedby">;

/**
 * 비밀번호 입력. 기본은 가려져 있고, 오른쪽 "비밀번호 보기" 버튼을 누르면 글자로 보인다(제대로 썼는지 확인용).
 * - 버튼은 aria-pressed 로 상태를 알리고, 이름이 상태에 따라 "비밀번호 보기" / "비밀번호 숨기기"로 바뀐다.
 * - 폼을 보내면 다시 가린다. 서버 응답 뒤 화면에 비밀번호가 보이는 채로 남지 않게 하기 위해서다.
 * - 입력값·autocomplete 는 그대로다(브라우저 비밀번호 관리자와 같이 동작한다).
 */
export function PasswordField({ id, label, hint, error, surface = "dark", required, ...rest }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const form = input.current?.form;
    if (!form) return;
    const hide = () => setVisible(false);
    form.addEventListener("submit", hide);
    return () => form.removeEventListener("submit", hide);
  }, []);

  return (
    <div className={styles.field} data-surface={surface}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required ? <span className={styles.required}> (필수)</span> : null}
      </label>
      <div className={styles.inputWrap}>
        <input ref={input} id={id} className={styles.input} type={visible ? "text" : "password"} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} {...rest} />
        <button type="button" className={styles.toggle} aria-pressed={visible} aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"} onClick={() => setVisible((v) => !v)}>
          <Icon name={visible ? "eye-off" : "eye"} size={20} />
        </button>
      </div>
      <Messages id={id} hint={hint} error={error} />
    </div>
  );
}
