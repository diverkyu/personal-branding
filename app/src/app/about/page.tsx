import type { Metadata } from "next";
import { DEFAULT_ABOUT } from "@/about/fields";
import { AboutView } from "@/components/site/AboutView";
import { ContentBody } from "@/content/ContentBody";
import { getPublicAbout } from "@/data/about";
import { getSiteSettings } from "@/settings/read";
import { contactPropsOf } from "@/settings/social";
import { JsonLd } from "@/components/site/JsonLd";
import { resolveSiteUrl } from "@/config/env";
import { personLd } from "@/lib/structured";
import { sectionMeta } from "@/lib/seo";

export const metadata: Metadata = sectionMeta("/about");

/** 새 내용이 공개 반영되면 캐시가 갱신되고, 최대 5분 안에는 반드시 새 내용을 읽는다 */
export const revalidate = 300;

/**
 * ABOUT (SCREEN-SPEC §5.2). 어드민에서 공개한 내용이 있으면 그것을, 없으면 확정 카피(기본 문구)를 보여 준다.
 * 실제 이력·자격은 규강이 확인한 내용만 쓴다 — 어드민에서도 "공개 반영"을 눌러야만 바뀐다.
 */
export default async function AboutPage() {
  const about = await getPublicAbout();
  const contact = contactPropsOf(await getSiteSettings());
  // 이 화면이 인물 정보(@id …/about#person)의 기준 주소다. 홈의 WebSite 가 이것을 가리킨다
  const person = <JsonLd data={personLd(resolveSiteUrl(process.env).url.origin, contact.social.map((l) => l.href))} />;
  if (!about) {
    return (
      <>
        {person}
        <AboutView headline={DEFAULT_ABOUT.headline} signature={DEFAULT_ABOUT.signature} photo={null} contact={contact}>
          {DEFAULT_ABOUT.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </AboutView>
      </>
    );
  }
  return (
    <>
      {person}
      <AboutView headline={about.headline} signature={about.signature} photo={about.photo} contact={contact}>
        <ContentBody doc={about.doc} media={new Map(about.media.map((m) => [m.id, m]))} />
      </AboutView>
    </>
  );
}
