import type { Metadata } from "next";
import { ContactSection } from "@/components/site/ContactSection";
import { PageIntro } from "@/components/layout/PageIntro";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import pages from "../pages.module.css";

export const metadata: Metadata = { title: "About" };

/** ABOUT (SCREEN-SPEC §5.2). 실제 이력·자격은 규강이 확인한 내용만 쓴다 — 아래는 확정 카피만 사용한다. */
export default function AboutPage() {
  return (
    <>
      <PageIntro
        label="01 / ABOUT KYU"
        tone="light"
        title={
          <>
            서로 다른 두 세계.
            <br />
            하나의 호기심.
          </>
        }
      />
      <Section tone="light" sub>
        <div className={pages.prose}>
          <p>
            몸으로 경험하는 바다와 상상으로 만드는 세계. 프리다이빙과 AI 크리에이티브는 저를 소개하는 두 가지 언어입니다.
          </p>
          <p>물속의 고요함을 마주하는 순간부터 새로운 이미지를 만들어내는 순간까지. 저는 경계 너머의 가능성을 탐험합니다.</p>
          <p className={pages.signature} style={{ color: "var(--kyu-navy)" }}>
            이동규 aka. KYU
          </p>
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
