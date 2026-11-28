import { JSDOM } from 'jsdom';

// Read-only audit. Uses the repository's existing HTML parser, never runs page scripts.
const input = process.argv[2];
const mode = process.argv[3] ?? '--expect-off';
if (!input || !['--expect-on', '--expect-off'].includes(mode)) {
  throw new Error('Usage: npm run seo:audit -- https://your-site.example --expect-on|--expect-off');
}
const origin = new URL(input).origin;
const indexing = mode === '--expect-on';
const rows = [];
const titles = new Map();
const descriptions = new Map();
const report = (path, level, message) => rows.push({ path, level, message });

async function read(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'manual' });
  if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function duplicate(map, value, path, label, level) {
  if (!value) return;
  if (map.has(value)) report(path, level, `${label} duplicates ${map.get(value)}`);
  else map.set(value, path);
}

async function audit(url) {
  const path = new URL(url).pathname;
  try {
    const dom = new JSDOM(await read(url));
    const document = dom.window.document;
    const meta = (name) => document.querySelector(`meta[name="${name}"],meta[property="${name}"]`)?.content ?? '';
    const check = (ok, message) => { if (!ok) report(path, 'FAIL', message); };
    check(document.documentElement.lang === 'ko', 'lang must be ko');
    check(document.querySelectorAll('h1').length === 1, 'Expected one h1');
    check(Boolean(document.title.trim()), 'Missing title');
    duplicate(titles, document.title, path, 'Title', 'FAIL');
    const description = meta('description');
    check(Boolean(description.trim()), 'Missing description');
    duplicate(descriptions, description, path, 'Description', 'WARN');
    if (description.length < 40 || description.length > 160) report(path, 'WARN', 'Description outside editorial target 40–160 characters');
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
    check(Boolean(canonical) && new URL(canonical, origin).href === new URL(url).href, 'Canonical differs from sitemap URL');
    const noindex = /\bnoindex\b|\bnone\b/i.test(meta('robots'));
    check(indexing ? !noindex : noindex, `Expected indexing ${indexing ? 'on' : 'off'}`);
    for (const name of ['og:title', 'og:description', 'og:url', 'og:site_name', 'og:locale']) check(Boolean(meta(name)), `Missing ${name}`);
    if (!meta('og:image')) report(path, 'WARN', 'Missing share image (B phase)');
    for (const img of document.querySelectorAll('img')) check(img.hasAttribute('alt'), 'Image missing alt attribute');
    const emptyAlt = document.querySelectorAll('img[alt=""]').length;
    if (emptyAlt) report(path, 'REVIEW', `${emptyAlt} empty alt: confirm decorative/redundant images manually`);
    const required = { Person: ['name', 'url'], Article: ['headline', 'datePublished', 'author'], VideoObject: ['name', 'thumbnailUrl', 'uploadDate'], Event: ['name', 'startDate', 'location'] };
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      const parsed = JSON.parse(script.textContent);
      const entries = Array.isArray(parsed) ? parsed : parsed['@graph'] ?? [parsed];
      for (const entry of entries) {
        for (const field of required[entry['@type']] ?? []) check(Boolean(entry[field]), `${entry['@type']} missing ${field}`);
        if (entry.author && !entry.author.url && !entry.author['@id']) report(path, 'WARN', 'Author not linked to profile');
      }
    }
    dom.window.close();
    report(path, 'CHECKED', 'HTML checked; image meaning and search engine indexing require manual review');
  } catch (error) {
    report(path, 'FAIL', error.message);
  }
}

try {
  const robots = await read(`${origin}/robots.txt`);
  const blocked = /^Disallow:\s*\/\s*$/im.test(robots);
  if (blocked === indexing) report('/robots.txt', 'FAIL', `Expected indexing ${indexing ? 'on' : 'off'}`);
  if (indexing && !robots.includes(`${origin}/sitemap.xml`)) report('/robots.txt', 'FAIL', 'Missing sitemap declaration');
  const xml = new JSDOM(await read(`${origin}/sitemap.xml`), { contentType: 'text/xml' });
  const urls = [...xml.window.document.querySelectorAll('url > loc')].map((node) => node.textContent.trim());
  if (!urls.length) throw new Error('Sitemap has no URLs');
  for (const url of new Set(urls)) {
    const target = new URL(url);
    if (target.origin !== origin || target.search || target.hash || /^\/(admin|api|dev|media-dev)(\/|$)/.test(target.pathname)) {
      report(target.pathname, 'FAIL', 'Invalid sitemap destination');
      continue;
    }
    await audit(url);
  }
  xml.window.close();
} catch (error) {
  report('/', 'FAIL', error.message);
}
console.table(rows);
process.stdout.write(`Expected indexing: ${indexing ? 'on' : 'off'}. FAIL=${rows.filter(r => r.level === 'FAIL').length}, WARN=${rows.filter(r => r.level === 'WARN').length}\n`);
process.exitCode = rows.some(row => row.level === 'FAIL') ? 1 : 0;
