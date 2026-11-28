# Audit contract and priorities

The first implementation reuses PR #75's audit and PR #76's content corrections after review/merge. Admin baseline is local commit `51eaeb0`; read its `docs/phase1/SEO-INTEGRATION.md` and the proposed `docs/phase1/SEO-INTELLIGENCE.md`. It has `seo_sync`, `seo_journal`, `seo_fields`; do not replace them. Migration 0009 is applied to dev and immutable. Full integration is a following phase, not a claim about installed skills.

Implemented file exchange: schemaVersion=1/toolId/runId/checkedAt/targetUrl/checks; checks contain ruleId/outcome(pass,warn,fail,unknown)/summary/evidenceUrl. Validate with `src/seo/diagnostics/report.ts`. Multi-page batches need distinct per-page runIds to avoid collisions under unique(toolId, runId). A separate summary holds lab metrics/environment/coverage. The richer contract below is a design target, not an existing API.

## Required result contract (target for the existing crawler)

`schemaVersion`, `runId`, `ruleSetVersion`, `source`, `environment`, `startedAt`, `finishedAt`, `status` (complete/partial/failed), `targetOrigin`, `expectedIndexing`, `coverage` (planned/checked/skipped/failed/limits), `pages`, `findings`.

Each finding: stable `ruleId`, normalized canonical target URL, field (freediving/ai/brand/unknown), source, P0–P3, observation status (fail/review/unknown), bounded evidence, recommendation. Use a deterministic fingerprint of site/environment + rule ID + normalized URL, not the changing message or timestamp. Preserve the original crawl URL alongside the canonical. Strip credentials, query secrets and private text.

- P0: confirmed outage or unintended index blocking of an important public page. Planned preview/empty-list noindex is not P0. Timeout alone is an unavailable observation; retry within the limit before diagnosing outage.
- P1: substantial discovery/content mismatch, broken important internal links, invalid required fields for a deliberately targeted supported search feature.
- P2: content specificity, sharing information, meaningful alt/heading improvements.
- P3: optional/long-term refinements.
- Do not turn missing metrics, a title character count or multiple H1s into a P0/P1 by itself.

## Coverage

HTTP/HTTPS/redirect chains; robots agent groups; sitemap/canonical agreement; robots meta + X-Robots-Tag; metadata duplicates; heading hierarchy; alt presence vs decorative emptiness; links and orphan candidates; HTML vs DOM; structured data syntax + visible-content match; image/video accessibility; mobile overflow; lab performance. A sitemap-only crawl cannot prove that a page absent from the sitemap does not exist: reconcile CMS published URLs after authenticated server-side integration, never crawl the admin.

Initial bounds proposed for this small site: 100 public pages, concurrency 2, timeout 20s/request, total 10min, HTML/XML 2MiB, at most 3 same-origin redirects; no retries for authentication/4xx, one delayed retry for transient 429/5xx. Record every truncated/skipped check. Manually inspect domain redirects separately from the crawler. An external image host may be observed during rendering, but is not an external page-crawl seed.

## Admin reconciliation (after existing admin integration)

Add run/result persistence and a unique finding fingerprint, linked to the existing journal. Manual notes and status history survive automatic updates. Update firstSeen/lastSeen/count; recurrence creates a new observation for review. Only a successful identical rule on the identical target may offer resolution evidence; a human reviews it before moving the existing journal state. Missing pages, capped scans, schema-version changes and failed scans leave status unconfirmed. Tombstone intentional page removals with an explicit operator action.

Authenticate on every server action using existing requireAdmin. Never run a long browser crawl inside a request handler; enqueue a bounded worker/CI job, display queued/running/partial/failed states. Ingestion needs a dedicated scoped secret or GitHub OIDC verification, not an administrator cookie or exposed CRON_SECRET. Verify origin/schema/size/run identity and idempotency before storing. Do not expose artifacts publicly or fetch arbitrary artifact URLs.
