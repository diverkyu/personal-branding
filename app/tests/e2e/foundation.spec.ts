import { expect, test } from "@playwright/test";

// 1단계(기반) 확인: 3개 화면 폭에서 같은 시나리오를 실행한다.
test.describe("기반", () => {
  test("홈이 뜨고 제목이 보인다", async ({ page }, testInfo) => {
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

  // 같은 내용이 여러 주소(임시 주소, www 유무, ?필터)로 열려도 검색엔진이 한 주소로 모으도록 (SEO-GEO §3)
  for (const path of ["/", "/about", "/story", "/freediving", "/freediving/tours", "/freediving/reviews", "/contact", "/privacy"]) {
    test(`정규 주소는 자기 주소이고 공유 미리보기에 사이트 이름이 있다: ${path}`, async ({ page }) => {
      await page.goto(`${path}${path === "/" ? "" : "?status=past"}`);
      const href = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(new URL(href!).pathname).toBe(path);
      expect(href).not.toContain("?");
      await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "KYU");
      await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "ko_KR");
    });
  }

  test("About 과 홈에 인물 구조화 데이터가 있고 이메일은 없다", async ({ page }) => {
    for (const path of ["/", "/about"]) {
      await page.goto(path);
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      const person = blocks.map((b) => JSON.parse(b) as Record<string, unknown>).find((d) => d["@type"] === "Person");
      expect(person, path).toMatchObject({ name: "이동규", alternateName: "KYU" });
      expect(JSON.stringify(person)).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    }
  });

  test("파비콘이 있어 브라우저가 404 를 내지 않는다", async ({ page, request }) => {
    await page.goto("/");
    const href = await page.locator('link[rel~="icon"]').first().getAttribute("href");
    expect(href).toBeTruthy();
    const response = await request.get(href!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/svg+xml");
  });

  test("홈 화면 추가: manifest·아이콘·iPhone 설정이 연결되고 파일이 열린다 (GL-M)", async ({ page, request }) => {
    await page.goto("/");
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const res = await request.get(manifestHref!);
    expect(res.status()).toBe(200);
    const manifest = (await res.json()) as { display: string; start_url: string; icons: { src: string; type: string }[] };
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    for (const icon of manifest.icons) {
      const r = await request.get(icon.src);
      expect(r.status(), icon.src).toBe(200);
      expect(r.headers()["content-type"]).toContain("image/png");
    }
    const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
    expect((await request.get(apple!)).status()).toBe(200);
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "KYU");
  });

  test("없는 주소는 404 를 돌려준다", async ({ request }) => {
    const response = await request.get("/this-page-does-not-exist");
    expect(response.status()).toBe(404);
  });
});
