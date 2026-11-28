// Run the SEO page Vitest first. These are isolated actual-component renders,
// not authenticated production screenshots or proof of live API connectivity.
import { chromium } from "@playwright/test";
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const folder = path.resolve("artifacts/seo-ui");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    for (const file of (await readdir(folder)).filter(f => f.endsWith(".html"))) {
      await page.goto(pathToFileURL(path.join(folder, file)).href);
      // Open all edit/manual fields to exercise the largest journal layout.
      await page.locator("main details").evaluateAll(nodes => nodes.forEach(n => n.open = true));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await page.screenshot({ path: path.join(folder, `${file.slice(0, -5)}-${width}.png`), fullPage: true });
      results.push({ file, width, overflow });
    }
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(path.join(folder, "results.json"), JSON.stringify(results, null, 2));
const failures = results.filter(r => r.overflow > 0);
process.stdout.write(JSON.stringify({ checked: results.length, failures }) + "\n");
if (failures.length) process.exitCode = 1;
