import { describe, expect, it } from "vitest";
import { isShowcaseEnabled } from "./showcase";

describe("isShowcaseEnabled", () => {
  it("개발·시험 환경에서는 열린다", () => {
    expect(isShowcaseEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(isShowcaseEnabled({ NODE_ENV: "test" })).toBe(true);
  });

  it("운영에서는 기본으로 닫힌다", () => {
    expect(isShowcaseEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(isShowcaseEnabled({ NODE_ENV: "production", ENABLE_COMPONENT_SHOWCASE: "off" })).toBe(false);
  });

  it("운영에서도 ENABLE_COMPONENT_SHOWCASE=on 이면 열린다 (E2E용)", () => {
    expect(isShowcaseEnabled({ NODE_ENV: "production", ENABLE_COMPONENT_SHOWCASE: "on" })).toBe(true);
  });
});
