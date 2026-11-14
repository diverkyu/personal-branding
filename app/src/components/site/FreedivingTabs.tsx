import Link from "next/link";
import styles from "./AreaNav.module.css";

const TABS = [
  { href: "/freediving/tours", label: "투어" },
  { href: "/freediving/equipment", label: "장비 추천" },
  { href: "/freediving/reviews", label: "수강 후기" },
  { href: "/freediving/travel", label: "여행 추천" },
] as const;

/** Freediving 하위 목록 화면의 영역 이동 칩 (TRAVEL-01). 허브의 AreaNav 와 모양이 같고, 다른 화면으로 이동한다 */
export function FreedivingTabs({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <nav className={styles.nav} aria-label="Freediving 영역 이동">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.href === current ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
