import { Fragment, type ReactNode } from "react";
import { ContactSection } from "@/components/site/ContactSection";
import { PageIntro } from "@/components/layout/PageIntro";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import pages from "@/app/pages.module.css";

/** 헤드라인의 줄바꿈(최대 2줄)을 화면의 줄바꿈으로 */
function Headline({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 ? <br /> : null}
          {line}
        </Fragment>
      ))}
    </>
  );
}

export interface AboutViewProps {
  headline: string;
  signature: string;
  photo: { url: string; alt: string; width: number; height: number } | null;
  /** 본문 (공개 화면·미리보기가 같은 모양으로 그린다) */
  children: ReactNode;
}

/** ABOUT 화면 본체 (SCREEN-SPEC §5.2). 공개 /about 과 어드민 미리보기가 함께 쓴다 */
export function AboutView({ headline, signature, photo, children }: AboutViewProps) {
  return (
    <>
      <PageIntro label="01 / ABOUT KYU" tone="light" title={<Headline text={headline} />} />
      <Section tone="light" sub>
        {photo ? (
          <p style={{ margin: "0 0 32px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={photo.alt} width={photo.width} height={photo.height} style={{ maxWidth: 320, width: "100%", height: "auto" }} />
          </p>
        ) : null}
        <div className={pages.prose}>
          {children}
          {signature ? (
            <p className={pages.signature} style={{ color: "var(--kyu-navy)" }}>
              {signature}
            </p>
          ) : null}
        </div>
        <div className={pages.chips}>
          <Button href="/story" variant="outline" surface="light" size="S">
            Story 보기
          </Button>
          <Button href="/freediving" variant="outline" surface="light" size="S">
            Freediving 보기
          </Button>
        </div>
      </Section>
      <ContactSection />
    </>
  );
}
