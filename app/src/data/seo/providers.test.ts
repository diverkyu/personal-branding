import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { collectGoogle, collectBing, bingDate, connection } from "./providers";
const env = { SEO_GOOGLE_PROPERTY: "sc-domain:example.com", SEO_GOOGLE_CLIENT_ID: "fake-id", SEO_GOOGLE_CLIENT_SECRET: "fake-secret", SEO_GOOGLE_REFRESH_TOKEN: "fake-refresh", SEO_BING_SITE_URL: "https://example.com/", SEO_BING_API_KEY: "fake-key" };
const now = new Date("2026-01-02T12:00:00Z");
const reply = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
describe("공식 API 응답 계약 (모의 응답)", () => {
  it("Google 합계·검색어·페이지 분리와 final/web 범위", async () => {
    const mock = vi.fn<typeof fetch>().mockResolvedValueOnce(reply({ access_token: "fake-access" }))
      .mockResolvedValueOnce(reply({ rows: [{ keys: ["2026-01-01"], clicks: 0, impressions: 10, position: 3 }] }))
      .mockResolvedValueOnce(reply({ rows: [{ keys: ["2026-01-01", "freediving"], clicks: 0, impressions: 2, position: 5 }] }))
      .mockResolvedValueOnce(reply({ rows: [{ keys: ["2026-01-01", "https://example.com/films/one"], clicks: 0, impressions: 3, position: 2 }] }));
    const result = await collectGoogle(env, mock, now);
    expect(result.rows.map(r => r.dimension)).toEqual(["date", "query", "page"]);
    expect(result.rows[0]?.clicks).toBe(0);
    expect(JSON.parse(mock.mock.calls[1]![1]!.body as string)).toMatchObject({ dimensions: ["date"], type: "web", dataState: "final", startRow: 0, endDate: "2026-01-01" });
    expect(mock.mock.calls[1]![1]).toMatchObject({ redirect: "error", cache: "no-store" });
  });
  it("페이지네이션은 startRow를 증가시키고 빈 끝 응답을 처리", async () => {
    const mock = vi.fn<typeof fetch>().mockResolvedValueOnce(reply({ access_token: "fake-access" }))
      .mockResolvedValueOnce(reply({ rows: [] }))
      .mockResolvedValueOnce(reply({ rows: Array.from({ length: 25000 }, (_, i) => ({ keys: ["2026-01-01", `q${i}`], clicks: 1, impressions: 2, position: 1 })) }))
      .mockResolvedValueOnce(reply({ rows: [] })).mockResolvedValueOnce(reply({}));
    expect((await collectGoogle(env, mock, now)).rows).toHaveLength(25000);
    expect(JSON.parse(mock.mock.calls[3]![1]!.body as string).startRow).toBe(25000);
  });
  it("Bing 날짜 오프셋 및 실제 0 보존, 평균 순위 미확인", async () => {
    expect(bingDate("/Date(1316156400000-0700)/")).toBe("2011-09-16");
    const mock = vi.fn<typeof fetch>().mockResolvedValue(reply({ d: [{ Date: "2026-01-01T00:00:00-08:00", Clicks: 0, Impressions: 5 }] }));
    expect((await collectBing(env, mock, now)).rows[0]).toMatchObject({ clicks: 0, impressions: 5, position: null });
    expect(new URL(mock.mock.calls[0]![0] as string).pathname).toBe("/webmaster/api.svc/json/GetRankAndTrafficStats");
  });
  it("인증·쿼터·비정상 응답을 성공으로 만들지 않고 시크릿을 오류에 넣지 않음", async () => {
    await expect(collectBing(env, vi.fn<typeof fetch>().mockResolvedValue(new Response("fake-key", { status: 401 })), now)).rejects.toMatchObject({ code: "auth", message: "auth" });
    await expect(collectBing(env, vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 429 })), now)).rejects.toMatchObject({ code: "quota" });
    await expect(collectBing(env, vi.fn<typeof fetch>().mockResolvedValue(reply({ ErrorCode: 3 })), now)).rejects.toMatchObject({ code: "auth" });
    await expect(collectBing(env, vi.fn<typeof fetch>().mockResolvedValue(reply({ d: [{ Date: "bad", Clicks: 0, Impressions: 1 }] })), now)).rejects.toMatchObject({ code: "response" });
    expect(connection("google", {}).configured).toBe(false);
    expect(connection("google", { ...env, SEO_GOOGLE_PROPERTY: "other" }).scope).not.toBe(connection("google", env).scope);
  });
});
