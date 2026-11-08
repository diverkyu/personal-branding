import { expect, test, type Page } from "@playwright/test";

// 2단계(공통 컴포넌트): 개발용 쇼케이스 페이지(/dev/components)에서 3개 화면 폭으로 확인한다.
const URL = "/dev/components";

/** 내용이 박스를 넘쳐 잘리는 요소를 찾는다 (모바일 글자 잘림의 원인). 이미지 자리표시처럼 일부러 잘리는 곳은 뺀다. */
async function findClippedElements(page: Page) {
  return page.evaluate(() => {
    const offenders: string[] = [];
    document.querySelectorAll<HTMLElement>("main *").forEach((el) => {
      if (el.closest("svg")) return;
      const style = getComputedStyle(el);
      if (style.overflowX === "hidden" && el.children.length === 0 && el.textContent?.trim() === "") return;
      if (el.scrollWidth - el.clientWidth > 1 && style.overflowX !== "auto" && style.overflowX !== "scroll" && style.display !== "inline") {
        offenders.push(`${el.tagName.toLowerCase()}.${el.className} (${el.scrollWidth}>${el.clientWidth}) "${(el.textContent ?? "").trim().slice(0, 30)}"`);
      }
    });
    return offenders;
  });
}

test.describe("컴포넌트 쇼케이스", () => {
  test("열리고 모든 구역이 보인다 (콘솔 오류 없음)", async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    // 콘솔 메시지에는 주소가 없으므로 실패한 요청의 주소도 함께 남긴다
    page.on("response", (response) => {
      if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`);
    });

    await page.goto(URL);
    await expect(page.getByRole("heading", { level: 1, name: "컴포넌트 쇼케이스" })).toBeVisible();
    for (const name of ["버튼 · 링크 · 칩 · 뱃지", "밝은 배경", "카드 (어두운 배경)", "카드 (밝은 배경)", "폼", "아이콘 (Lucide)"]) {
      await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
    }
    await page.screenshot({ path: `artifacts/components-${testInfo.project.name}.png`, fullPage: true });
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("가로 넘침과 글자 잘림이 없다", async ({ page }) => {
    await page.goto(URL);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await findClippedElements(page)).toEqual([]);
  });

  test("필터 칩은 눌린 칩만 aria-pressed 가 true 이고 결과를 알린다", async ({ page }) => {
    await page.goto(URL);
    const group = page.getByRole("group", { name: "장비 카테고리 (dark)" });
    await expect(group.getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "true");
    await group.getByRole("button", { name: "핀" }).click();
    await expect(group.getByRole("button", { name: "핀" })).toHaveAttribute("aria-pressed", "true");
    await expect(group.getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("filter-status-dark")).toHaveText("선택: 핀");
    // 다른 배경의 그룹은 영향을 받지 않는다
    await expect(page.getByTestId("filter-status-light")).toHaveText("선택: 전체");
  });

  test("키보드 포커스가 보인다 (3px 외곽선)", async ({ page }) => {
    await page.goto(URL);
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      const style = el ? getComputedStyle(el) : null;
      return { tag: el?.tagName, width: style?.outlineWidth, style: style?.outlineStyle };
    });
    expect(outline.tag).toBe("A");
    expect(outline.width).toBe("3px");
    expect(outline.style).toBe("solid");
  });

  test("링크: 외부 링크는 새 탭과 rel, 안쪽 링크는 그대로", async ({ page }) => {
    await page.goto(URL);
    const external = page.getByRole("link", { name: "외부 링크" });
    await expect(external).toHaveAttribute("target", "_blank");
    await expect(external).toHaveAttribute("rel", "noopener noreferrer");
    const shop = page.getByRole("link", { name: "구매처 보기" }).first();
    await expect(shop).toHaveAttribute("rel", "noopener noreferrer");
    await expect(page.getByRole("link", { name: "문의하기" }).first()).not.toHaveAttribute("target", "_blank");
  });

  test("카드: 제목 링크 하나가 카드 전체를 누른다 (stretched link)", async ({ page }) => {
    await page.goto(URL);
    const card = page.locator("article", { hasText: "스토리 제목이 들어갑니다" }).first();
    const title = card.getByRole("link", { name: "스토리 제목이 들어갑니다" });
    const cardBox = await card.boundingBox();
    const linkAfter = await title.evaluate((el) => {
      const after = getComputedStyle(el, "::after");
      return { position: after.position, content: after.content };
    });
    expect(cardBox).not.toBeNull();
    expect(linkAfter.position).toBe("absolute");
    expect(linkAfter.content).not.toBe("none");
  });

  test("장비 카드: 행동 버튼은 카드 링크와 따로 눌린다", async ({ page }) => {
    await page.goto(URL);
    const card = page.locator("article", { hasText: "장비명 (구매처 링크)" });
    const button = card.getByRole("link", { name: "구매처 보기" });
    await expect(button).toBeVisible();
    await button.scrollIntoViewIfNeeded(); // elementFromPoint 는 화면 안의 좌표만 찾는다
    const hit = await button.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const target = document.elementFromPoint(x, y);
      return { ok: target === el || el.contains(target), target: `${target?.tagName}.${target?.className}`, rect: `${Math.round(rect.left)},${Math.round(rect.top)} ${Math.round(rect.width)}x${Math.round(rect.height)}`, viewport: `${innerWidth}x${innerHeight}` };
    });
    expect(hit, JSON.stringify(hit)).toMatchObject({ ok: true });
    await expect(page.locator("article", { hasText: "장비명 (버튼 없음)" }).getByRole("link")).toHaveCount(1);
    await expect(page.getByText("이 링크로 구매하시면 수수료를 받을 수 있습니다.")).toHaveCount(1);
  });

  test("폼: 라벨로 입력을 찾고 오류·동의가 보조기기에 연결된다", async ({ page }) => {
    await page.goto(URL);
    await page.getByLabel("이름", { exact: false }).first().fill("가상 이름");
    const email = page.getByLabel("이메일");
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toHaveAccessibleDescription("이메일 형식을 확인해주세요.");
    const agree = page.getByLabel("개인정보 수집·이용에 동의합니다.");
    await agree.check();
    await expect(agree).toBeChecked();
    await expect(page.getByRole("status").filter({ hasText: "문의가 접수되었습니다." })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "전송하지 못했습니다." })).toBeVisible();
  });

  test("후기 카드는 원문 줄바꿈을 유지하고 별점이 없다", async ({ page }) => {
    await page.goto(URL);
    const quote = page.locator("blockquote").first();
    await expect(quote).toContainText("줄바꿈도");
    expect(await quote.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe("pre-line");
    await expect(page.getByText(/별점|★/)).toHaveCount(0);
  });

  test("아이콘 20개가 모두 그려진다 (글자 기호 대신 SVG)", async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator("ul li svg")).toHaveCount(20);
    await expect(page.getByText(/[↗⧉☰]/)).toHaveCount(0);
  });
});
