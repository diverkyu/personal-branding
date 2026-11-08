import type { ReactNode } from "react";
import styles from "./InfoRow.module.css";

export interface InfoItem {
  label: string;
  value: ReactNode;
}

/** 투어 상세의 정보 행 (일정 / 장소 / 모집 상태 / 정원). 값이 없는 항목은 호출하는 쪽에서 빼고 넘긴다. */
export function InfoRow({ items }: { items: InfoItem[] }) {
  return (
    <dl className={styles.row}>
      {items.map((item) => (
        <div key={item.label} className={styles.item}>
          <dt className={styles.label}>{item.label}</dt>
          <dd className={styles.value}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
