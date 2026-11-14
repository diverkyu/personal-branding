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
  { path: "/freediving/travel", h1: "바다를 만나러" },
  { path: "/freediving/travel/sample-travel-jeju", h1: "여행 제목이 들어갑니다 (제주)" },
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
    for (const path of ["/story/nope", "/freediving/tours/nope", "/freediving/equipment/nope", "/freediving/travel/nope"]) {
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
    expect(await card.locator("blockquote").evaluate((el) => getComputedStyle(el).whiteSpace)).toBe("pre-wrap");
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

test.describe("Films 메뉴·홈 구역·Contact 특강 링크 (7c)", () => {
  test("작품이 있으면 홈에 Films 구역이 보이고 재생 요청 없이 상세로 이어진다", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (r) => {
      if (/youtube|vimeo/.test(r.url())) external.push(r.url());
    });
    await page.goto("/");
    const section = page.getByRole("region", { name: /물속에서 떠올린/ });
    await expect(section).toBeVisible();
    await expect(section.getByRole("link", { name: "Films 전체 보기" })).toHaveAttribute("href", "/films");
    await section.getByRole("link", { name: /보러 가기/ }).click();
    await expect(page).toHaveURL(/\/films\/sample-film$/);
    expect(external).toEqual([]);
  });

  test("Contact 는 05 번호와 특강 소식 메일 링크를 가진다", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByText(/05 \/ LET/)).toBeVisible();
    const link = page.getByRole("link", { name: /AI 영상 특강 소식 요청하기/ });
    expect(decodeURIComponent((await link.getAttribute("href")) ?? "")).toContain("subject=[KYU] AI 특강 소식 요청");
  });
});

test.describe("여행 추천 공개 화면", () => {
  // 시험 서버는 가상 여행 추천 3건이 있다: 제주(입문) · 필리핀 보홀(중급) · 이집트 다합(상급, 확인일 오래됨)
  test("목록: 카드 3개, 지역·난이도 필터가 함께 걸리고 URL 에 남으며, 초기화할 수 있다", async ({ page }) => {
    await page.goto("/freediving/travel");
    const cards = page.getByRole("article");
    await expect(cards).toHaveCount(3);
    await expect(page.getByText(/시기·예산은 작성한 날의 참고 정보/)).toBeVisible();

    await page.getByRole("group", { name: "지역" }).getByRole("button", { name: "제주" }).click();
    await expect(cards).toHaveCount(1);
    await expect(page).toHaveURL(/region=/);

    await page.getByRole("group", { name: "난이도" }).getByRole("button", { name: "상급" }).click();
    await expect(page.getByText("조건에 맞는 여행 추천이 없습니다.")).toBeVisible();
    await page.getByRole("button", { name: "필터 초기화" }).click();
    await expect(cards).toHaveCount(3);
    await expect(page).not.toHaveURL(/region=|level=/);
  });

  test("목록: 모르는 필터 값이 주소에 있으면 전체를 보여 준다", async ({ page }) => {
    await page.goto("/freediving/travel?region=없는지역&level=nope&page=999");
    await expect(page.getByRole("article")).toHaveCount(3);
  });

  test("목록: 오래된 정보는 글자로 알리고 이미지는 쓰지 않는다", async ({ page }) => {
    await page.goto("/freediving/travel");
    await expect(page.getByText("정보 확인일이 오래되었습니다")).toHaveCount(1);
    await expect(page.getByRole("article").locator("img")).toHaveCount(0);
  });

  test("영역 이동 칩에 여행 추천이 있고 현재 위치로 표시된다", async ({ page }) => {
    await page.goto("/freediving/travel");
    const nav = page.getByRole("navigation", { name: "Freediving 영역 이동" });
    await expect(nav.getByRole("link", { name: "여행 추천" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "투어" })).toHaveAttribute("href", "/freediving/tours");
  });

  test("Freediving 허브에 여행 추천 칩·구역이 있고 전체 보기로 이어진다", async ({ page }) => {
    await page.goto("/freediving");
    await expect(page.getByRole("navigation", { name: "Freediving 영역 이동" }).getByRole("link", { name: "여행 추천" })).toBeVisible();
    const section = page.locator("#travel");
    await expect(section.getByRole("article")).toHaveCount(3);
    await section.getByRole("link", { name: "여행 추천 전체 보기" }).click();
    await expect(page).toHaveURL(/\/freediving\/travel$/);
  });

  test("홈에는 여행 추천 구역이 없다 (결정 T-8)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("바다를 만나러")).toHaveCount(0);
  });

  test("메뉴: Freediving 하위에 여행 추천이 있고 최상위 메뉴는 늘지 않는다", async ({ page }) => {
    await page.goto("/");
    // 메뉴 패널은 680px 이하에서 쓴다 (layout.spec.ts 와 같은 기준)
    if ((page.viewportSize()?.width ?? 0) <= 680) {
      await page.getByRole("button", { name: /MENU/ }).click();
      await expect(page.locator("#mobile-menu").getByRole("link", { name: "여행 추천" })).toHaveAttribute("href", "/freediving/travel");
    } else {
      const nav = page.getByRole("navigation", { name: "주 메뉴" });
      await nav.getByRole("link", { name: "Freediving" }).hover();
      await expect(nav.getByRole("link", { name: "여행 추천" })).toBeVisible();
      expect(await nav.locator("> ul > li").count()).toBe(4);
    }
  });

  test("상세: 정보 표·참고 문구·문의 메일, 이전·다음 글", async ({ page }) => {
    await page.goto("/freediving/travel/sample-travel-bohol");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("보홀");
    for (const t of ["지역", "장소", "추천 시기", "난이도"]) await expect(page.getByText(t, { exact: true })).toBeVisible();
    await expect(page.getByText(/참고 정보이며 달라질 수 있습니다/)).toBeVisible();
    const mail = page.getByRole("link", { name: "메일로 문의하기" });
    const href = decodeURIComponent((await mail.getAttribute("href")) ?? "");
    expect(href).toContain("subject=[KYU] 여행 문의");
    expect(href).not.toContain("보홀");
    // 목록 순서: 제주 → 보홀 → 다합 (최신순). 보홀은 가운데라 이전·다음이 모두 있다
    await expect(page.getByRole("navigation", { name: "이전·다음 글" })).toContainText("이전 글");
    await expect(page.getByRole("navigation", { name: "이전·다음 글" })).toContainText("다음 글");
  });

  test("상세: 오래된 정보는 경고 띠가 보인다", async ({ page }) => {
    await page.goto("/freediving/travel/sample-travel-old");
    await expect(page.getByText("정보가 오래되었을 수 있습니다")).toBeVisible();
    await page.goto("/freediving/travel/sample-travel-jeju");
    await expect(page.getByText("정보가 오래되었을 수 있습니다")).toHaveCount(0);
  });

  test("사이트맵에 여행 추천 주소가 있다", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).toContain("/freediving/travel/sample-travel-jeju");
    expect(xml).toContain("/freediving/travel<");
  });
});
