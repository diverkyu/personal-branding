/** 공개 사이트 메뉴·푸터 링크 (SCREEN-SPEC §4). 라벨과 순서는 고정이다: About → Story → Freediving → Contact. */
export interface NavChild {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href: string;
  /** 데스크톱에서 호버·포커스 시 펼치고, 모바일 패널에서는 항목으로 나열한다 */
  children?: readonly NavChild[];
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: "About", href: "/about" },
  { label: "Story", href: "/story" },
  {
    label: "Freediving",
    href: "/freediving",
    children: [
      { label: "투어", href: "/freediving/tours" },
      { label: "장비", href: "/freediving/equipment" },
      { label: "후기", href: "/freediving/reviews" },
    ],
  },
];

export const CONTACT_ITEM: NavChild = { label: "Contact", href: "/contact" };

export const FOOTER_LINKS: readonly NavChild[] = [
  { label: "수강 후기 전체 보기", href: "/freediving/reviews" },
  { label: "개인정보 처리방침", href: "/privacy" },
];

/** 사이트 설정 > SNS (0~4개). 설정 화면이 생기기 전까지 비어 있다. */
export interface SocialLink {
  label: string;
  href: string;
}
export const SOCIAL_LINKS: readonly SocialLink[] = [];

/** 현재 경로가 이 메뉴 항목에 해당하는지. 하위 경로도 포함한다 (/story/abc → Story). */
export function isCurrentPath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
