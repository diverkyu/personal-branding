import { describe, it, expect } from "vitest";
import { aggregate, classify, cleanJournal, dateRange, parseFilters, safeUrl, validDate, type JournalInput, type Metric } from "./model";
const origin = "https://example.com";
const input: JournalInput = { title: "수집 확인", engine: "naver", url: "/story/one", observedOn: "2026-01-20", sourceUrl: "https://searchadvisor.naver.com/console/board", note: "확인", periodStart: "2026-01-01", periodEnd: "2026-01-19", clicks: "0", impressions: "" };
describe("SEO 데이터 의미", () => {
  it("빈 자료와 실제 0을 구분하고 CTR·순위를 가중 계산한다", () => {
    expect(aggregate([])).toBeNull();
    const r: Metric = { date: "2026-01-01", dimension: "date", key: "", clicks: 0, impressions: 0, position: null };
    expect(aggregate([r])).toEqual({ clicks: 0, impressions: 0, ctr: null, position: null });
    expect(aggregate([{ ...r, clicks: 10, impressions: 100, position: 2 }, { ...r, clicks: 0, impressions: 300, position: 6 }])).toEqual({ clicks: 10, impressions: 400, ctr: .025, position: 5 });
  });
  it("범위는 정확히 7/28/90일이며 윤년·월 경계를 처리한다", () => {
    expect(dateRange(7, new Date("2024-03-02T00:00:00Z"))).toEqual({ start: "2024-02-24", end: "2024-03-01" });
    expect(dateRange(7, new Date("2024-03-02T00:00:00Z"), true)).toEqual({ start: "2024-02-25", end: "2024-03-02" });
    expect(parseFilters({ days: "bad", engine: "sql" })).toEqual({ days: 28, engine: "all" });
    expect(validDate("2026-02-30")).toBe(false);
  });
  it("실제 경로로 분류하고 스토리·다른 도메인을 추측하지 않는다", () => {
    expect(classify("/freediving/travel/one", origin)).toBe("freediving");
    expect(classify("/films/one", origin)).toBe("ai");
    expect(classify("/story/ai-guide", origin)).toBe("unknown");
    expect(classify("/story/ai-guide?x=1", origin, { "/story/ai-guide": "ai" })).toBe("ai");
    expect(classify("https://evil.test/films/one", origin)).toBe("unknown");
  });
  it("스크립트 URL, 외부 대상, 자격 증명을 거부한다", () => {
    for (const url of ["javascript:alert(1)", "https://evil.test/x", "https://user:pass@example.com/x", "//evil.test/x"]) expect(() => safeUrl(url, origin)).toThrow();
  });
  it("네이버 원본·기간 검증 및 빈 값과 0 보존", () => {
    expect(cleanJournal(input, origin)).toMatchObject({ clicks: 0, impressions: null });
    for (const change of [{ engine: "bing" }, { sourceUrl: "https://evil.test/" }, { periodEnd: "2026-02-01" }, { clicks: "-1" }, { clicks: "3", impressions: "2" }]) expect(() => cleanJournal({ ...input, ...change }, origin)).toThrow();
  });
});
