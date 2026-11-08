import { expect, test, type Page } from "@playwright/test";

// 배포된 사이트 스모크 시험: 열림, 보안·색인 헤더, 주요 화면, 폼 저장, (선택) 함수 지역.
const REMOTE = process.env.REMOTE_URL;
test.skip(!REMOTE, "REMOTE_URL 을 지정하세요. 예: REMOTE_URL=https://example.vercel.app npm run test:remote");

const base = REMOTE ? new URL(REMOTE) : new URL("http://localhost");

/** 공유 링크의 쿼리(접근 허용용)를 모든 이동에 붙인다 */
function url(path: string): string {
  const u = new URL(path, base.origin);
  base.searchParams.forEach((v, k) => u.searchParams.set(k, v));
  return u.toString();
}

async function open(page: Page, path: string) {
  return page.goto(url(path));
}

test("홈이 열리고 제목이 보인다", async ({ page }) => {
  const res = await open(page, "/");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Dive deeper.");
});

test("색인 금지(noindex)와 기본 보안 헤더", async ({ request }) => {
  const res = await request.get(url("/"));
  expect(res.status()).toBe(200);
  const h = res.headers();
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["x-powered-by"]).toBeUndefined();
  const html = await res.text();
  expect(html).toMatch(/<meta name="robots" content="noindex/);
});

test("robots.txt 는 모두 막고, 개발용 쇼케이스는 열리지 않는다", async ({ request }) => {
  const robots = await (await request.get(url("/robots.txt"))).text();
  expect(robots).toContain("Disallow: /");
  expect((await request.get(url("/dev/components"))).status()).toBe(404);
});

test("주요 화면이 모두 열린다", async ({ request }) => {
  for (const path of ["/about", "/story", "/story/waiting-for-the-first-breath", "/freediving", "/freediving/tours", "/freediving/tours/sample-recruiting", "/freediving/equipment", "/freediving/reviews", "/contact", "/privacy", "/sitemap.xml"]) {
    expect((await request.get(url(path))).status(), path).toBe(200);
  }
  expect((await request.get(url("/no-such-page"))).status()).toBe(404);
});

test("모집 중 투어에 예약 문의를 제출하면 접수 안내가 나온다 (가짜 데이터)", async ({ page }) => {
  const email = `smoke-${Date.now()}@example.com`;
  const postRegions: string[] = [];
  page.on("response", (r) => {
    if (r.request().method() === "POST") {
      const id = r.headers()["x-vercel-id"];
      if (id) postRegions.push(id);
    }
  });
  await open(page, "/freediving/tours/sample-recruiting");
  await page.getByLabel(/^이름/).fill("원격확인");
  await page.getByLabel(/^연락처/).fill("010-0000-0000");
  await page.getByLabel(/^이메일/).fill(email);
  await page.getByLabel(/^인원/).fill("2");
  await page.getByLabel(/^개인정보/).check();
  await page.getByRole("button", { name: "예약 문의하기" }).click();
  await expect(page.getByRole("status").filter({ hasText: "문의가 접수되었습니다." })).toBeVisible({ timeout: 15_000 });

  const expected = process.env.REMOTE_EXPECT_REGION;
  if (expected) {
    // x-vercel-id 형식: "<엣지 지역>::<함수 지역>::<요청 id>" — 함수가 실행된 두 번째 지역을 확인한다
    expect(postRegions.length, "폼 요청의 x-vercel-id 를 찾지 못했습니다").toBeGreaterThan(0);
    expect(postRegions[0]?.split("::")[1]).toBe(expected);
  }
});
