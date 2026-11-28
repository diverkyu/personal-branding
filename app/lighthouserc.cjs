const mode = process.env.SEO_LHCI_MODE || 'local';
if (!['local', 'public'].includes(mode)) throw new Error('SEO_LHCI_MODE must be local or public');
const local = mode === 'local';
const target = new URL(local ? 'http://127.0.0.1:3195' : process.env.SITE_URL);
if (!local && (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash || target.pathname !== '/')) {
  throw new Error('Public audit requires an approved HTTPS SITE_URL origin');
}

module.exports = {
  ci: {
    collect: {
      url: ['/', '/freediving', '/films'].map(path => `${target.origin}${path}`),
      numberOfRuns: 3,
      ...(local ? { startServerCommand: 'node node_modules/next/dist/bin/next start -p 3195 -H 127.0.0.1', startServerReadyTimeout: 30000 } : {}),
      settings: {
        formFactor: 'mobile',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        // Local fixtures intentionally remain noindex; production still checks crawlability.
        ...(local ? { skipAudits: ['is-crawlable'] } : {}),
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.7, aggregationMethod: 'median' }],
        'categories:accessibility': ['warn', { minScore: 0.9, aggregationMethod: 'median' }],
        'categories:best-practices': ['warn', { minScore: 0.9, aggregationMethod: 'median' }],
        'categories:seo': ['warn', { minScore: 0.9, aggregationMethod: 'median' }],
      },
    },
    upload: { target: 'filesystem', outputDir: 'artifacts/lighthouse/reports' },
  },
};
