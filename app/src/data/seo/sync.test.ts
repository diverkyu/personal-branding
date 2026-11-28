import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { AdminDb } from "@/data/admin/db";
import type { Snapshot } from "@/seo/model";
import { claimSync, finishSync, readSeo } from "./store";
import { connection } from "./providers";
import { syncSeo } from "./sync";

const admin = { userId: "sync-test", name: "가상 관리자", email: "sync@example.com" };
const env = {
  SEO_GOOGLE_PROPERTY: "sc-domain:example.com",
  SEO_GOOGLE_CLIENT_ID: "test-client", SEO_GOOGLE_CLIENT_SECRET: "test-secret",
  SEO_GOOGLE_REFRESH_TOKEN: "test-refresh",
  SEO_BING_SITE_URL: "https://example.com/", SEO_BING_API_KEY: "test-key",
};
const now = new Date("2026-01-03T04:00:00Z");
const yesterday = new Date("2026-01-02T04:00:00Z");
const snapshot: Snapshot = {
  start: "2026-01-01", end: "2026-01-01", truncated: false,
  rows: [{ date: "2026-01-01", dimension: "date", key: "", clicks: 3, impressions: 10, position: 2 }],
};
const reply = (value: unknown) => new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } });
let client: PGlite, db: AdminDb;
beforeAll(async () => {
  client = new PGlite();
  const database = drizzle({ client });
  await migrate(database, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  db = database as unknown as AdminDb;
});
afterEach(() => vi.useRealTimers());
afterAll(async () => { await client.close(); });

it("미연동 엔진은 외부 요청이나 성공 스냅샷을 만들지 않는다", async () => {
  const fetcher = vi.fn<typeof fetch>();
  expect(await syncSeo(db, {}, fetcher, now)).toEqual({ google: "not_connected", bing: "not_connected" });
  expect(fetcher).not.toHaveBeenCalled();
  expect((await readSeo(db, admin, [connection("google", {}).scope, connection("bing", {}).scope])).sync).toEqual([]);
});

it("Google 실패가 Bing 성공을 막지 않고, 기존 자료·재시도 간격·같은 날 중복 방지를 보존한다", async () => {
  const google = connection("google", env).scope, bing = connection("bing", env).scope;
  const lease = await claimSync(db, google, "google", yesterday);
  expect(await finishSync(db, google, lease!, { snapshot }, yesterday)).toBe(true);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(new Response("", { status: 401 }))
    .mockResolvedValueOnce(reply({ d: [{ Date: "2026-01-02", Clicks: 0, Impressions: 4 }] }));
  expect(await syncSeo(db, env, fetcher, now)).toEqual({ google: "auth", bing: "success" });
  const data = (await readSeo(db, admin, [google, bing])).sync;
  expect(data.find(row => row.scope === google)).toMatchObject({ snapshot, succeededAt: yesterday, errorCode: "auth" });
  expect(data.find(row => row.scope === bing)?.snapshot?.rows[0]).toMatchObject({ clicks: 0, impressions: 4, position: null });
  expect(await syncSeo(db, env, fetcher, now)).toEqual({ google: "skipped", bing: "skipped" });
  expect(fetcher).toHaveBeenCalledTimes(2);

  const retryAt = new Date(now.getTime() + 301_000);
  vi.setSystemTime(retryAt);
  fetcher.mockResolvedValueOnce(reply({ access_token: "test-access" }))
    .mockResolvedValueOnce(reply({ rows: [{ keys: ["2026-01-02"], clicks: 2, impressions: 8, position: 3 }] }))
    .mockResolvedValueOnce(reply({ rows: [] }))
    .mockResolvedValueOnce(reply({ rows: [] }));
  expect(await syncSeo(db, env, fetcher, retryAt)).toEqual({ google: "success", bing: "skipped" });
  const saved = (await readSeo(db, admin, [google])).sync[0]!;
  expect(saved.errorCode).toBeNull();
  expect(saved.succeededAt).toEqual(retryAt);
  expect(saved.snapshot?.rows[0]).toMatchObject({ clicks: 2, impressions: 8 });
  expect(fetcher).toHaveBeenCalledTimes(6);
});

it("Google 차원 일부만 성공한 결과는 마지막 전체 성공 자료를 교체하지 않는다", async () => {
  const config = { ...env, SEO_GOOGLE_PROPERTY: "sc-domain:partial.example.com", SEO_BING_API_KEY: "" };
  const scope = connection("google", config).scope;
  const lease = await claimSync(db, scope, "google", yesterday);
  await finishSync(db, scope, lease!, { snapshot }, yesterday);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(reply({ access_token: "test-access" }))
    .mockResolvedValueOnce(reply({ rows: [{ keys: ["2026-01-02"], clicks: 9, impressions: 20, position: 2 }] }))
    .mockResolvedValueOnce(new Response("", { status: 429 }));
  expect(await syncSeo(db, config, fetcher, now)).toEqual({ google: "quota", bing: "not_connected" });
  expect((await readSeo(db, admin, [scope])).sync[0]).toMatchObject({ snapshot, succeededAt: yesterday, errorCode: "quota", lease: null });
});
