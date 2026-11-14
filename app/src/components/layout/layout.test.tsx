import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FOOTER_LINKS, NAV_ITEMS, isCurrentPath, navItems } from "@/config/nav";
import { SiteFooter } from "./SiteFooter";
import { SkipLink } from "./SkipLink";

describe("메뉴 설정", () => {
  it("라벨과 순서가 고정이다: About → Story → Freediving", () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual(["About", "Story", "Freediving"]);
    expect(NAV_ITEMS[2]?.children?.map((c) => c.href)).toEqual(["/freediving/tours", "/freediving/equipment", "/freediving/reviews"]);
  });

  it("Films 는 첫 작품을 공개한 뒤에만 Freediving 뒤에 붙는다", () => {
    expect(navItems(false).map((i) => i.label)).toEqual(["About", "Story", "Freediving"]);
    expect(navItems(true).map((i) => i.label)).toEqual(["About", "Story", "Freediving", "Films"]);
    // 여행 추천은 Freediving 하위에만 붙고, 최상위 메뉴는 늘지 않는다 (결정 T-1)
    const withTravel = navItems(false, true);
    expect(withTravel.map((i) => i.label)).toEqual(["About", "Story", "Freediving"]);
    expect(withTravel.find((i) => i.label === "Freediving")?.children?.map((c) => c.label)).toEqual(["투어", "장비", "후기", "여행 추천"]);
    expect(navItems(false).find((i) => i.label === "Freediving")?.children?.map((c) => c.label)).toEqual(["투어", "장비", "후기"]);
  });

  it("현재 경로 판정은 하위 경로를 포함하되 접두어만 같은 경로는 제외한다", () => {
    expect(isCurrentPath("/story", "/story")).toBe(true);
    expect(isCurrentPath("/story/abc", "/story")).toBe(true);
    expect(isCurrentPath("/storybook", "/story")).toBe(false);
    expect(isCurrentPath("/freediving/tours", "/freediving")).toBe(true);
    expect(isCurrentPath("/about", "/")).toBe(false);
    expect(isCurrentPath("/", "/")).toBe(true);
  });
});

describe("SkipLink", () => {
  it("#main 으로 가는 링크다", () => {
    const html = renderToStaticMarkup(<SkipLink />);
    expect(html).toContain('href="#main"');
    expect(html).toContain("본문으로 건너뛰기");
  });
});

describe("SiteFooter", () => {
  const html = renderToStaticMarkup(<SiteFooter year={2026} />);

  it("저작권 문구에 연도와 이름이 들어간다", () => {
    expect(html.replace(/<!-- -->/g, "")).toContain("© 2026 KYU · 이동규");
  });

  it("후기·개인정보 링크와 맨 위로 버튼이 있다", () => {
    for (const link of FOOTER_LINKS) expect(html).toContain(`href="${link.href}"`);
    expect(html).toContain("BACK TO TOP");
    expect(html).toContain('aria-label="KYU 홈"');
  });
});
