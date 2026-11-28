---
name: diverkyu-seo-audit
description: Audit DIVERKYU public pages and its SEO admin using repeatable evidence, Google/Naver/Bing data, and separate freediving and AI film analysis. Use for this repository's SEO diagnosis, regressions, prioritization, and Korean reports.
---

# DIVERKYU SEO audit

Read repository `AGENTS.md`, `docs/phase1/SEO-GEO-WORKGUIDE.md` and `.agents/product-marketing.md`. Check Git status and the actual branch before assuming an earlier audit or PR is deployed. Preserve unfinished admin work. Do not create a second crawler, dashboard, provider adapter, or scheduler where one exists.

## Choose the work

- Full audit: read [audit contract](references/audit-contract.md), then inventory current public routes and existing audit commands. Use `seo:audit` once available from the existing audit branch; do not imply it is already on main. Use `seo:lhci` for a separate local performance baseline.
- Engine data, video or entity questions: read [engine and content rules](references/engines-and-content.md). Reuse `src/data/seo` and `src/seo/model.ts` once the admin branch is integrated. They are not present on every branch.
- Korean report / handoff: use [report template](references/report-template.md). Clearly separate implemented, executed, verified, pending and unsupported.
- Generic advice: selectively consult sibling `seo-audit`, `schema`, `site-architecture`, `ai-seo`, `analytics`. Those are community heuristics, not engine specifications. This project's confirmed facts, measured evidence and current official documentation take priority.

## Execute within scope

For automatic crawling, only use the configured public SITE_URL and explicitly allowed public paths. No admin, API, draft, user-entered arbitrary URL or external-domain crawling. Enforce same-origin checks at each redirect, count/byte/time limits and bounded retries in code; a prompt or MCP origin option is not a security boundary.

Use Chrome DevTools MCP for one-off rendering/network/performance investigation. Use existing Playwright tests for repeatable browser regressions; Playwright MCP is an optional investigation assistant. Do not attach these MCP servers to the user's signed-in browser. CI runs scripts without an AI model or MCP session.

Compare raw server HTML with rendered DOM before declaring markup absent. Never execute fetched HTML in a server parser. Render only authorized public pages in a separate browser. Use existing safe JSON serialization for any changes.

Lighthouse is laboratory data. Report LCP, CLS and TBT with device/settings/version; never rename TBT to INP. Real-user INP/CWV requires field data, which may not exist for this small site. Missing data is unknown, not zero or a pass. Scores are not ranking predictions.

Never require a fixed title length, one H1, empty decorative alt replacement, FAQ markup or llms.txt as a universal SEO gate. Schema validity, Google rich-result eligibility, successful submission and actual indexing are different outcomes.

No paid API/service, speculative qualification/location/plot, fabricated review or automated search-engine submission. Do not enable GA4, alter robots, publish or deploy as an incidental audit action. Retain raw reports in ignored artifacts, not Git; never record secrets, cookies or private admin content.

For fixes, reproduce with evidence, modify the owning code, run appropriate regression and common gates, then rerun the same check. A failed or partial crawl cannot resolve earlier findings automatically.
