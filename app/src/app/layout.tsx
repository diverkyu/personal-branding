import type { Metadata, Viewport } from "next";
import { DM_Sans, Lora, Noto_Sans_KR } from "next/font/google";
import { isIndexingAllowed, resolveSiteUrl } from "@/config/env";
import { siteConfig } from "@/config/site";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { listFilms } from "@/data/films";
import { getSiteSettings } from "@/settings/read";
import { SiteFrame } from "@/components/layout/SiteFrame";
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

/** 제목·기본 설명은 사이트 설정(검색·공유)에서 온다. 설정을 읽지 못하면 기본값이다. */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
  metadataBase: site.url,
  title: { default: settings["seo.title"] ?? siteConfig.defaultTitle, template: siteConfig.titleTemplate },
  description: settings["seo.description"] ?? siteConfig.description,
  // 공개 전에는 색인되지 않게 한다. 게시 때 SITE_INDEXING=on 으로 켠다.
  robots: isIndexingAllowed(process.env) ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSiteSettings();
  // 공개 작품이 하나라도 있어야 메뉴에 Films 가 보인다
  const showFilms = (await listFilms()).length > 0;
  return (
    <html lang="ko" className={`${dmSans.variable} ${notoSansKr.variable} ${lora.variable}`}>
      <body>
        <SiteFrame skip={<SkipLink />} header={<SiteHeader showFilms={showFilms} />} footer={<SiteFooter owner={settings["footer.owner"]} />}>
          {children}
        </SiteFrame>
      </body>
    </html>
  );
}
