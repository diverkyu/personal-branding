import type { Metadata, Viewport } from "next";
import { DM_Sans, Lora, Noto_Sans_KR } from "next/font/google";
import { isIndexingAllowed, resolveSiteUrl } from "@/config/env";
import { siteConfig } from "@/config/site";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import "./globals.css";

// 글꼴은 빌드 때 내려받아 사이트에서 직접 제공한다 (방문자 접속 정보가 Google 로 가지 않음).
// 세 글꼴 모두 SIL OFL 1.1 — THIRD-PARTY-NOTICES.md 참고.
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-kr",
  display: "swap",
  preload: false,
});

const lora = Lora({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["400"],
  variable: "--font-lora",
  display: "swap",
});

const site = resolveSiteUrl(process.env);

export const metadata: Metadata = {
  metadataBase: site.url,
  title: { default: siteConfig.defaultTitle, template: siteConfig.titleTemplate },
  description: siteConfig.description,
  // 공개 전에는 색인되지 않게 한다. 게시 때 SITE_INDEXING=on 으로 켠다.
  robots: isIndexingAllowed(process.env) ? { index: true, follow: true } : { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${dmSans.variable} ${notoSansKr.variable} ${lora.variable}`}>
      <body>
        <SkipLink />
        <SiteHeader />
        {/* 모든 화면의 본문. 건너뛰기 링크의 목적지이며 h1 은 화면마다 하나다 */}
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
