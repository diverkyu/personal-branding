import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * 홈 화면 추가(설치) 정보 (GL-F5, DESIGN-SYSTEM §홈 화면 아이콘). `/manifest.webmanifest` 로 제공된다.
 * - 안드로이드 크롬은 이 파일과 192·512 아이콘이 있으면 "앱 설치"를 제안한다. iPhone 은 `apple-icon.png` 와 layout 의 appleWebApp 을 쓴다.
 * - 오프라인 캐시(service worker)는 두지 않는다. 내용이 자주 바뀌는 사이트라 예전 화면이 남는 문제를 피한다.
 * - 아이콘은 `scripts/make-app-icons.mjs` 로 만든다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: siteConfig.defaultTitle,
    short_name: siteConfig.name,
    description: siteConfig.description,
    lang: "ko",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: siteConfig.themeColor,
    theme_color: siteConfig.themeColor,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
