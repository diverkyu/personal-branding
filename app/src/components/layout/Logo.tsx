import Link from "next/link";
import { cx } from "@/lib/cx";
import { siteConfig } from "@/config/site";
import styles from "./Logo.module.css";

/** GL-H1 / GL-F1. ®는 상표 확인 전까지 쓰지 않는다 (TRADEMARK-CHECK). */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cx(styles.logo, className)} aria-label={`${siteConfig.name} 홈`}>
      {siteConfig.name}
    </Link>
  );
}
