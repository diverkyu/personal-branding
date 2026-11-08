import { expect, test, type Page } from "@playwright/test";

// 4단계(페이지 틀): 모든 공개 화면이 열리고, 구조·넘침·콘솔 오류를 3개 폭에서 확인한다. 콘텐츠는 가상 데이터다.
const ROUTES = [
  { path: "/", h1: "Dive deeper." },
  { path: "/about", h1: "서로 다른 두 세계." },
  { path: "/story", h1: "한 호흡 사이에" },
  { path: "/story/waiting-for-the-first-breath", h1: "첫 호흡을 기다리는 시간" },
  { path: "/freediving", h1: "처음 물에 들어가는 날." },
  { path: "/freediving/tours", h1: "투어" },
  { path: "/freediving/tours/sample-recruiting", h1: "입문 프리다이빙 투어" },
  { path: "/freediving/equipment", h1: "제가 추천하는 장비." },
  { path: "/freediving/equipment/sample-mask", h1: "마스크 예시 A" },
  { path: "/freediving/reviews", h1: "함께 물에 들어간 사람들의 이야기." },
  { path: "/contact", h1: "다음 탐험은," },
  { path: "/privacy", h1: "개인정보 처리방침" },
] as const;

async function clipped(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll<HTMLElement>("main *").forEach((el) => {
      if (el.closest("svg") || el.offsetParent === null) return;
      const style = getComputedStyle(el);
      if (style.overflowX === "hidden" && el.children.length === 0 && (el.textContent ?? "").trim() === "") return;
      if (el.scrollWidth - el.clientWidth > 1 && style.overflowX !== "auto" && style.display !== "inline" && !el.closest("[aria-hidden='true']")) {
        out.push(`${el.tagName.toLowerCase()}.${el.className} (${el.scrollWidth}>${el.clientWidth}) "${(el.textContent ?? "").trim().slice(0, 24)}"`);
      }
    });
    return out;
  });
}

