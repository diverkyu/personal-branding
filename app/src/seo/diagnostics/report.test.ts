import { test, expect } from "vitest";
import { parseDiagnosticReport } from "./report";
const origin = "https://www.diverkyu.com";
const base = { schemaVersion: 1, toolId: "site-seo-audit", runId: "run-1", checkedAt: "2026-11-28T00:00:00Z", targetUrl: `${origin}/films/example`, checks: [{ ruleId: "meta.description", outcome: "warn", summary: "실제 확인 근거", evidenceUrl: `${origin}/films/example` }] };
const parse = (input: unknown) => parseDiagnosticReport(JSON.stringify(input), origin, new Date("2026-11-28T01:00:00Z"));
test("accepts the agreed contract, drops unrecognized payload fields without fetching", () => {
  expect(parse({ ...base, cookie: "not-retained", html: "not-retained" })).toEqual(base);
});
test("rejects admin/API, external, ambiguous, credentialed and query URLs", () => {
  for (const targetUrl of ["https://example.com", `${origin}/admin`, `${origin}/api/auth`, `${origin}/dev/components`, `${origin}/films/%61dmin`, `${origin}/story/x?token=x`, `https://user:pw@www.diverkyu.com/films`, "file:///tmp/x"]) {
    expect(() => parse({ ...base, targetUrl })).toThrow();
  }
  expect(() => parse({ ...base, checks: [{ ...base.checks[0], evidenceUrl: "https://example.com" }] })).toThrow();
});
test("rejects oversized, duplicate, unsupported and future observations", () => {
  for (const value of [{ ...base, schemaVersion: 2 }, { ...base, checkedAt: "2027-01-01T00:00:00Z" }, { ...base, checkedAt: "2026-02-30T00:00:00Z" }, { ...base, checks: [base.checks[0], base.checks[0]] }, { ...base, checks: [] }, { ...base, checks: [{ ...base.checks[0], outcome: "resolved" }] }, { ...base, extra: "x".repeat(131073) }]) {
    expect(() => parse(value)).toThrow();
  }
});
