import { defineConfig } from "@playwright/test";

/**
 * 배포된 사이트(프리뷰·운영)를 확인하는 원격 스모크 시험 설정. 서버를 띄우지 않고 REMOTE_URL 을 그대로 쓴다.
 *   REMOTE_URL=https://프리뷰주소 npm run test:remote
 * - 접근 보호가 켜져 있으면 임시 공유 링크(쿼리 포함)를 REMOTE_URL 로 준다. 쿼리는 모든 이동에 붙는다.
 * - REMOTE_EXPECT_REGION=sin1 이면 폼 요청을 처리한 Vercel 함수 지역을 함께 확인한다.
 * 폼 시험은 smoke-*@example.com 가짜 데이터를 저장한다. 끝나면 `npm run db:cleanup-smoke` 로 지운다.
 */
const channel = process.env.PW_CHANNEL === undefined ? "chrome" : process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: "./tests/remote",
  outputDir: "./test-results-remote",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { channel, trace: "retain-on-failure", viewport: { width: 390, height: 844 } },
});
