import { notFound } from "next/navigation";
import { aboutMediaIds } from "@/about/fields";
import { AboutView } from "@/components/site/AboutView";
import { ContentBody, type BodyMedia } from "@/content/ContentBody";
import { getAbout } from "@/data/admin/about";
import { adminDb } from "@/data/admin/dbServer";
import { getMediaByIds } from "@/data/admin/media";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "About 미리보기 · KYU 어드민", robots: { index: false, follow: false } };

/** 수정 중인 About 을 공개 화면과 같은 모양으로 보여 준다 (공개되지 않는다). 어드민 로그인이 있어야 열린다 */
export default async function AboutPreviewPage() {
  const admin = await requireAdmin();
  const db = adminDb();
  const view = await getAbout(db, admin);
  if (!view.row) notFound();
  const content = view.editable;
  const media: BodyMedia[] = await getMediaByIds(db, admin, aboutMediaIds(content));
  const photoRow = content.photoMediaId ? media.find((m) => m.id === content.photoMediaId) : undefined;
  const photo = photoRow && photoRow.alt.trim() ? { url: photoRow.url, alt: photoRow.alt.trim(), width: photoRow.width, height: photoRow.height } : null;
  return (
    <AboutView headline={content.headline || "(헤드라인 없음)"} signature={content.signature} photo={photo}>
      <ContentBody doc={content.body} media={new Map(media.map((m) => [m.id, m]))} />
    </AboutView>
  );
}
