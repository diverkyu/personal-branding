import { expect, test, type Page } from "@playwright/test";

// 3단계(레이아웃): 헤더·푸터·건너뛰기 링크·404. 아직 About 등 페이지가 없으므로 존재하는 / 와 없는 경로(404)로 확인한다.
const MOBILE_MAX = 680;

async function isMobile(page: Page) {
  return (page.viewportSize()?.width ?? 0) <= MOBILE_MAX;
}

async function clippedInChrome(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll<HTMLElement>("header *, footer *").forEach((el) => {
      if (el.closest("svg") || el.offsetParent === null) return;
      const style = getComputedStyle(el);
      if (el.scrollWidth - el.clientWidth > 1 && style.display !== "inline" && style.overflowX !== "auto") {
        out.push(`${el.tagName.toLowerCase()}.${el.className} (${el.scrollWidth}>${el.clientWidth})`);
      }
    });
    return out;
  });
}

test.describe("공통 레이아웃", () => {
  test("가로 넘침과 글자 잘림이 없고 캡처를 남긴다", async ({ page }, testInfo) => {
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    expect(await clippedInChrome(page)).toEqual([]);
    await page.screenshot({ path: `artifacts/layout-home-${testInfo.project.name}.png`, fullPage: true });
  });

  test("첫 Tab 은 건너뛰기 링크이고 누르면 본문으로 이동한다", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "본문으로 건너뛰기" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
    await expect(page.locator("main#main")).toBeFocused();
  });

  test("랜드마크와 h1 은 하나씩이다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });

  test("푸터: 저작권 연도·링크·맨 위로", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText(`© ${new Date().getFullYear()} KYU · 이동규`);
    await expect(footer.getByRole("link", { name: "수강 후기 전체 보기" })).toHaveAttribute("href", "/freediving/reviews");
    await expect(footer.getByRole("link", { name: "개인정보 처리방침" })).toHaveAttribute("href", "/privacy");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await footer.getByRole("button", { name: "BACK TO TOP" }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("로고는 홈으로 가며 접근 가능한 이름이 'KYU 홈'이다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("banner").getByRole("link", { name: "KYU 홈" })).toHaveAttribute("href", "/");
  });
});

test.describe("데스크톱 메뉴", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(await isMobile(page), "모바일 폭에서는 메뉴 패널을 쓴다");
  });

  test("메뉴 순서와 Contact 링크, 모바일 버튼은 숨김", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "주 메뉴" });
    const labels = await nav.locator("> ul > li").evaluateAll((items) => items.map((li) => (li.querySelector("a")?.textContent ?? "").trim()));
    expect(labels).toEqual(["About", "Story", "Freediving"]);
    await expect(page.getByRole("banner").getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
    await expect(page.getByRole("button", { name: /MENU/ })).toBeHidden();
  });

  test("Freediving 하위 메뉴: 포커스로 열고 ESC 로 닫는다", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "주 메뉴" });
    const sub = nav.getByRole("link", { name: "투어" });
    await expect(sub).toBeHidden();
    await nav.getByRole("link", { name: "Freediving" }).focus();
    await expect(sub).toBeVisible();
    await expect(nav.getByRole("link", { name: "장비" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "후기" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sub).toBeHidden();
    await expect(nav.getByRole("link", { name: "Freediving" })).toBeFocused();
  });

  test("Freediving 하위 메뉴: 호버로 열리고 벗어나면 짧은 지연 뒤 닫힌다", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "주 메뉴" });
    await nav.getByRole("link", { name: "Freediving" }).hover();
    await expect(nav.getByRole("link", { name: "투어" })).toBeVisible();
    await page.mouse.move(5, 400);
    await expect(nav.getByRole("link", { name: "투어" })).toBeHidden();
  });

  test("토글 버튼으로도 열린다 (aria-expanded)", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Freediving 하위 메뉴" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  // 현재 페이지 표시(aria-current, 라임색)는 메뉴가 가리키는 페이지가 생기는 4단계에서 E2E 로 확인한다.
  // 지금은 /_not-found 로 렌더링되는 404 에서는 어느 항목도 현재가 아니므로 시험할 대상이 없다 (판정 로직은 단위 시험).
});

test.describe("모바일 메뉴 (INT-01)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!(await isMobile(page)), "680px 이하에서만");
  });

  test("열기: 패널이 보이고 포커스가 들어가며 본문 스크롤이 잠긴다", async ({ page }, testInfo) => {
    await page.goto("/");
    const button = page.getByRole("button", { name: "MENU" });
    await expect(page.getByRole("navigation", { name: "주 메뉴" })).toBeHidden();
    expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await button.click();
    const panel = page.getByRole("navigation", { name: "모바일 메뉴" });
    await expect(panel).toBeVisible();
    await expect(page.getByRole("button", { name: "CLOSE" })).toHaveAttribute("aria-expanded", "true");
    await expect(panel.getByRole("link", { name: "About" })).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    for (const name of ["About", "Story", "Freediving", "투어", "장비", "후기", "Contact"]) {
      await expect(panel.getByRole("link", { name })).toBeVisible();
    }
    await page.screenshot({ path: `artifacts/layout-menu-open-${testInfo.project.name}.png` });
  });

  test("포커스가 패널 밖으로 나가지 않는다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "MENU" }).click();
    const inside = () =>
      page.evaluate(() => {
        const active = document.activeElement;
        return !!active && (active.closest("#mobile-menu") !== null || active.closest("header button") !== null);
      });
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      expect(await inside()).toBe(true);
    }
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Shift+Tab");
      expect(await inside()).toBe(true);
    }
  });

  test("ESC 로 닫히고 포커스가 버튼으로 돌아가며 스크롤 잠금이 풀린다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "MENU" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation", { name: "모바일 메뉴" })).toBeHidden();
    await expect(page.getByRole("button", { name: "MENU" })).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  });

  test("바깥(배경) 클릭으로 닫힌다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "MENU" }).click();
    await page.mouse.click(195, 800);
    await expect(page.getByRole("navigation", { name: "모바일 메뉴" })).toBeHidden();
    await expect(page.getByRole("button", { name: "MENU" })).toBeFocused();
  });

  test("항목을 누르면 이동하고 패널이 닫힌다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "MENU" }).click();
    await page.getByRole("navigation", { name: "모바일 메뉴" }).getByRole("link", { name: "Contact" }).click();
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.getByRole("navigation", { name: "모바일 메뉴" })).toBeHidden();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  });
});

test.describe("404 화면", () => {
  test("404 상태와 안내 문구, 홈 링크, 헤더·푸터 유지", async ({ page }, testInfo) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "찾을 수 없는 페이지입니다." })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: /홈으로/ })).toHaveAttribute("href", "/");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await page.screenshot({ path: `artifacts/layout-404-${testInfo.project.name}.png`, fullPage: true });
  });
});
