import { AppError } from "@/lib/errors";

export const ENGINES = ["google", "bing", "naver"] as const;
export type Engine = typeof ENGINES[number];
export type AutoEngine = Exclude<Engine, "naver">;
export const ENGINE_LABELS = { google: "Google", bing: "Bing", naver: "Naver" };
export const SECTIONS = { overview: "종합 대시보드", performance: "검색 성과", indexing: "수집 및 색인 관리", diagnostics: "SEO 기술 진단", journal: "SEO 점검 일지", connections: "검색엔진 연동 설정" };
export const OFFICIAL = { google: "https://search.google.com/search-console", bing: "https://www.bing.com/webmasters", naver: "https://searchadvisor.naver.com/console/board" };
export const STATUS_LABELS = { needed: "조치 필요", fixed: "수정 완료", retest: "재검사 대기", resolved: "해결 완료", further: "추가 조치" };
export type JournalStatus = keyof typeof STATUS_LABELS;
export const TRANSITIONS: Record<JournalStatus, JournalStatus[]> = { needed: ["fixed"], fixed: ["retest"], retest: ["resolved", "further"], resolved: ["further"], further: ["fixed"] };
export const FIELD_LABELS = { freediving: "프리다이빙", ai: "AI 영상", brand: "개인 브랜딩", unknown: "미분류" };
export type ContentField = keyof typeof FIELD_LABELS;
export interface Metric { date: string; dimension: "date" | "query" | "page"; key: string; clicks: number; impressions: number; position: number | null }
export interface Snapshot { start: string; end: string; rows: Metric[]; truncated: boolean }
export const SYNC = { days: 90, rowLimit: 25_000, maxPages: 2, leaseMs: 600_000, retryMs: 300_000, timeoutMs: 20_000 };

export function dateRange(days: number, now = new Date(), includeToday = false) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (includeToday ? 0 : 86_400_000));
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
export function parseFilters(p: Record<string, string | string[] | undefined>) {
  return { days: [7, 28, 90].includes(Number(p.days)) ? Number(p.days) : 28, engine: ENGINES.includes(p.engine as Engine) ? p.engine as Engine : "all" as const };
}
export function validDate(s: string) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s; }
export function safeUrl(value: string, origin?: string) {
  if (!value || value.length > 2048) throw new AppError("validation", "URL을 확인해 주세요.");
  let u: URL;
  try { u = new URL(value, origin); } catch { throw new AppError("validation", "URL 형식이 올바르지 않습니다."); }
  if (!["https:", "http:"].includes(u.protocol) || u.username || u.password || (origin && u.origin !== new URL(origin).origin)) throw new AppError("validation", "허용되지 않은 URL입니다. 대상은 현재 사이트 주소만 입력해 주세요.");
  u.hash = "";
  return u.href;
}
export function classify(url: string, origin: string, overrides: Record<string, ContentField> = {}): ContentField {
  let path: string;
  try { path = new URL(safeUrl(url, origin)).pathname.replace(/\/$/, "") || "/"; } catch { return "unknown"; }
  if (overrides[path]) return overrides[path]!;
  if (path === "/freediving" || path.startsWith("/freediving/")) return "freediving";
  if (path === "/films" || path.startsWith("/films/")) return "ai";
  if (["/", "/about", "/contact"].includes(path)) return "brand";
  return "unknown";
}
export function aggregate(rows: Metric[]) {
  if (!rows.length) return null;
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const ranked = rows.filter(r => r.position !== null);
  const weight = ranked.reduce((s, r) => s + r.impressions, 0);
  return { clicks, impressions, ctr: impressions > 0 ? clicks / impressions : null, position: weight > 0 && ranked.length === rows.length ? ranked.reduce((s, r) => s + r.position! * r.impressions, 0) / weight : null };
}
export interface JournalInput { title: string; engine: string; url: string; observedOn: string; sourceUrl: string; note: string; periodStart: string; periodEnd: string; clicks: string; impressions: string }
export function cleanJournal(i: JournalInput, origin: string) {
  if (!i.title.trim() || i.title.length > 160 || i.note.length > 5000 || !ENGINES.includes(i.engine as Engine) || !validDate(i.observedOn) || i.observedOn > new Date().toISOString().slice(0, 10)) throw new AppError("validation", "제목(160자), 메모(5,000자), 검색엔진과 확인일을 확인해 주세요.");
  const count = (v: string) => { if (!v.trim()) return null; if (!/^\d+$/.test(v) || !Number.isSafeInteger(Number(v))) throw new AppError("validation", "수치는 0 이상의 정수여야 합니다."); return Number(v); };
  const clicks = count(i.clicks), impressions = count(i.impressions);
  const manual = clicks !== null || impressions !== null || !!i.periodStart || !!i.periodEnd;
  const sourceUrl = i.sourceUrl ? safeUrl(i.sourceUrl) : null;
  if (manual && (i.engine !== "naver" || !validDate(i.periodStart) || !validDate(i.periodEnd) || i.periodStart > i.periodEnd || i.periodEnd > i.observedOn || !sourceUrl || new URL(sourceUrl).hostname !== "searchadvisor.naver.com")) throw new AppError("validation", "네이버 수동 성과는 조회 기간과 Search Advisor 원본 링크가 필요합니다.");
  if (clicks !== null && impressions !== null && clicks > impressions) throw new AppError("validation", "클릭이 노출보다 많습니다. 원본을 확인해 주세요.");
  return { title: i.title.trim(), engine: i.engine as Engine, url: safeUrl(i.url, origin), observedOn: i.observedOn, sourceUrl, note: i.note.trim(), periodStart: manual ? i.periodStart : null, periodEnd: manual ? i.periodEnd : null, clicks, impressions };
}
