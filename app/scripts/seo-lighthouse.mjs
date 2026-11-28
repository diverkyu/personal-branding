import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { summarizeLighthouse } from '../src/seo/diagnostics/lighthouse.ts';
import { parseDiagnosticReport } from '../src/seo/diagnostics/report.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const mode = process.argv[2] || 'local';
if (!['local', 'public'].includes(mode)) throw new Error('Usage: npm run seo:lhci -- local|public');
process.env.SEO_LHCI_MODE = mode;
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' };
if (mode === 'local') {
  Object.assign(env, {
    NEXT_DIST_DIR: '.next-lhci', SITE_URL: 'http://127.0.0.1:3195', SITE_INDEXING: 'off',
    DATABASE_URL: '', BETTER_AUTH_SECRET: '', MEDIA_STORE: '', INQUIRY_STORE: 'memory',
    BLOB_READ_WRITE_TOKEN: '', RESEND_API_KEY: '', CRON_SECRET: '',
  });
}
Object.assign(process.env, env);
const require = createRequire(import.meta.url);
const config = require('../lighthouserc.cjs');
const output = 'artifacts/lighthouse';
await mkdir(output, { recursive: true });
// Never leave an earlier successful summary pretending to be the current run.
await writeFile(`${output}/summary.json`, JSON.stringify({ schemaVersion: 1, status: 'running', mode, startedAt: new Date().toISOString() }));
await writeFile(`${output}/diagnostics.json`, '[]');

function run(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: root, env, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Tool exited ${code}`)));
  });
}

try {
  if (mode === 'local') await run('node_modules/next/dist/bin/next', ['build']);
  // Only three configured public paths. No credentials, forms or indexing submissions.
  if (mode === 'public') {
    for (const url of config.ci.collect.url) {
      const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
      await r.body?.cancel();
      if (r.status !== 200) throw new Error(`Public preflight returned HTTP ${r.status}`);
    }
  }
  await run('node_modules/@lhci/cli/src/cli.js', ['autorun', '--config=lighthouserc.cjs']);
  const manifest = JSON.parse(await readFile(`${output}/reports/manifest.json`, 'utf8'));
  const reports = await Promise.all(manifest.map(async item => JSON.parse(await readFile(item.jsonPath, 'utf8'))));
  const summary = summarizeLighthouse(reports, {
    mode, expectedUrls: config.ci.collect.url, expectedRuns: config.ci.collect.numberOfRuns,
    environment: process.env.SEO_MEASUREMENT_CONTEXT || `${process.platform}-${process.arch}-local`,
    runId: randomUUID(),
  });
  const diagnostics = summary.diagnostics.map(report => parseDiagnosticReport(JSON.stringify(report), new URL(config.ci.collect.url[0]).origin));
  await writeFile(`${output}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
  await writeFile(`${output}/summary.json`, JSON.stringify(summary, null, 2));
  process.stdout.write(`${JSON.stringify({ status: summary.status, pages: summary.pages.length, output: `${output}/summary.json` })}\n`);
  if (summary.status !== 'complete') process.exitCode = 1;
} catch (error) {
  await writeFile(`${output}/summary.json`, JSON.stringify({ schemaVersion: 1, status: 'failed', mode, finishedAt: new Date().toISOString() }));
  throw error;
}
