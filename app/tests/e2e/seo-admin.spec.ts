import { expect, test } from "@playwright/test";
for (const section of ["overview", "performance", "indexing", "diagnostics", "journal", "connections"]) {
  test(`SEO ${section} 비로그인 접근 차단`, async ({ page }) => {
    await page.goto(`/admin/seo/${section}`);
    expect(page.url()).toContain("/admin/login");
    await expect(page.getByRole("heading", { level: 1, name: "로그인" })).toBeVisible();
  });
}
test("SEO 크론은 인증 없이 데이터를 수집하지 않는다", async ({ request }) => {
  const response = await request.get("/api/cron/seo", { headers: { authorization: "Bearer forged" } });
  expect([401, 404]).toContain(response.status());
  expect(await response.text()).toBe("");
});
