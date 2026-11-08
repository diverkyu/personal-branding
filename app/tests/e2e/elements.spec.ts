import { expect, test } from "@playwright/test";

// 6단계(미구현 화면 요소): 페이지 이동, 더 보기, 갤러리 확대, 영상, 장비 이미지, 모바일 고정 버튼, 영역 강조, 구조화 데이터, robots·sitemap.
const isMobile = (page: import("@playwright/test").Page) => (page.viewportSize()?.width ?? 0) <= 680;

test.describe("페이지 이동·더 보기", () => {
  test("Story: 12건이면 큰 카드 + 9건 / 2페이지에 2건, URL 에 남고 필터를 바꾸면 1페이지로", async ({ page }) => {
    await page.goto("/story");
    const pager = page.getByRole("navigation", { name: "페이지 이동" });
    await expect(pager).toBeVisible();
    await expect(page.locator("main article")).toHaveCount(10); // 큰 카드 1 + 9
    await expect(pager.getByRole("button", { name: "1페이지" })).toHaveAttribute("aria-current", "page");
    await expect(pager.getByRole("button", { name: "이전" })).toBeDisabled();

    await pager.getByRole("button", { name: "다음" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator("main article")).toHaveCount(2); // 큰 카드는 1페이지에만
    await expect(pager.getByRole("button", { name: "2페이지" })).toHaveAttribute("aria-current", "page");
    await expect(pager.getByRole("button", { name: "다음" })).toBeDisabled();

    await page.reload();
    await expect(pager.getByRole("button", { name: "2페이지" })).toHaveAttribute("aria-current", "page");

    await page.getByRole("button", { name: "창작", exact: true }).click();
    await expect(page).not.toHaveURL(/page=/);
  });

  test("범위를 벗어난 page 값은 마지막 페이지로 맞춘다", async ({ page }) => {
    await page.goto("/story?page=99");
    await expect(page.getByRole("navigation", { name: "페이지 이동" }).getByRole("button", { name: "2페이지" })).toHaveAttribute("aria-current", "page");
    await page.goto("/story?page=abc");
    await expect(page.getByRole("navigation", { name: "페이지 이동" }).getByRole("button", { name: "1페이지" })).toHaveAttribute("aria-current", "page");
  });

  test("후기: 12건씩 보이고 '더 보기'로 나머지를 펼친다", async ({ page }) => {
    await page.goto("/freediving/reviews");
    await expect(page.locator("main figure")).toHaveCount(12);
    await page.getByRole("button", { name: "더 보기" }).click();
    await expect(page.locator("main figure")).toHaveCount(14);
    await expect(page.getByRole("button", { name: "더 보기" })).toHaveCount(0);
  });
});

test.describe("갤러리 확대 (INT-08)", () => {
  test("열기·좌우 이동·포커스 가둠·ESC 닫기와 포커스 복귀", async ({ page }) => {
    await page.goto("/freediving/tours/sample-ended-1");
    const trigger = page.getByRole("button", { name: "예시 사진 2: 호흡 연습 확대" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: /확대 보기/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "닫기" })).toBeFocused();
    await expect(dialog.getByText("2 / 4")).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");

    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByText("3 / 4")).toBeVisible();
    await expect(dialog.getByRole("img", { name: "예시 사진 3: 물속" })).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(dialog.getByText("1 / 4")).toBeVisible();

    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"))).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "예시 사진 2: 호흡 연습 확대" })).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  });
});

test.describe("영상 (INT-09)", () => {
  test("누르기 전에는 외부 요청이 없고, 누르면 허용 도메인 iframe 이 열린다", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (r) => {
      const host = new URL(r.url()).hostname;
      if (host.includes("youtube") || host.includes("ytimg") || host.includes("vimeo")) external.push(r.url());
    });
    await page.goto("/freediving/tours/sample-ended-1");
    await page.waitForLoadState("load");
    await page.waitForTimeout(800);
    expect(external).toEqual([]);
    await expect(page.locator("iframe")).toHaveCount(0);

    const fallback = page.getByRole("link", { name: /원본에서 보기/ });
    await expect(fallback).toHaveAttribute("target", "_blank");
    await expect(fallback).toHaveAttribute("rel", /noopener/);

    await page.getByRole("button", { name: /스케치 영상 1 재생/ }).click();
    const frame = page.locator("iframe");
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute("src", /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
    await expect(frame).toHaveAttribute("sandbox", /allow-scripts/);
  });
});

