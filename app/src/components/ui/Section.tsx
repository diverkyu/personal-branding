import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Section.module.css";

export type SectionTone = "dark" | "light" | "teal";

interface SectionProps {
  tone?: SectionTone;
  /** 하위 섹션(위아래 여백 100px)이면 true */
  sub?: boolean;
  id?: string;
  /** 섹션 제목을 가리키는 요소의 id (스크린리더용 이름) */
  labelledBy?: string;
  className?: string;
  children: ReactNode;
}

/** 배경색, 위아래·좌우 여백, 본문 최대 폭을 정한다. 어두운/밝은 섹션을 교차해 읽는 리듬을 만든다. */
export function Section({ tone = "dark", sub = false, id, labelledBy, className, children }: SectionProps) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cx(styles.section, className)} data-tone={tone} data-sub={sub || undefined}>
      <div className={styles.container}>{children}</div>
    </section>
  );
}
