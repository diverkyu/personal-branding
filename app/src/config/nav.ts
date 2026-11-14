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

/** Films 메뉴. 첫 작품을 공개하기 전에는 보이지 않는다 (SCREEN-SPEC §12.1 결정 10) */
export const FILMS_ITEM: NavItem = { label: "Films", href: "/films" };

/** 여행 추천 하위 메뉴. 첫 글을 공개하기 전에는 보이지 않는다 (SCREEN-SPEC §12.2 결정 T-1·T-2) */
export const TRAVEL_CHILD: NavChild = { label: "여행 추천", href: "/freediving/travel" };

/** 공개 작품이 있으면 Freediving 뒤에 Films 를 붙이고, 공개 여행 추천이 있으면 Freediving 하위에 여행 추천을 붙인다 */
export function navItems(showFilms: boolean, showTravel = false): readonly NavItem[] {
  const base = showTravel
    ? NAV_ITEMS.map((item) => (item.children ? { ...item, children: [...item.children, TRAVEL_CHILD] } : item))
    : NAV_ITEMS;
  return showFilms ? [...base, FILMS_ITEM] : base;
}

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
