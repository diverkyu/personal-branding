import { defineConfig } from "@playwright/test";

/**
 * E2E 시험 설정 (DEVELOPMENT.md §8).
 * - 운영 빌드(build + start)를 별도 포트·출력 폴더로 띄워 개발 서버와 섞이지 않게 한다.
 * - 화면 크기 3종(390 / 768 / 1440)에서 같은 시나리오를 돌린다.
 * - 브라우저는 설치된 Chrome 을 쓴다(내려받기 없음). 번들 Chromium 을 쓰려면 PW_CHANNEL= 로 비운다.
 */
const PORT = 3100;
const channel = process.env.PW_CHANNEL === undefined ? "chrome" : process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile-390", use: { viewport: { width: 390, height: 844 } } },
    { name: "tablet-768", use: { viewport: { width: 768, height: 1024 } } },
    { name: "desktop-1440", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT} -H 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      SITE_URL: `http://127.0.0.1:${PORT}`,
      SITE_INDEXING: "off",
      LOG_LEVEL: "info",
    },
  },
});
