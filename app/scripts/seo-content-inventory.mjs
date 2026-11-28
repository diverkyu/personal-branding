// Read-only inventory of public pages. Never follows off-site sitemap entries.
import { JSDOM } from 'jsdom';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = new URL(process.argv[2] || 'http://localhost:3000').origin;
const read = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'manual' });
  return { status: response.status, html: await response.text() };
};
const sitemap = await read(`${origin}/sitemap.xml`);
const xml = new JSDOM(sitemap.html, { contentType: 'text/xml' }).window.document;
const sections = ['/', '/about', '/contact', '/privacy', '/story', '/films', '/freediving', '/freediving/tours', '/freediving/equipment', '/freediving/reviews', '/freediving/travel'];
const urls = [...new Set([...xml.querySelectorAll('loc')].map(n => n.textContent).concat(sections.map(p => origin + p)).map(value => new URL(value).href))];
const rows = [];
for (const url of urls) {
  if (new URL(url).origin !== origin) throw new Error('Off-site sitemap URL');
  const response = await read(url);
  const doc = new JSDOM(response.html).window.document;
  const meta = (name) => doc.querySelector(`meta[name="${name}"],meta[property="${name}"]`)?.getAttribute('content') || '';
  const main = doc.querySelector('main')?.cloneNode(true);
  main?.querySelectorAll('script, style').forEach(n => n.remove());
  rows.push({ path: new URL(url).pathname, status: response.status, title: doc.title, description: meta('description'), robots: meta('robots'), canonical: doc.querySelector('link[rel="canonical"]')?.href,
    ogTitle: meta('og:title'), ogDescription: meta('og:description'), ogImage: meta('og:image'), twitter: meta('twitter:card'), h1: [...doc.querySelectorAll('h1')].map(n => n.textContent),
    images: [...doc.querySelectorAll('main img')].map(n => ({ src: n.getAttribute('src'), alt: n.getAttribute('alt') })),
    structured: [...doc.querySelectorAll('script[type="application/ld+json"]')].map(n => JSON.parse(n.textContent)),
    text: main?.textContent?.replace(/\s+/g, ' ').trim() || '' });
}
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/seo-content-inventory.json', JSON.stringify(rows, null, 2));
for (const r of rows) console.log(JSON.stringify({ path: r.path, status: r.status, title: r.title, description: r.description, robots: r.robots, ogImage: Boolean(r.ogImage), missingAlt: r.images.filter(i => i.alt === null).length }));
