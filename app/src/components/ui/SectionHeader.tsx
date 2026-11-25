import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import type { Surface } from "./types";
import styles from "./SectionHeader.module.css";

/** 홈 섹션의 영역 이름 라벨. 예: "Story". 메뉴 이름을 그대로 쓰고 번호를 붙이지 않는다 (하위 페이지에서는 쓰지 않는다). */
export function SectionLabel({ children, surface = "dark", className }: { children: ReactNode; surface?: Surface; className?: string }) {
  return (
    <p className={cx(styles.label, className)} data-surface={surface}>
      {children}
    </p>
  );
}

/** 제목 크기 단계: h1 72, h2 56, h3 44 (모바일에서는 줄어든다). 의미상 제목 단계(as)와 크기(size)는 따로 정한다. */
export type HeadingSize = "h1" | "h2" | "h3";
type HeadingTag = "h1" | "h2" | "h3" | "h4";

interface SectionHeaderProps {
  title: ReactNode;
  /** 제목 요소의 id. Section 의 labelledBy 와 연결한다 */
  titleId?: string;
  label?: ReactNode;
  description?: ReactNode;
  /** 제목 오른쪽(좁은 화면에서는 아래)에 두는 링크·버튼 */
  action?: ReactNode;
  as?: HeadingTag;
  size?: HeadingSize;
  surface?: Surface;
}

export function SectionHeader({ title, titleId, label, description, action, as: Heading = "h2", size = "h2", surface = "dark" }: SectionHeaderProps) {
  return (
    <header className={styles.header}>
      {label ? <SectionLabel surface={surface}>{label}</SectionLabel> : null}
      <div className={styles.row}>
        <Heading id={titleId} className={styles.title} data-size={size}>
          {title}
        </Heading>
        {description || action ? (
          <div className={styles.side}>
            {description ? (
              <p className={styles.description} data-surface={surface}>
                {description}
              </p>
            ) : null}
            {action}
          </div>
        ) : null}
      </div>
    </header>
  );
}
