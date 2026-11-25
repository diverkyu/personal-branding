import { Fragment, type ReactNode } from "react";
import { ContactSection } from "@/components/site/ContactSection";
import { PageIntro } from "@/components/layout/PageIntro";
import { Button } from "@/components/ui/Button";
import type { ContactProps } from "@/settings/social";
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
  /** 하단 Contact 영역의 이메일·안내문·SNS (사이트 설정). 홈·/contact 와 같은 값을 쓴다 */
  contact: ContactProps;
}

/** ABOUT 화면 본체 (SCREEN-SPEC §5.2). 공개 /about 과 어드민 미리보기가 함께 쓴다 */
export function AboutView({ headline, signature, photo, children, contact }: AboutViewProps) {
  return (
    <>
      {/* 같은 색 Section 을 따로 두면 위아래 여백이 겹쳐 제목 아래가 크게 빈다 → PageIntro 안에 넣는다 (DESIGN-SYSTEM §3.1) */}
      <PageIntro label="01 / ABOUT KYU" tone="light" title={<Headline text={headline} />}>
        <div className={pages.after}>
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
        </div>
      </PageIntro>
      <ContactSection {...contact} />
    </>
  );
}
