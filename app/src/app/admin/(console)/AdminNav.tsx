"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../admin.module.css";

/**
 * 어드민 메뉴. 만든 화면만 보여 준다 — 아직 없는 화면(스토리·신청 등)은 만들 때 추가한다 (ADMIN-DESIGN §3.1).
 */
const GROUPS = [
  { title: "홈", items: [{ href: "/admin", label: "대시보드" }] },
  { title: "운영", items: [{ href: "/admin/inquiries", label: "신청·문의" }] },
  {
    title: "사이트",
    items: [
      { href: "/admin/settings", label: "사이트 설정" },
      { href: "/admin/legal", label: "동의·방침" },
    ],
  },
  {
    title: "시스템",
    items: [
      { href: "/admin/audit", label: "활동 기록" },
      { href: "/admin/users", label: "사용자·보안" },
    ],
  },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <>
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className={styles.navGroup}>{group.title}</p>
          {group.items.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink} aria-current={item.href === "/admin" ? (pathname === "/admin" ? "page" : undefined) : pathname === item.href || pathname.startsWith(item.href + "/") ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </>
  );
}
