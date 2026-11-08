import type { ReactNode } from "react";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { SectionTone } from "@/components/ui/Section";

interface PageIntroProps {
  label?: string;
  title: ReactNode;
  description?: ReactNode;
  /** 제목 아래(왼쪽)에 두는 한두 줄 소개. description 은 제목 오른쪽 */
  lead?: ReactNode;
  tone?: SectionTone;
  children?: ReactNode;
}

/** 하위 페이지 맨 위의 제목 영역. 페이지의 h1 은 여기에 하나만 둔다. */
export function PageIntro({ label, title, description, lead, tone = "dark", children }: PageIntroProps) {
  const surface = tone === "light" ? "light" : "dark";
  return (
    <Section tone={tone} sub>
      <SectionHeader label={label} title={title} description={description} as="h1" size="h1" surface={surface} />
      {lead ? <p style={{ marginTop: 32, maxWidth: 460, lineHeight: 1.9, color: surface === "light" ? "var(--kyu-ink-sub)" : "var(--kyu-teal-text)" }}>{lead}</p> : null}
      {children}
    </Section>
  );
}
