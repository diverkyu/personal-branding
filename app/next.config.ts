import type { NextConfig } from "next";

// 시험(E2E)은 개발 빌드와 섞이지 않게 별도 출력 폴더를 쓴다.
const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // 어드민 이미지 업로드(최대 4MB)를 서버 액션으로 받는다. 파일 크기는 서버 액션 안에서 다시 확인한다.
    serverActions: { bodySizeLimit: "5mb" },
  },
  async headers() {
    // SECURITY.md §12 기본 헤더. CSP·HSTS는 호스팅·도메인 확정 후 추가한다.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // 어드민·인증 응답은 캐시하지 않고 색인에서 제외한다 (SECURITY §12). proxy.ts 도 같은 헤더를 건다.
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      { source: "/api/auth/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
