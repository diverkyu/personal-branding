import { HomeHeroSection } from "@/components/site/HomeHeroSection";
import { getHomeHero } from "@/data/admin/homeHero";
import { adminDb } from "@/data/admin/dbServer";
import { requireAdmin } from "@/lib/auth/session";
import { getSiteSettings } from "@/settings/read";

export const metadata = { title: "홈 히어로 미리보기 · KYU 어드민", robots: { index: false, follow: false } };

/** 수정 중인 히어로 이미지를 홈과 같은 모양으로 보여 준다 (공개되지 않는다). 대체 텍스트가 없으면 공개 화면처럼 기본 일러스트가 보인다 */
export default async function HomeHeroPreviewPage() {
  const admin = await requireAdmin();
  const view = await getHomeHero(adminDb(), admin);
  const settings = await getSiteSettings();
  const m = view.editable;
  const image = m && m.alt.trim() ? { url: m.url, alt: m.alt.trim(), width: m.width, height: m.height } : null;
  return <HomeHeroSection settings={settings} image={image} />;
}
