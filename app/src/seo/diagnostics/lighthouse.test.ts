import { test, expect } from "vitest";
import { summarizeLighthouse, type LighthouseRun } from "./lighthouse";
import { parseDiagnosticReport } from "./report";
const url = "http://127.0.0.1:3195/";
const options = { mode: "local" as const, expectedUrls: [url], expectedRuns: 3, environment: "fixture", runId: "fixture-001" };
function report(value: number | null = 1): LighthouseRun {
  return { requestedUrl: url, finalUrl: url, lighthouseVersion: "13.6.0",
    categories: Object.fromEntries(["performance", "accessibility", "best-practices", "seo"].map(k => [k, { score: value }])),
    audits: Object.fromEntries(["largest-contentful-paint", "cumulative-layout-shift", "total-blocking-time"].map(k => [k, { numericValue: value ?? 0 }])),
  };
}
test("median uses three runs; produces compatible admin reports and no field INP", () => {
  const result = summarizeLighthouse([report(0.8), report(0.6), report(1)], options);
  expect(result.status).toBe("complete");
  expect(result.pages[0]!.scores.performance).toBe(0.8);
  expect(result.pages[0]!.field.inpMs).toBeNull();
  expect(result.expectedIndexing).toBe(false);
  expect(parseDiagnosticReport(JSON.stringify(result.diagnostics[0]), url)).toEqual(result.diagnostics[0]);
});
test("missing runs, runtime failure, redirect and missing metric remain unknown", () => {
  for (const bad of [undefined, { ...report(), runtimeError: { code: "FAILED_DOCUMENT_REQUEST" } }, { ...report(), finalUrl: `${url}admin` }, { ...report(), audits: {} }]) {
    const result = summarizeLighthouse([report(), report(), ...(bad ? [bad] : [])], options);
    expect(result.status).toBe("partial");
    expect(result.diagnostics[0]!.checks.every(c => c.outcome === "unknown")).toBe(true);
  }
});
test("zero is measured, null is unknown, unexpected page invalidates coverage", () => {
  expect(summarizeLighthouse([report(0), report(0), report(0)], options).pages[0]!.scores.seo).toBe(0);
  expect(summarizeLighthouse([report(null), report(), report()], options).status).toBe("partial");
  expect(summarizeLighthouse([report(), report(), report(), { ...report(), requestedUrl: `${url}other` }], options).status).toBe("partial");
});
test("different pages have distinct run IDs for import deduplication", () => {
  const other = `${url}films`;
  const result = summarizeLighthouse([report(), { ...report(), requestedUrl: other, finalUrl: other }], { ...options, expectedUrls: [url, other], expectedRuns: 1 });
  expect(new Set(result.diagnostics.map(r => r.runId)).size).toBe(2);
});
