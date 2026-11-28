import type { DiagnosticReport, DiagnosticCheck } from "./report";

const categories = ["performance", "accessibility", "best-practices", "seo"] as const;
const metrics = { lcpMs: "largest-contentful-paint", cls: "cumulative-layout-shift", tbtMs: "total-blocking-time" };
export interface LighthouseRun {
  requestedUrl: string;
  finalDisplayedUrl?: string;
  finalUrl?: string;
  runtimeError?: unknown;
  lighthouseVersion?: string;
  environment?: { hostUserAgent?: string };
  userAgent?: string;
  configSettings?: unknown;
  categories?: Record<string, { score?: number | null }>;
  audits?: Record<string, { numericValue?: number }>;
}
interface Options { mode: "local" | "public"; expectedUrls: string[]; expectedRuns: number; environment: string; runId: string }
function median(values: (number | null | undefined)[]) {
  if (!values.length || values.some(value => typeof value !== "number" || !Number.isFinite(value))) return null;
  const sorted = [...values as number[]].sort((a, b) => a - b);
  const i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i]! : (sorted[i - 1]! + sorted[i]!) / 2;
}
const normalize = (value: string) => new URL(value).href;

export function summarizeLighthouse(reports: LighthouseRun[], { mode, expectedUrls, expectedRuns, environment, runId }: Options) {
  const expected = new Set(expectedUrls.map(normalize));
  const unexpected = reports.some(report => !expected.has(normalize(report.requestedUrl)));
  const pages = [...expected].map(url => {
    const runs = reports.filter(report => normalize(report.requestedUrl) === url);
    const valid = runs.filter(report => !report.runtimeError && normalize(report.finalDisplayedUrl || report.finalUrl || "about:blank") === url);
    const scores = Object.fromEntries(categories.map(name => [name, median(valid.map(report => report.categories?.[name]?.score))]));
    const lab = Object.fromEntries(Object.entries(metrics).map(([name, id]) => [name, median(valid.map(report => report.audits?.[id]?.numericValue))]));
    const complete = valid.length === expectedRuns && runs.length === expectedRuns && Object.values(scores).every(v => v !== null) && Object.values(lab).every(v => v !== null);
    return { url, status: complete ? "complete" : "partial", attempted: runs.length, measured: valid.length, scores, lab, field: { inpMs: null, status: "not_measured" } };
  });
  const finishedAt = new Date().toISOString();
  const status = !unexpected && pages.every(p => p.status === "complete") ? "complete" : "partial";
  const diagnostics: DiagnosticReport[] = pages.map((page, index) => {
    const checks: DiagnosticCheck[] = categories.map(name => {
      const value = page.scores[name];
      const measured = status === "complete" && value !== null && value !== undefined;
      return { ruleId: `lighthouse.category.${name}`, outcome: measured ? (value < (name === "performance" ? 0.7 : 0.9) ? "warn" : "pass") : "unknown", summary: measured ? `모바일 실험실 ${name} 중앙값 ${value}. 검색 순위·실사용자 성과가 아닙니다.` : "실험실 검사 불완전 — 재검사 필요", evidenceUrl: page.url };
    });
    checks.push({ ruleId: "field.inp", outcome: "unknown", summary: "실사용자 INP는 측정하지 않았습니다. Lighthouse TBT로 대신하지 않습니다.", evidenceUrl: page.url });
    // Per-page run IDs avoid losing pages under the future unique(toolId, runId) key.
    return { schemaVersion: 1, toolId: `lighthouse-lab-${mode}`, runId: `${runId}:${index}`, checkedAt: finishedAt, targetUrl: page.url, checks };
  });
  return {
    schemaVersion: 1, source: "lighthouse-ci", measurement: "laboratory", mode, environment, runId, status,
    finishedAt, expectedRuns, versions: [...new Set(reports.map(r => r.lighthouseVersion))],
    browsers: [...new Set(reports.map(r => r.environment?.hostUserAgent || r.userAgent || "unknown"))],
    settings: reports[0]?.configSettings ?? null, expectedIndexing: mode === "public",
    skippedAudits: mode === "local" ? ["is-crawlable"] : [], pages, diagnostics,
  };
}
