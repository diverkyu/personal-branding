import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/data/admin/dbServer", () => ({ adminDb: vi.fn(() => ({})) }));
vi.mock("@/data/seo/sync", () => ({ syncSeo: vi.fn() }));
import { syncSeo } from "@/data/seo/sync";
import { GET } from "./route";
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it("시크릿 누락·짧은 값·위조는 DB/API 호출 전에 거부", async () => {
  for (const secret of ["", "short"]) { vi.stubEnv("CRON_SECRET", secret); expect((await GET(new Request("https://example.com/api/cron/seo"))).status).toBe(404); }
  vi.stubEnv("CRON_SECRET", "fake-cron-secret-for-test");
  expect((await GET(new Request("https://example.com/api/cron/seo", { headers: { authorization: "Bearer forged" } }))).status).toBe(401);
  expect(syncSeo).not.toHaveBeenCalled();
});
it("인증된 작업에서 오류를 HTTP 성공으로 숨기지 않는다", async () => {
  vi.stubEnv("CRON_SECRET", "fake-cron-secret-for-test");
  vi.mocked(syncSeo).mockResolvedValue({ google: "auth", bing: "success" });
  const response = await GET(new Request("https://example.com/api/cron/seo", { headers: { authorization: "Bearer fake-cron-secret-for-test" } }));
  expect(response.status).toBe(502);
  expect(response.headers.get("cache-control")).toBe("no-store");
});
