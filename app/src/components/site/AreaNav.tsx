"use client";

import { useEffect, useState } from "react";
import styles from "./AreaNav.module.css";

export interface Area {
  id: string;
  label: string;
}

/** Freediving 허브의 영역 이동 칩 (FD-02). 스크롤 위치에 따라 지금 보이는 영역을 강조한다. */
export function AreaNav({ areas }: { areas: Area[] }) {
  const [current, setCurrent] = useState(areas[0]?.id);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        let best: string | undefined;
        let bestRatio = 0;
        for (const [id, r] of ratios) if (r > bestRatio) [best, bestRatio] = [id, r];
        if (best) setCurrent(best);
      },
      { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1], rootMargin: "-92px 0px 0px 0px" },
    );
    for (const a of areas) {
      const el = document.getElementById(a.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [areas]);

  return (
    <nav className={styles.nav} aria-label="Freediving 영역 이동">
      {areas.map((a) => (
        <a key={a.id} href={`#${a.id}`} aria-current={a.id === current ? "true" : undefined} onClick={() => setCurrent(a.id)}>
          {a.label}
        </a>
      ))}
    </nav>
  );
}
