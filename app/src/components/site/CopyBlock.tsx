"use client";

import { useState } from "react";
import styles from "./CopyBlock.module.css";

/**
 * 복사 상자 — 프롬프트처럼 그대로 복사해 쓰는 글을 보여 주는 칸. 글자는 항상 글자로만 그린다(HTML 해석 없음).
 * 복사 결과는 글자와 aria-live 로 알린다. 복사 권한이 없으면(오래된 브라우저·http) 안내 문구만 바꾼다.
 */
export function CopyBlock({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2500);
  }

  return (
    <div className={styles.box}>
      <div className={styles.bar}>
        <button type="button" className={styles.button} onClick={copy}>
          {state === "copied" ? "복사됨" : "복사"}
        </button>
        <span className={styles.status} role="status" aria-live="polite">
          {state === "copied" ? "클립보드에 복사했습니다." : state === "failed" ? "복사하지 못했습니다. 글을 직접 선택해 복사해 주세요." : ""}
        </span>
      </div>
      <pre className={styles.text} tabIndex={0} aria-label="복사할 글">
        {text}
      </pre>
    </div>
  );
}
