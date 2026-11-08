import { expect, test, type Page } from "@playwright/test";

// 5단계(폼): 예약 문의·소식 받기 폼의 검증, 오류 표시, 완료, 허니팟. 서버 저장은 시험용 메모리 저장소(INQUIRY_STORE=memory).
const stamp = Date.now();
const email = (testInfo: { project: { name: string } }, tag: string) => `${tag}-${testInfo.project.name}-${stamp}@example.com`;

async function fillReservation(page: Page, mail: string, over: Record<string, string> = {}) {
  const v = { name: "홍길동", phone: "010-0000-0000", email: mail, people: "2", ...over };
  await page.getByLabel(/^이름/).fill(v.name);
  await page.getByLabel(/^연락처/).fill(v.phone);
  await page.getByLabel(/^이메일/).fill(v.email);
  await page.getByLabel(/^인원/).fill(v.people);
}

test.describe("예약 문의 폼", () => {
  test("빈 제출: 필드별 오류가 입력과 연결되고 첫 오류 필드로 포커스가 간다", async ({ page }) => {
    await page.goto("/freediving/tours/sample-recruiting");
    await page.getByRole("button", { name: "예약 문의하기" }).click();
    const name = page.getByLabel(/^이름/);
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("alert").filter({ hasText: "이름을" })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "연락처를 확인해주세요." })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "개인정보 수집·이용에 동의해주세요." })).toBeVisible();
    // 오류 문구가 입력과 aria-describedby 로 이어진다
    const described = await name.getAttribute("aria-describedby");
    expect(described).toContain("inq-name-error");
  });

  test("일부만 틀리면 입력이 보존되고 틀린 필드만 오류를 보인다", async ({ page }, testInfo) => {
    await page.goto("/freediving/tours/sample-recruiting");
    await fillReservation(page, email(testInfo, "keep"), { phone: "abc" });
    await page.getByRole("button", { name: "예약 문의하기" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "연락처를 확인해주세요." })).toBeVisible();
    await expect(page.getByLabel(/^이름/)).toHaveValue("홍길동");
    await expect(page.getByLabel(/^이메일/)).toHaveValue(email(testInfo, "keep"));
    await expect(page.getByLabel(/^연락처/)).toBeFocused();
  });

  test("정원을 넘는 인원은 서버가 거부한다 (정원 8명)", async ({ page }, testInfo) => {
    await page.goto("/freediving/tours/sample-recruiting");
    await fillReservation(page, email(testInfo, "cap"), { people: "9" });
    await page.getByLabel(/^개인정보/).check();
    await page.getByRole("button", { name: "예약 문의하기" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "인원을 1~8명" })).toBeVisible();
  });

  test("성공: 폼이 완료 안내로 바뀐다", async ({ page }, testInfo) => {
    await page.goto("/freediving/tours/sample-recruiting");
    await fillReservation(page, email(testInfo, "ok"));
    await page.getByLabel("문의 내용").fill("예시 문의입니다.");
    await expect(page.getByText("9 / 1000자")).toBeVisible();
    await page.getByLabel(/^개인정보/).check();
    await page.getByRole("button", { name: "예약 문의하기" }).click();
    await expect(page.getByRole("status").filter({ hasText: "문의가 접수되었습니다." })).toBeVisible();
    await expect(page.getByRole("form", { name: "예약 문의" })).toHaveCount(0);
  });

  test("허니팟이 채워지면 접수되지 않고 일반 실패 안내만 보인다 (차단 사유 노출 없음)", async ({ page }, testInfo) => {
    await page.goto("/freediving/tours/sample-recruiting");
    await fillReservation(page, email(testInfo, "bot"));
    await page.getByLabel(/^개인정보/).check();
    await page.locator('input[name="website"]').evaluate((el: HTMLInputElement) => (el.value = "http://spam.example"));
    await page.getByRole("button", { name: "예약 문의하기" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "전송하지 못했습니다." })).toBeVisible();
    await expect(page.getByText(/허니팟|스팸|차단/)).toHaveCount(0);
    await expect(page.getByText("문의가 접수되었습니다.")).toHaveCount(0);
  });

  test("허니팟 칸은 화면 밖에 있고 보조기기·키보드에 닿지 않는다", async ({ page }) => {
    await page.goto("/freediving/tours/sample-recruiting");
    const field = page.locator('input[name="website"]');
    await expect(field).toHaveAttribute("tabindex", "-1");
    expect(await field.evaluate((el) => el.closest("[aria-hidden='true']") !== null)).toBe(true);
    const box = await field.boundingBox();
    expect(box === null || box.x < 0).toBe(true);
  });
});

test.describe("소식 받기 폼", () => {
  test("모집 예정 투어에서 검증 오류 → 성공", async ({ page }, testInfo) => {
    await page.goto("/freediving/tours/sample-upcoming");
    await page.getByRole("button", { name: "소식 받기" }).click();
    await expect(page.getByLabel(/^이름/)).toBeFocused();
    await expect(page.getByRole("alert").filter({ hasText: "안내 수신에 동의해주세요." })).toBeVisible();

    await page.getByLabel(/^이름/).fill("홍길동");
    await page.getByLabel(/^이메일/).fill(email(testInfo, "notice"));
    await page.getByLabel(/^이 투어의 모집이/).check();
    await page.getByRole("button", { name: "소식 받기" }).click();
    await expect(page.getByRole("status").filter({ hasText: "소식 신청이 접수되었습니다." })).toBeVisible();
  });
});

test.describe("서버 액션 직접 호출 방어", () => {
  test("모집 중이 아닌 투어(마감)에는 예약 문의 폼이 없다", async ({ page }) => {
    await page.goto("/freediving/tours/sample-closed");
    await expect(page.getByRole("form")).toHaveCount(0);
  });
});
