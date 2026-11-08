import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// DEVELOPMENT.md §5: console.log 금지(로거 사용). logger 모듈 자체만 예외.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/logger.ts"],
    rules: {
      "no-console": "error",
      "no-empty": ["error", { allowEmptyCatch: false }],
    },
  },
  globalIgnores([".next/**", ".next-e2e/**", ".next-dev/**", "out/**", "build/**", "next-env.d.ts", "test-results/**", "playwright-report/**"]),
]);

export default eslintConfig;
