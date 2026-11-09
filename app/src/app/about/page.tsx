import type { Metadata } from "next";
import { DEFAULT_ABOUT } from "@/about/fields";
import { AboutView } from "@/components/site/AboutView";
import { ContentBody } from "@/content/ContentBody";
import { getPublicAbout } from "@/data/about";

export const metadata: Metadata = { title: "About" };

/** 새 내용이 공개 반영되면 캐시가 갱신되고, 최대 5분 안에는 반드시 새 내용을 읽는다 */
export const revalidate = 300;

/**
 * ABOUT (SCREEN-SPEC §5.2). 어드민에서 공개한 내용이 있으면 그것을, 없으면 확정 카피(기본 문구)를 보여 준다.
 * 실제 이력·자격은 규강이 확인한 내용만 쓴다 — 어드민에서도 "공개 반영"을 눌러야만 바뀐다.
 */
export default async function AboutPage() {
  const about = await getPublicAbout();
  if (!about) {
    return (
      <AboutView headline={DEFAULT_ABOUT.headline} signature={DEFAULT_ABOUT.signature} photo={null}>
        {DEFAULT_ABOUT.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </AboutView>
    );
  }
  return (
    <AboutView headline={about.headline} signature={about.signature} photo={about.photo}>
      <ContentBody doc={about.doc} media={new Map(about.media.map((m) => [m.id, m]))} />
    </AboutView>
  );
}
