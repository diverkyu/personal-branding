"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * 공개 사이트의 머리글·꼬리말·본문 틀. 어드민(/admin)은 자기 틀을 쓰므로 여기서는 본문만 그대로 내보낸다.
 * 머리글·꼬리말은 서버 컴포넌트로 만들어 받는다 (클라이언트 번들에 들어가지 않는다).
 */
export function SiteFrame({ skip, header, footer, children }: { skip: ReactNode; header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return <>{children}</>;
  return (
    <>
      {skip}
      {header}
      {/* 모든 화면의 본문. 건너뛰기 링크의 목적지이며 h1 은 화면마다 하나다 */}
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      {footer}
    </>
  );
}
