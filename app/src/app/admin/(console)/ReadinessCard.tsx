import Link from "next/link";
import { todoCount, type ReadinessItem } from "@/lib/readiness";
import styles from "../admin.module.css";

const STATUS_TEXT = { todo: "해야 할 일", ok: "완료", info: "참고" } as const;
const WHERE_TEXT = { admin: "어드민에서", vercel: "Vercel 설정", domain: "도메인" } as const;

/** 공개 준비 점검 카드 (대시보드). 상태는 색이 아니라 글자("해야 할 일·완료·참고")로 알린다. 해야 할 일이 있으면 펼쳐 둔다 */
export function ReadinessCard({ items }: { items: ReadinessItem[] }) {
  const left = todoCount(items);
  return (
    <details className={styles.panel} open={left > 0} style={{ marginBottom: 24 }}>
      <summary className={styles.checkSummary}>
        <span className={styles.h2} style={{ margin: 0 }}>
          공개 전 점검
        </span>
        <span className={styles.statusTag} data-status={left > 0 ? "new" : undefined}>
          {left > 0 ? `해야 할 일 ${left}개` : "모두 확인됨"}
        </span>
      </summary>
      <ul className={styles.checkList}>
        {items.map((i) => (
          <li key={i.id} className={styles.checkItem}>
            <span className={styles.checkState}>{STATUS_TEXT[i.status]}</span>
            <div>
              <strong>{i.label}</strong>
              <span className={styles.checkWhere}> · {WHERE_TEXT[i.where]}</span>
              <p className={styles.note} style={{ margin: "4px 0 0" }}>
                {i.detail}{" "}
                {i.href ? (
                  <Link href={i.href} className={styles.linkButton}>
                    열기
                  </Link>
                ) : null}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
