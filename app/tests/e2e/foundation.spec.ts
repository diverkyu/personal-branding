import { expect, test } from "@playwright/test";

// 1단계(기반) 확인: 3개 화면 폭에서 같은 시나리오를 실행한다.
test.describe("기반", () => {
  test("임시 홈이 뜨고 제목이 보인다", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Dive deeper.");
    await expect(page.getByText("바다에서는 더 깊이,")).toBeVisible();
    await page.screenshot({ path: `artifacts/foundation-home-${testInfo.project.name}.png`, fullPage: true });
  });

  test("가로 넘침(글자 잘림의 원인)이 없다", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("디자인 토큰과 글꼴 변수가 적용된다", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);
      return {
        navy: root.getPropertyValue("--kyu-navy").trim(),
        lime: root.getPropertyValue("--kyu-lime").trim(),
        bodyBg: body.backgroundColor,
        fontVars: Object.fromEntries(["--font-dm-sans", "--font-noto-kr", "--font-lora"].map((v) => [v, root.getPropertyValue(v).trim() !== ""])),
        bodyFont: body.fontFamily,
      };
    });
    expect(result.navy).toBe("#071e29");
    expect(result.lime).toBe("#d6f48a");
    expect(result.bodyBg).toBe("rgb(7, 30, 41)");
    expect(result.fontVars).toEqual({ "--font-dm-sans": true, "--font-noto-kr": true, "--font-lora": true });
    expect(result.bodyFont).toMatch(/DM_Sans|DM Sans/i);
  });

  test("글꼴을 외부 Google 서버에서 불러오지 않는다", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      const host = new URL(request.url()).hostname;
      if (host.endsWith("googleapis.com") || host.endsWith("gstatic.com")) external.push(request.url());
    });
    await page.goto("/");
    await page.waitForLoadState("load");
    await page.waitForTimeout(1500); // 글꼴 요청이 늦게 나가는 경우를 기다린다 (networkidle 은 미리 불러오기 요청 때문에 끝나지 않을 수 있음)
    expect(external).toEqual([]);
  });
});

test.describe("보안 기본값", () => {
  test("기본 보안 헤더가 있고 X-Powered-By 는 없다", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("공개 전에는 검색엔진 색인을 허용하지 않는다", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("파비콘이 있어 브라우저가 404 를 내지 않는다", async ({ page, request }) => {
    await page.goto("/");
    const href = await page.locator('link[rel~="icon"]').first().getAttribute("href");
    expect(href).toBeTruthy();
    const response = await request.get(href!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/svg+xml");
  });

  test("없는 주소는 404 를 돌려준다", async ({ request }) => {
    const response = await request.get("/this-page-does-not-exist");
    expect(response.status()).toBe(404);
  });
});
