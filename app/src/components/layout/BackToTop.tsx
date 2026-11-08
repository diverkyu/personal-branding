"use client";

import { Icon } from "@/components/ui/Icon";
import styles from "./SiteFooter.module.css";

/** GL-F6. 맨 위로 이동한다. 동작 줄이기 설정에서는 CSS(scroll-behavior)가 즉시 이동으로 바꾼다. */
export function BackToTop() {
  return (
    <button type="button" className={styles.top} onClick={() => window.scrollTo({ top: 0 })}>
      BACK TO TOP
      <Icon name="arrow-up" size={16} />
    </button>
  );
}