test.describe("장비 이미지 (EQ-D01)", () => {
  test("작은 이미지를 누르면 큰 이미지가 바뀌고 선택이 aria-pressed 로 표시된다", async ({ page }) => {
    await page.goto("/freediving/equipment/sample-mask");
    await expect(page.getByRole("img", { name: "마스크 예시 A 대표 이미지" })).toBeVisible();
    const second = page.getByRole("button", { name: "예시 이미지: 측면" });
    await expect(second).toHaveAttribute("aria-pressed", "false");
    await second.click();
    await expect(second).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("img", { name: "예시 이미지: 측면" }).first()).toBeVisible();
  });
});

test.describe("모바일 고정 문의 버튼 (INT-11)", () => {
  test("모집 중 투어에서 폼이 안 보일 때만 보이고, 폼이 보이면 사라진다 (모바일)", async ({ page }) => {
    test.skip(!isMobile(page), "680px 이하에서만");
    await page.goto("/freediving/tours/sample-recruiting");
    const bar = page.getByRole("link", { name: "예약 문의하기" }).first();
    await expect(bar).toBeVisible();
    await page.locator("#inquiry").scrollIntoViewIfNeeded();
    await expect(page.locator("a[href='#inquiry']")).toBeHidden();
    await page.goto("/freediving/tours/sample-closed");
    await expect(page.locator("a[href='#inquiry']")).toHaveCount(0);
  });

  test("넓은 화면에서는 보이지 않는다", async ({ page }) => {
    test.skip(isMobile(page), "넓은 화면에서만");
    await page.goto("/freediving/tours/sample-recruiting");
    await expect(page.locator("a[href='#inquiry']")).toBeHidden();
  });
});

test.describe("Freediving 영역 강조 (FD-02)", () => {
  test("스크롤하면 지금 보이는 영역의 칩이 현재로 표시된다", async ({ page }) => {
    await page.goto("/freediving");
    const nav = page.getByRole("navigation", { name: "Freediving 영역 이동" });
    await expect(nav.getByRole("link", { name: "투어" })).toHaveAttribute("aria-current", "true");
    await page.locator("#equipment").scrollIntoViewIfNeeded();
    await page.evaluate(() => document.getElementById("equipment")?.scrollIntoView({ block: "start" }));
    await expect(nav.getByRole("link", { name: "장비 추천" })).toHaveAttribute("aria-current", "true");
    await expect(nav.getByRole("link", { name: "투어" })).not.toHaveAttribute("aria-current", "true");
  });
});

test.describe("구조화 데이터·robots·sitemap", () => {
  test("홈은 WebSite, 글은 Article, 투어는 Event 를 담고 JSON 으로 해석된다", async ({ page }) => {
    const types = async (path: string) => {
      await page.goto(path);
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      return blocks.map((b) => JSON.parse(b)["@type"]);
    };
    expect(await types("/")).toContain("WebSite");
    expect(await types("/story/a-quiet-morning")).toEqual(expect.arrayContaining(["Article", "BreadcrumbList"]));
    expect(await types("/freediving/tours/sample-recruiting")).toEqual(expect.arrayContaining(["Event", "BreadcrumbList"]));
  });

  test("색인이 꺼져 있으면 robots.txt 는 모두 막는다", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("Disallow: /");
    expect(body).not.toContain("Sitemap");
  });

  test("sitemap.xml 에 공개 주소가 있고 개발용·어드민 주소는 없다", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("/story/waiting-for-the-first-breath");
    expect(body).toContain("/freediving/tours/sample-recruiting");
    expect(body).not.toContain("/dev/");
    expect(body).not.toContain("/admin");
  });
});
