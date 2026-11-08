import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_URL, isIndexingAllowed, resolveSiteUrl } from "./env";

describe("resolveSiteUrl", () => {
  it("SITE_URL 이 없으면 로컬 주소를 쓰고, 개발에서는 문제로 보지 않는다", () => {
    const r = resolveSiteUrl({ NODE_ENV: "development" });
    expect(r.url.origin).toBe(DEFAULT_SITE_URL);
    expect(r.source).toBe("default");
    expect(r.problem).toBeNull();
  });

  it("운영에서 SITE_URL 이 없으면 문제를 알린다", () => {
    expect(resolveSiteUrl({ NODE_ENV: "production" }).problem).toMatch(/SITE_URL/);
  });

  it("지정한 주소를 그대로 쓴다 (도메인이 바뀌어도 이 값만 바꾼다)", () => {
    const r = resolveSiteUrl({ SITE_URL: "https://example.com", NODE_ENV: "production" });
    expect(r.url.origin).toBe("https://example.com");
    expect(r.source).toBe("env");
    expect(r.problem).toBeNull();
  });

  it("운영에서 https 가 아닌 외부 주소는 문제로 알린다", () => {
    expect(resolveSiteUrl({ SITE_URL: "http://example.com", NODE_ENV: "production" }).problem).toMatch(/https/);
  });

  it("로컬 주소의 http 는 운영 빌드 시험에서 허용한다", () => {
    expect(resolveSiteUrl({ SITE_URL: "http://127.0.0.1:3100", NODE_ENV: "production" }).problem).toBeNull();
  });

  it("형식이 잘못되면 기본값으로 돌아가고 문제를 알린다", () => {
    const r = resolveSiteUrl({ SITE_URL: "not a url" });
    expect(r.url.origin).toBe(DEFAULT_SITE_URL);
    expect(r.problem).toMatch(/형식/);
  });
});

describe("isIndexingAllowed", () => {
  it("기본은 색인을 허용하지 않는다", () => {
    expect(isIndexingAllowed({})).toBe(false);
    expect(isIndexingAllowed({ SITE_INDEXING: "off" })).toBe(false);
  });

  it("SITE_INDEXING=on 일 때만 허용한다", () => {
    expect(isIndexingAllowed({ SITE_INDEXING: "on" })).toBe(true);
  });
});
