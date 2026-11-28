import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, usePathname: () => "/admin/seo/overview" }));
vi.mock("@/lib/auth/session", () => ({ requireAdmin: vi.fn(async () => ({ userId: "test", name: "가상 관리자", email: "test@example.com" })) }));
vi.mock("@/data/admin/dbServer", () => ({ adminDb: vi.fn(() => ({})) }));
vi.mock("@/data/seo/store", () => ({ readSeo: vi.fn() }));
vi.mock("./actions", () => ({ journalAction: vi.fn(), fieldAction: vi.fn(), syncAction: vi.fn() }));
import SeoPage from "./[section]/page";
import { AdminNav } from "../AdminNav";
import styles from "../../admin.module.css";
import { readSeo } from "@/data/seo/store";
import { connection } from "@/data/seo/providers";
import { dateRange, SECTIONS } from "@/seo/model";
const output = path.resolve("artifacts/seo-ui");
beforeEach(() => { vi.mocked(readSeo).mockResolvedValue({ sync: [], journal: [], fields: {} }); });
function capture(html: string, name: string) {
  mkdirSync(output, { recursive: true });
  let css = readFileSync(path.resolve("src/app/admin/admin.module.css"), "utf8");
  css = css.replace(/\.([a-zA-Z][\w-]*)/g, (match, key: string) => styles[key] ? `.${styles[key]}` : match);
  const tokens = readFileSync(path.resolve("src/styles/tokens.css"), "utf8");
  const globals = readFileSync(path.resolve("src/app/globals.css"), "utf8").replace(/^@import[^;]+;/gm, "");
  writeFileSync(path.join(output, `${name}.html`), `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SEO UI 격리 검증</title><style>${tokens}\n${globals}\n${css}</style><body>${html}</body></html>`);
}
async function render(section: string) {
  const page = await SeoPage({ params: Promise.resolve({ section }), searchParams: Promise.resolve({ days: "28" }) });
  return renderToStaticMarkup(<div className={styles.root}><div className={styles.shell}><nav className={styles.side} aria-label="어드민 메뉴"><p className={styles.brand}>KYU <small>어드민</small></p><AdminNav /></nav><main className={styles.main}>{page}</main></div></div>);
}
it("모든 메뉴는 미연동을 가짜 0으로 표시하지 않는다 (실제 컴포넌트 격리 렌더)", async () => {
  for (const section of Object.keys(SECTIONS)) {
    const html = await render(section);
    expect(html).toContain(SECTIONS[section as keyof typeof SECTIONS]);
    expect(html).not.toContain("fake-secret");
    capture(html, `${section}-empty`);
  }
  expect(await render("overview")).toContain("미연동");
  expect(await render("performance")).toContain("미확인");
});
it("실제 0, 오래된 자료, 오류, 긴 URL, 점검 편집을 렌더한다", async () => {
  const date = dateRange(28).end;
  vi.mocked(readSeo).mockResolvedValue({
    fields: {},
    sync: [{ scope: connection("google").scope, engine: "google", attemptedAt: new Date(), succeededAt: new Date(), errorCode: "auth", lease: null, leaseUntil: null,
      snapshot: { start: date, end: date, truncated: true, rows: [
        { date, dimension: "date", key: "", clicks: 0, impressions: 20, position: 3 },
        { date, dimension: "page", key: `https://example.com/story/${"a".repeat(160)}`, clicks: 0, impressions: 20, position: 3 },
        { date, dimension: "query", key: "<script>alert('x')</script>", clicks: 0, impressions: 20, position: 3 },
      ] } }],
    journal: [{ id: "00000000-0000-4000-8000-000000000001", title: "가상 점검: 재검사 대기", engine: "google", url: "https://example.com/", observedOn: date, sourceUrl: null, note: "화면 검증용 기록", status: "retest", version: 3, periodStart: null, periodEnd: null, clicks: null, impressions: null, updatedBy: "test", updatedAt: new Date(), deletedAt: null }],
  });
  const html = await render("performance");
  expect(html).toContain("0%");
  expect(html).toContain("인증 만료");
  expect(html).not.toContain("<script>alert");
  capture(html, "performance-data");
  capture(await render("journal"), "journal-data");
});
