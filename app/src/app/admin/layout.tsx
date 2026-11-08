import type { Metadata } from "next";
import styles from "./admin.module.css";

/** 어드민은 검색에 나오지 않는다 (SECURITY §12). 응답 캐시 금지와 X-Robots-Tag 는 proxy.ts 와 next.config 가 건다. */
export const metadata: Metadata = {
  title: { absolute: "KYU 어드민" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.root}>{children}</div>;
}