test.describe("공개 화면", () => {
  for (const route of ROUTES) {
    test(`${route.path} — 열림, h1 하나, 가로 넘침·글자 잘림·콘솔 오류 없음`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("response", (r) => {
        if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`);
      });

      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);
      await page.waitForLoadState("load");
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(route.h1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      expect(await clipped(page)).toEqual([]);
      const name = route.path === "/" ? "home" : route.path.slice(1).replaceAll("/", "-");
      await page.screenshot({ path: `artifacts/page-${name}-${testInfo.project.name}.png`, fullPage: true });
      expect(errors, errors.join("\n")).toEqual([]);
    });
  }

  test("제목 단계가 건너뛰어지지 않는다 (모든 화면)", async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route.path);
      const levels = await page.evaluate(() => [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => Number(h.tagName[1])));
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i]! - levels[i - 1]!, `${route.path}: ${levels.join(",")}`).toBeLessThanOrEqual(1);
      }
    }
  });

  test("존재하지 않는 글·투어·장비는 404", async ({ request }) => {
    for (const path of ["/story/nope", "/freediving/tours/nope", "/freediving/equipment/nope"]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });

  test("메뉴·푸터의 모든 링크가 열린다", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page.evaluate(() => [...document.querySelectorAll<HTMLAnchorElement>("header a[href^='/'], footer a[href^='/']")].map((a) => a.getAttribute("href") as string));
    for (const href of new Set(hrefs)) {
      expect((await request.get(href)).status(), href).toBe(200);
    }
  });
});

test.describe("메뉴의 현재 페이지 표시", () => {
  test("Story 상세에서 Story 가 현재 항목이고 라임색이다 (데스크톱)", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) <= 680, "모바일은 패널");
    await page.goto("/story/a-quiet-morning");
    const link = page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "Story" });
    await expect(link).toHaveAttribute("data-current");
    expect(await link.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(214, 244, 138)");
  });

  test("Freediving 하위 페이지에서 Freediving 이 현재 항목이다 (데스크톱)", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) <= 680, "모바일은 패널");
    await page.goto("/freediving/equipment");
    const nav = page.getByRole("navigation", { name: "주 메뉴" });
    await expect(nav.getByRole("link", { name: "Freediving" })).toHaveAttribute("data-current");
    await expect(nav.getByRole("link", { name: "Story" })).not.toHaveAttribute("data-current");
  });
});

test.describe("필터와 상태별 화면", () => {
  test("Story 태그 칩: 누르면 목록이 줄고 URL 에 남으며 새로고침해도 유지된다", async ({ page }) => {
    await page.goto("/story");
    const chip = page.getByRole("button", { name: "창작", exact: true });
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await chip.click();
    await expect(page).toHaveURL(/tag=%EC%B0%BD%EC%9E%91/);
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(page.getByRole("button", { name: "창작", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "전체", exact: true }).click();
    await expect(page).not.toHaveURL(/tag=/);
  });

  test("알 수 없는 필터 값은 전체로 처리한다", async ({ page }) => {
    await page.goto("/freediving/equipment?category=없는분류");
    await expect(page.getByRole("button", { name: "전체", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("main article")).toHaveCount(4); // 전체 목록이 모두 보인다
  });

  test("투어 상태별 문의 카드: 모집 중 폼 / 모집 예정 소식 받기 / 마감 안내 / 종료 없음", async ({ page }) => {
    await page.goto("/freediving/tours/sample-recruiting");
    await expect(page.getByRole("form", { name: "예약 문의" })).toBeVisible();
    await expect(page.getByLabel("이름")).toBeVisible();
    await expect(page.getByRole("button", { name: "예약 문의하기" })).toBeEnabled();

    await page.goto("/freediving/tours/sample-upcoming");
    await expect(page.getByRole("form", { name: "소식 받기" })).toBeVisible();
    await expect(page.getByRole("form", { name: "예약 문의" })).toHaveCount(0);

    await page.goto("/freediving/tours/sample-closed");
    await expect(page.getByText("이번 투어는 마감되었습니다.")).toBeVisible();
    await expect(page.getByRole("link", { name: /다음 투어 문의하기/ })).toHaveAttribute("href", "/contact");

    await page.goto("/freediving/tours/sample-ended-1");
    await expect(page.getByRole("heading", { level: 2, name: "예약 문의" })).toHaveCount(0);
  });

  test("장비: 행동 버튼은 장비 설정에 따르고, 외부 링크는 새 탭·rel 이 붙고, 제휴 고지는 제휴 장비에만", async ({ page }) => {
    await page.goto("/freediving/equipment");
    const withLink = page.locator("article", { hasText: "마스크 예시 A" });
    const buy = withLink.getByRole("link", { name: /구매처 보기/ });
    await expect(buy).toHaveAttribute("target", "_blank");
    await expect(buy).toHaveAttribute("rel", /noopener/);
    await expect(withLink.getByText("수수료를 받을 수 있습니다")).toBeVisible();
    await expect(page.locator("article", { hasText: "핀 예시 B" }).getByRole("link", { name: "문의하기" })).toHaveAttribute("href", "/contact");
    await expect(page.locator("article", { hasText: "슈트 예시 C" }).getByRole("link")).toHaveCount(1); // 제목 링크만
    await expect(page.locator("article", { hasText: "스노클 예시 D" }).getByText("수수료")).toHaveCount(0);
  });

  test("후기: 원문 줄바꿈 유지, 평점 없음, 연결 투어 링크", async ({ page }) => {
    await page.goto("/freediving/reviews");
    const card = page.locator("figure", { hasText: "예시 후기 원문입니다." });
    expect(await card.locator("blockquote").evaluate((el) => getComputedStyle(el).whiteSpace)).toBe("pre-line");
    await expect(card.getByRole("link", { name: /입문|여름|초여름/ })).toHaveCount(1);
    await expect(page.getByText(/★|별점|평점/)).toHaveCount(0);
  });
});

test.describe("Contact", () => {
  test("메일 링크, 주소 복사 결과 안내, 문의 유형별 제목", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/contact");
    await expect(page.getByRole("link", { name: "contact@example.com" })).toHaveAttribute("href", "mailto:contact@example.com");
    const topic = page.getByRole("link", { name: /강습·투어 문의/ });
    expect(decodeURIComponent((await topic.getAttribute("href")) ?? "")).toContain("subject=[KYU] 강습·투어 문의");
    await page.getByRole("button", { name: /이메일 주소 복사/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "이메일 주소를 복사했습니다." })).toBeVisible();
  });

  test("복사가 막히면 직접 복사할 수 있게 주소를 보여 준다", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) } });
    });
    await page.goto("/contact");
    await page.getByRole("button", { name: /이메일 주소 복사/ }).click();
    await expect(page.getByText("이 주소를 선택해 복사해주세요: contact@example.com")).toBeVisible();
  });
});
