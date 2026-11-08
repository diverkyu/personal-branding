"use client";

import { useEffect, useState } from "react";
import styles from "./MobileInquiryBar.module.css";

/**
 * 모바일 고정 문의 버튼 (TOUR-D13, INT-11). 문의 카드가 화면에 보이거나 푸터가 보이면 사라진다.
 * 모집 중인 투어에서만 만든다. 680px 보다 넓은 화면에서는 CSS 로 숨긴다.
 */
export function MobileInquiryBar({ targetId }: { targetId: string }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    const footer = document.querySelector("footer");
    if (!target || typeof IntersectionObserver === "undefined") return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      }
      setHidden(visible.size > 0);
    });
    observer.observe(target);
    if (footer) observer.observe(footer);
    return () => observer.disconnect();
  }, [targetId]);

  return (
    <div className={styles.bar} data-hidden={hidden || undefined}>
      <a href={`#${targetId}`}>예약 문의하기</a>
    </div>
  );
}
