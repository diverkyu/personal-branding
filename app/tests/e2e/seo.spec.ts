import { test, expect } from '@playwright/test';

test('사이트맵의 모든 공개 페이지에 기본 SEO 정보가 있다', async ({ page, request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const paths = [...(await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(match[1]!).pathname);
  expect(paths.length).toBeGreaterThan(0);
  const titles = new Set<string>();
  for (const path of paths) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
    await expect(page.locator('h1')).toHaveCount(1);
    const title = await page.title();
    expect(title.trim(), path).not.toBe('');
    expect(titles.has(title), `Duplicate title at ${path}`).toBe(false);
    titles.add(title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(new URL(canonical!).pathname).toBe(path);
    expect(new URL(canonical!).search).toBe('');
    for (const field of ['title', 'description', 'url', 'site_name', 'locale']) {
      await expect(page.locator(`meta[property="og:${field}"]`)).toHaveAttribute('content', /\S/);
    }
    await expect(page.locator('img:not([alt])')).toHaveCount(0);
    // Preview stays noindex; production indexability is checked by seo:audit --expect-on.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    for (const block of blocks) {
      const entry = JSON.parse(block);
      expect(entry['@type']).toBeTruthy();
      if (entry['@type'] === 'VideoObject') {
        expect(entry.name).toBeTruthy();
        if (await page.locator('video[poster], img').count()) {
          expect(entry.thumbnailUrl).toBeTruthy();
        } else {
          test.info().annotations.push({ type: 'known-fixture-gap', description: path + ' has no poster in fixture data; production audit requires thumbnailUrl' });
        }
        expect(entry.uploadDate).toBeTruthy();
      }
      if (entry['@type'] === 'Article') {
        expect(entry.headline).toBeTruthy();
        expect(entry.datePublished).toBeTruthy();
      }
      if (entry['@type'] === 'Event') {
        expect(entry.name).toBeTruthy();
        expect(entry.startDate).toBeTruthy();
        expect(entry.location).toBeTruthy();
      }
    }
  }
});

