import "server-only";
import { createHash } from "node:crypto";
import { SYNC, dateRange, validDate, type AutoEngine, type Metric, type Snapshot } from "@/seo/model";

type Env = Record<string, string | undefined>;
export class ProviderError extends Error {
  constructor(public code: "auth" | "quota" | "network" | "response" | "configuration") { super(code); }
}
export const ERROR_LABELS: Record<string, string> = { auth: "인증 만료 또는 속성 접근 권한 오류", quota: "요청 한도 초과 — 잠시 뒤 재시도", network: "검색엔진 응답 지연 또는 통신 실패", response: "지원 형식과 다른 응답 — 원본 도구 확인 필요", configuration: "연동 설정 확인 필요", storage: "저장 실패 — 마지막 성공 자료 보존" };
export function connection(engine: AutoEngine, env: Env = process.env) {
  const keys = engine === "google" ? ["SEO_GOOGLE_PROPERTY", "SEO_GOOGLE_CLIENT_ID", "SEO_GOOGLE_CLIENT_SECRET", "SEO_GOOGLE_REFRESH_TOKEN"] : ["SEO_BING_SITE_URL", "SEO_BING_API_KEY"];
  const property = env[keys[0]!]?.trim() ?? "";
  return { engine, property, configured: keys.every(k => !!env[k]?.trim()), keys: keys.map(name => ({ name, present: !!env[name]?.trim() })), scope: createHash("sha256").update(`${engine}:${property}`).digest("hex") };
}
async function json(fetcher: typeof fetch, url: string, init: RequestInit = {}, tokenRequest = false) {
  let response: Response;
  try { response = await fetcher(url, { ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(SYNC.timeoutMs) }); } catch { throw new ProviderError("network"); }
  if (!response.ok) throw new ProviderError(response.status === 401 || response.status === 403 || (tokenRequest && response.status === 400) ? "auth" : response.status === 429 ? "quota" : "network");
  try {
    const data = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new ProviderError("response");
    return data;
  } catch { throw new ProviderError("response"); }
}
function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new ProviderError("response");
  return value;
}
export async function collectGoogle(env: Env = process.env, fetcher = fetch, now = new Date()): Promise<Snapshot> {
  if (!connection("google", env).configured) throw new ProviderError("configuration");
  const token = await json(fetcher, "https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ grant_type: "refresh_token", client_id: env.SEO_GOOGLE_CLIENT_ID!, client_secret: env.SEO_GOOGLE_CLIENT_SECRET!, refresh_token: env.SEO_GOOGLE_REFRESH_TOKEN! }) }, true);
  if (typeof token.access_token !== "string") throw new ProviderError("auth");
  const range = dateRange(SYNC.days, now);
  const rows: Metric[] = [];
  let truncated = false;
  for (const dimension of ["date", "query", "page"] as const) {
    for (let page = 0; page < SYNC.maxPages; page++) {
      const data = await json(fetcher, `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(env.SEO_GOOGLE_PROPERTY!.trim())}/searchAnalytics/query`, {
        method: "POST", headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: range.start, endDate: range.end, type: "web", dataState: "final", dimensions: dimension === "date" ? ["date"] : ["date", dimension], rowLimit: SYNC.rowLimit, startRow: page * SYNC.rowLimit }),
      });
      if (data.error || (data.rows !== undefined && !Array.isArray(data.rows))) throw new ProviderError("response");
      const batch = data.rows ?? [];
      for (const r of batch) {
        if (!r || typeof r !== "object") throw new ProviderError("response");
        if (!Array.isArray(r.keys) || r.keys.length !== (dimension === "date" ? 1 : 2) || !r.keys.every((k: unknown) => typeof k === "string") || !validDate(r.keys[0]) || r.keys[0] < range.start || r.keys[0] > range.end) throw new ProviderError("response");
        rows.push({ date: r.keys[0], dimension, key: dimension === "date" ? "" : r.keys[1], clicks: number(r.clicks), impressions: number(r.impressions), position: r.position == null ? null : number(r.position) });
      }
      if (batch.length < SYNC.rowLimit) break;
      if (page === SYNC.maxPages - 1) truncated = true;
    }
  }
  return { ...range, rows, truncated };
}
export function bingDate(value: unknown) {
  if (typeof value !== "string") throw new ProviderError("response");
  const match = /^\/Date\((-?\d+)([+-]\d{4})?\)\/$/.exec(value);
  let date = value.slice(0, 10);
  if (match) {
    const offset = match[2];
    const minutes = offset ? (offset[0] === "-" ? -1 : 1) * (Number(offset.slice(1, 3)) * 60 + Number(offset.slice(3))) : 0;
    const time = new Date(Number(match[1]) + minutes * 60_000);
    if (!Number.isFinite(time.getTime())) throw new ProviderError("response");
    date = time.toISOString().slice(0, 10);
  }
  if (!validDate(date)) throw new ProviderError("response");
  return date;
}
export async function collectBing(env: Env = process.env, fetcher = fetch, now = new Date()): Promise<Snapshot> {
  if (!connection("bing", env).configured) throw new ProviderError("configuration");
  const url = new URL("https://ssl.bing.com/webmaster/api.svc/json/GetRankAndTrafficStats");
  url.search = new URLSearchParams({ siteUrl: env.SEO_BING_SITE_URL!.trim(), apikey: env.SEO_BING_API_KEY! }).toString();
  const data = await json(fetcher, url.href);
  if (data.ErrorCode) throw new ProviderError(data.ErrorCode === 3 ? "auth" : "response");
  if (!Array.isArray(data.d)) throw new ProviderError("response");
  const range = dateRange(SYNC.days, now);
  const rows: Metric[] = data.d.map((r: Record<string, unknown>) => {
    if (!r || typeof r !== "object") throw new ProviderError("response");
    return { date: bingDate(r.Date), dimension: "date", key: "", clicks: number(r.Clicks), impressions: number(r.Impressions), position: null };
  });
  return { ...range, rows: rows.filter(r => r.date >= range.start && r.date <= range.end), truncated: false };
}
