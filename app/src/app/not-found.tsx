import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import styles from "./status.module.css";

export const metadata: Metadata = { title: "찾을 수 없는 페이지" };

/** 404 (SCREEN-SPEC GL-ST). 비공개·임시저장·삭제된 항목의 주소도 같은 화면을 쓴다. */
export default function NotFound() {
  return (
    <div className={styles.wrap}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>찾을 수 없는 페이지입니다.</h1>
      <div className={styles.actions}>
        <Button href="/" variant="outline" icon="arrow-up-right">
          홈으로
        </Button>
      </div>
    </div>
  );
}
