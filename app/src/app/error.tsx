"use client";

import { Button } from "@/components/ui/Button";
import styles from "./status.module.css";

/** 서버 오류 (SCREEN-SPEC GL-ST). 오류 상세는 화면에 쓰지 않는다 — 서버 로그(onRequestError)에 digest 와 함께 남는다. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className={styles.wrap} data-digest={error.digest}>
      <p className={styles.code}>ERROR</p>
      <h1 className={styles.title}>문제가 생겼습니다. 잠시 후 다시 시도해주세요.</h1>
      <div className={styles.actions}>
        <Button type="button" variant="outline" onClick={reset}>
          다시 시도
        </Button>
        <Button href="/" variant="outline" icon="arrow-up-right">
          홈으로
        </Button>
      </div>
    </div>
  );
}
