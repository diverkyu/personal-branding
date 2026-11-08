import { cx } from "@/lib/cx";
import type { Surface } from "./types";
import styles from "./StatusBadge.module.css";

/** 투어 모집 상태와 어드민 상태. 한 곳에서 이름과 문구를 정한다 (SCREEN-SPEC §7.5). */
export const STATUS_LABELS = {
  recruiting: "모집 중",
  upcoming: "모집 예정",
  closed: "마감",
  ended: "종료",
  published: "발행",
  draft: "임시저장",
  new: "신규",
} as const;

export type StatusKind = keyof typeof STATUS_LABELS;

/** 눈에 띄는(채워진) 상태와 조용한(테두리) 상태 */
const FILLED: ReadonlySet<StatusKind> = new Set(["recruiting", "published", "new"]);

interface StatusBadgeProps {
  status: StatusKind;
  surface?: Surface;
  className?: string;
}

/** 상태는 색만이 아니라 항상 글자로도 표시한다. */
export function StatusBadge({ status, surface = "dark", className }: StatusBadgeProps) {
  return (
    <span className={cx(styles.badge, className)} data-tone={FILLED.has(status) ? "filled" : "outline"} data-status={status} data-surface={surface}>
      {STATUS_LABELS[status]}
    </span>
  );
}
