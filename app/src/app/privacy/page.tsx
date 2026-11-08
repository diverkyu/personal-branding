import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/PageIntro";
import { Section } from "@/components/ui/Section";
import pages from "../pages.module.css";

export const metadata: Metadata = { title: "개인정보 처리방침" };

/** LEGAL (SCREEN-SPEC §5.12). 본문은 어드민에서 편집하며, 공개 전 전문가 확인이 필요하다(SECURITY §9). */
export default function PrivacyPage() {
  return (
    <>
      <PageIntro tone="light" title="개인정보 처리방침" />
      <Section tone="light" sub>
        <div className={pages.prose}>
          <p>
            이 문서는 준비 중입니다. 문의 접수 기능을 열기 전에 수집 항목, 이용 목적, 보관 기간, 제3자 제공 여부를 정리해 법률 전문가의 확인을 받은 뒤 게시합니다.
          </p>
        </div>
      </Section>
    </>
  );
}
