import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/PageIntro";
import { Section } from "@/components/ui/Section";
import { formatDateTimeKst } from "@/lib/format";
import { getPrivacyPolicy } from "@/settings/read";
import pages from "../pages.module.css";

export const metadata: Metadata = { title: "개인정보 처리방침" };

/** LEGAL (SCREEN-SPEC §5.12). 본문은 어드민(동의·방침)에서 새 버전으로 게시한다. 공개 전 전문가 확인이 필요하다(SECURITY §9). 게시된 버전이 없으면 준비 중 안내를 보여 준다. */
export default async function PrivacyPage() {
  const policy = await getPrivacyPolicy();
  const paragraphs = policy ? policy.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) : [];
  return (
    <>
      <PageIntro tone="light" title="개인정보 처리방침" />
      <Section tone="light" sub>
        <div className={pages.prose}>
          {policy ? (
            <>
              <p>시행일: {formatDateTimeKst(policy.effectiveFrom).slice(0, 10)}</p>
              {paragraphs.map((p, i) => (
                <p key={i} style={{ whiteSpace: "pre-line" }}>
                  {p}
                </p>
              ))}
            </>
          ) : (
            <p>
              이 문서는 준비 중입니다. 문의 접수 기능을 열기 전에 수집 항목, 이용 목적, 보관 기간, 제3자 제공 여부를 정리해 법률 전문가의 확인을 받은 뒤 게시합니다.
            </p>
          )}
        </div>
      </Section>
    </>
  );
}
