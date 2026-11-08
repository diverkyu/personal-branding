import type { EnvSource } from "./env";

/**
 * 컴포넌트 쇼케이스(/dev/components)는 개발·시험용이다.
 * 운영(production)에서는 ENABLE_COMPONENT_SHOWCASE=on 일 때만 열린다 — 기본은 404.
 * (E2E 는 운영 빌드를 쓰므로 이 값을 켠다.)
 */
export function isShowcaseEnabled(env: EnvSource): boolean {
  return env.NODE_ENV !== "production" || env.ENABLE_COMPONENT_SHOWCASE === "on";
}
