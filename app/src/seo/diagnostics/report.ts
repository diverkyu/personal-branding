/** File exchange contract from SEO-INTEGRATION.md at 51eaeb0. No network or DB writes. */
export const OUTCOMES = ["pass", "warn", "fail", "unknown"] as const;
export interface DiagnosticCheck {
  ruleId: string;
  outcome: typeof OUTCOMES[number];
  summary: string;
  evidenceUrl: string;
}
export interface DiagnosticReport {
  schemaVersion: 1;
  toolId: string;
  runId: string;
  checkedAt: string;
  targetUrl: string;
  checks: DiagnosticCheck[];
}

const LIMIT = { bytes: 128 * 1024, checks: 100, summary: 1000, url: 2048 };
const PUBLIC_PATH = /^(?:\/(?:about|contact|privacy)?|\/story(?:\/[^/]+)?|\/films(?:\/[^/]+)?|\/freediving(?:\/(?:tours|equipment|reviews|travel)(?:\/[^/]+)?)?)$/;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid report object");
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("Invalid report text");
  return value;
}
function identifier(value: unknown, max: number) {
  const result = text(value, max);
  if (!/^[a-zA-Z0-9._:-]+$/.test(result)) throw new Error("Invalid report identifier");
  return result;
}
export function publicReportUrl(value: unknown, trustedOrigin: string) {
  const raw = text(value, LIMIT.url);
  const url = new URL(raw);
  const origin = new URL(trustedOrigin);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if (url.origin !== origin.origin || !["http:", "https:"].includes(url.protocol) || (!local && url.protocol !== "https:") || url.username || url.password || url.search || url.hash || /[%\\]/.test(url.pathname) || !PUBLIC_PATH.test(url.pathname)) {
    throw new Error("Report URL is outside public scope");
  }
  return url.href;
}

export function parseDiagnosticReport(json: string, trustedOrigin: string, now = new Date()): DiagnosticReport {
  if (new TextEncoder().encode(json).byteLength > LIMIT.bytes) throw new Error("Report exceeds size limit");
  const input = object(JSON.parse(json));
  if (input.schemaVersion !== 1 || !Array.isArray(input.checks) || input.checks.length > LIMIT.checks || !input.checks.length) throw new Error("Unsupported report shape");
  const checkedAt = text(input.checkedAt, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(checkedAt) || !Number.isFinite(Date.parse(checkedAt)) || Date.parse(checkedAt) > now.getTime() + 300_000) throw new Error("Invalid observation time");
  const canonicalTime = checkedAt.includes(".") ? checkedAt : checkedAt.replace("Z", ".000Z");
  if (new Date(checkedAt).toISOString() !== canonicalTime) throw new Error("Invalid calendar date");
  const seen = new Set<string>();
  const checks = input.checks.map(value => {
    const check = object(value);
    const ruleId = identifier(check.ruleId, 100);
    if (seen.has(ruleId) || !OUTCOMES.includes(check.outcome as DiagnosticCheck["outcome"])) throw new Error("Invalid or repeated check");
    seen.add(ruleId);
    return { ruleId, outcome: check.outcome as DiagnosticCheck["outcome"], summary: text(check.summary, LIMIT.summary), evidenceUrl: publicReportUrl(check.evidenceUrl, trustedOrigin) };
  });
  // Return only the known fields; uploaded cookies/HTML/extra keys are never propagated.
  return { schemaVersion: 1, toolId: identifier(input.toolId, 80), runId: identifier(input.runId, 128), checkedAt, targetUrl: publicReportUrl(input.targetUrl, trustedOrigin), checks };
}
