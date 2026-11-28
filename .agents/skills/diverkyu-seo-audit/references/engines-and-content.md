# Engines, content and measurement

Verify current official documentation when implementing an endpoint; links are starting points, not immutable specifications.

## Google

Reuse the read-only Search Analytics adapter. Preserve PT source dates, final/incomplete state, source property, query anonymization and row limits. Display KST execution time separately; do not relabel source dates KST. Daily sync should cache/deduplicate and back off on quotas.

- [Search Analytics](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
- [URL Inspection](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect): inspect Google's indexed version; not a live test or indexing-request endpoint.
- [Limits](https://developers.google.com/webmaster-tools/limits): verify current property/project quotas; inspect priority changed URLs, not every URL every day.
- [Indexing API scope](https://developers.google.com/search/apis/indexing-api/v3/using-api): do not use it for ordinary stories, films or tour pages.
- [Video](https://developers.google.com/search/docs/appearance/structured-data/video), [Event](https://developers.google.com/search/docs/appearance/structured-data/event), [Article](https://developers.google.com/search/docs/appearance/structured-data/article): check required versus recommended fields for the current supported feature.
- [AI features](https://developers.google.com/search/docs/appearance/ai-features): no promise of citation, no mandatory AI file. Verify any newly claimed report/API support before displaying it as integrated.

## Naver

[Search Advisor guide](https://searchadvisor.naver.com/guide): keep ownership/sitemap/RSS/crawl observations with checkedAt, official source link, period and evidence. An RSS feed is useful only if the existing publication model supports it; absence is not automatically a fatal error. No login scraping or fake API integration. Manual search data stays separate from automatic metrics.

## Bing

[API protocols](https://learn.microsoft.com/en-us/bingwebmaster/api-protocols), [access](https://learn.microsoft.com/en-us/bingwebmaster/getting-access), [IndexNow](https://www.indexnow.org/documentation): existing adapter has daily clicks/impressions only. Add supported query/page/URL methods individually with their actual schema and quota. IndexNow must be separately enabled and submissions logged; accepted is not indexed. No submission during audits.

## DIVERKYU content

Keep Person identity `/about#person` consistent with actual rendering after PR #76. Do not create a fictional Organization/LocalBusiness/address. Instructor start year and AIDA credentials are confirmed in `.agents/product-marketing.md`; service region remains unconfirmed.

Freediving content links to real classes/tours and inquiries. Safety statements require current authoritative training sources and instructor review, with no guarantees. AI film pages use real title, creator, playable video, thumbnail, dates and available captions; link genuine making notes, tools and prompts. Do not infer plots from a thumbnail. VideoObject data must match visible content and public media access.

Coron's Barracuda Lake, Dugong Watch area and Dimipac Island are confirmed destinations, not a confirmed assembly point or street address. Keep region-only data honest; do not claim it guarantees Event rich results.

Two funnels: freediving content → actual lesson/tour detail → inquiry; films → making notes → collaboration/news request (classes preparing). Classify Story by its subject or saved override, not blindly from its URL. Search impressions/clicks, CTA clicks and completed inquiries are separate metrics. Without an approved analytics setup, conversions remain unmeasured.
