import { expect, test } from "@playwright/test";

/**
 * 어드민 접근 통제 (AD-1, SEC-01). E2E 서버는 DB·인증 키 없이 뜨므로 "설정되지 않음" 상태다:
 * 이 상태에서도 어드민은 닫혀 있어야 하고 인증 입구가 열려 있으면 안 된다.
 * 실제 로그인·2차 인증 흐름은 단위 통합 시험(src/lib/auth/auth.test.ts)과 개발 DB 수동 확인으로 본다.
 */
test.describe("어드민 접근 통제", () => {
  for (const path of ["/admin", "/admin/users", "/admin/setup-2fa", "/admin/anything", "/admin/inquiries", "/admin/inquiries/00000000-0000-4000-8000-000000000000", "/admin/audit", "/admin/settings", "/admin/legal", "/admin/media"]) {
    test(`비로그인으로 ${path} 를 열면 로그인 화면으로 간다`, async ({ page }) => {
      const response = await page.goto(path);
      expect(page.url()).toContain("/admin/login");
      expect(response?.status()).toBeLessThan(400);
      await expect(page.getByRole("heading", { level: 1, name: "로그인" })).toBeVisible();
    });
  }

  test("비로그인으로 신청 CSV 내보내기를 요청하면 데이터 없이 로그인으로 보낸다", async ({ request }) => {
    const res = await request.get("/admin/inquiries/export", { maxRedirects: 0 });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.status()).toBeLessThan(400);
    expect(res.headers()["location"]).toContain("/admin/login");
    expect(res.headers()["content-type"] ?? "").not.toContain("text/csv");
  });

  test("가짜 세션 쿠키로는 어드민이 열리지 않는다 (프록시만 믿지 않는다)", async ({ page, context }) => {
    await context.addCookies([{ name: "better-auth.session_token", value: "forged.value", url: "http://127.0.0.1:3100" }]);
    await page.goto("/admin/inquiries");
    expect(page.url()).toContain("/admin/login");
    await expect(page.getByRole("heading", { level: 1, name: "로그인" })).toBeVisible();
    const forgedExport = await page.request.get("/admin/inquiries/export", { maxRedirects: 0, failOnStatusCode: false });
    expect(forgedExport.headers()["content-type"] ?? "").not.toContain("text/csv");
  });

  test("설정되지 않은 어드민은 로그인 폼 대신 안내를 보여 주고, 인증 입구는 404 다", async ({ page, request }) => {
    await page.goto("/admin/login");
    await expect(page.getByText("어드민이 아직 설정되지 않았습니다")).toBeVisible();
    await expect(page.getByLabel("비밀번호")).toHaveCount(0);
    for (const path of ["/api/auth/get-session", "/api/auth/sign-in/email"]) {
      const res = path.includes("sign-in") ? await request.post(path, { data: { email: "a@example.com", password: "x".repeat(12) }, headers: { origin: "http://127.0.0.1:3100" } }) : await request.get(path);
      expect(res.status()).toBe(404);
    }
    // 가입 경로도 없다
    const signUp = await request.post("/api/auth/sign-up/email", { data: { email: "a@example.com", password: "x".repeat(12), name: "x" }, headers: { origin: "http://127.0.0.1:3100" } });
    expect(signUp.status()).toBe(404);
  });

  test("어드민 응답은 캐시되지 않고 색인에서 제외되며 공개 사이트 머리글이 없다", async ({ page, request }) => {
    const res = await request.get("/admin/login");
    expect(res.headers()["cache-control"]).toContain("no-store");
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
    await page.goto("/admin/login");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("link", { name: "KYU 홈" })).toHaveCount(0);
    await expect(page.locator("main")).toHaveCount(1);
  });

  test("로그인 화면에 가로 넘침이 없다", async ({ page }) => {
    await page.goto("/admin/login");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("개발 전용 이미지 주소는 운영 빌드에서 열리지 않는다", async ({ request }) => {
    for (const path of ["/media-dev/2026/11/" + "a".repeat(32) + ".webp", "/media-dev/2026/11/../../../.env.local"]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });

  test("공개 사이트의 머리글·꼬리말은 그대로다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "KYU 홈" }).first()).toBeVisible();
    await expect(page.locator("main#main")).toHaveCount(1);
  });
});
