"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./ContactSection.module.css";

type CopyState = "idle" | "done" | "failed";

/** CONTACT-04·05 / INT-10. 주소를 복사하고 결과를 role=status 로 알린다. 실패하면 직접 복사할 수 있게 주소를 보여 준다. */
export function CopyEmailButton({ email }: { email: string }) {
  const [state, setState] = useState<CopyState>("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setState("done");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className={styles.copy}>
      <button type="button" className={styles.copyButton} onClick={copy}>
        이메일 주소 복사
        <Icon name="copy" size={16} />
      </button>
      <p role="status" className={styles.copyStatus}>
        {state === "done" ? "이메일 주소를 복사했습니다." : null}
        {state === "failed" ? `이 주소를 선택해 복사해주세요: ${email}` : null}
      </p>
    </div>
  );
}
