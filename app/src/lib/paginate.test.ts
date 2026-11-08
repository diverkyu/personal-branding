import { describe, expect, it } from "vitest";
import { paginate, parsePage } from "./paginate";

describe("페이지 나누기", () => {
  it("전체 페이지 수와 구간을 계산한다", () => {
    expect(paginate(20, 1, 9)).toEqual({ page: 1, pages: 3, start: 0, end: 9 });
    expect(paginate(20, 3, 9)).toEqual({ page: 3, pages: 3, start: 18, end: 20 });
  });

  it("범위를 벗어난 페이지는 유효한 페이지로 맞춘다", () => {
    expect(paginate(20, 99, 9).page).toBe(3);
    expect(paginate(20, 0, 9).page).toBe(1);
    expect(paginate(20, -4, 9).page).toBe(1);
  });

  it("항목이 없어도 1페이지다", () => {
    expect(paginate(0, 1, 9)).toEqual({ page: 1, pages: 1, start: 0, end: 0 });
  });

  it("쿼리 값이 숫자가 아니면 1 로 처리한다", () => {
    expect(parsePage("2")).toBe(2);
    for (const bad of [undefined, null, "", "abc", "1e3", "-1", "2.5", "0", "9999999"]) expect(parsePage(bad as string | null | undefined), String(bad)).toBe(1);
  });
});
