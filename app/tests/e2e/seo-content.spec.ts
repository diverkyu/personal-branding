import { expect, test } from "@playwright/test";

const sections = ["/", "/about", "/story", "/freediving", "/freediving/tours", "/freediving/equipment", "/freediving/reviews", "/freediving/travel", "/films", "/contact", "/privacy"];

test("페이지 설명·공유 이미지·canonical·프리뷰 차단을 실제 HTML에서 확인한다", async ({ page, request, baseURL }) => {
  test.setTimeout(90_000);
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const path of sections) {
    const response = await page.goto(`${path}?utm_source=seo-test`);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
    await expect(page.locator("h1")).toHaveCount(1);
    const title = await page.title();
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(titles.has(title), path).toBe(false);
    expect(descriptions.has(description!), path).toBe(false);
    expect(description!.length, path).toBeGreaterThanOrEqual(40);
    expect(description!.length, path).toBeLessThanOrEqual(160);
    titles.add(title);
    descriptions.add(description!);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", path === "/" ? baseURL! : `${baseURL}${path}`);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", title);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", description!);
    await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute("content", description!);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `${baseURL}/images/kyu-share.png`);
    const withoutAlt = await page.locator("main img:not([alt])").count();
    expect(withoutAlt, path).toBe(0);
  }
  const image = await request.get("/images/kyu-share.png");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
});

test("작성자·자격 표시와 모든 상세 유형을 세 화면 폭에서 검수한다", async ({ page }, testInfo) => {
  const cases = [
    { path: "/about", label: "about", byline: false },
    { path: "/story/waiting-for-the-first-breath", label: "story", byline: true },
    { path: "/films/sample-film", label: "film", byline: true },
    { path: "/freediving/travel/sample-travel-jeju", label: "travel", byline: true },
  ];
  for (const item of cases) {
    await page.goto(item.path);
    if (item.byline) await expect(page.locator('main a[rel="author"]')).toHaveText("이동규 (KYU)");
    else {
      await expect(page.getByText("2024년부터 프리다이빙을 가르치고 있습니다.")).toBeVisible();
      await expect(page.getByText("AIDA 마스터 강사 (Master Instructor)")).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `artifacts/seo-${item.label}-${testInfo.project.name}.png`, fullPage: true });
    const objects = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = objects.map((text) => JSON.parse(text));
    expect(parsed.length).toBeGreaterThan(0);
    if (item.byline) {
      const content = parsed.find((entry) => entry["@type"] === "Article" || entry["@type"] === "VideoObject");
      expect(content.author["@id"]).toMatch(/\/about#person$/);
      expect(content.author.url).toMatch(/\/about$/);
    }
  }
});
