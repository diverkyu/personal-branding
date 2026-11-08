import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    // PGlite(메모리 Postgres)를 파일마다 띄우는 시험이 병렬로 몰려도 시작 지연 때문에 실패하지 않게 여유를 둔다
    testTimeout: 30_000,
    hookTimeout: 60_000,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
