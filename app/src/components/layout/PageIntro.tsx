import type { ReactNode } from "react";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { SectionTone } from "@/components/ui/Section";

interface PageIntroProps {
  label?: string;
  title: ReactNode;
  description?: ReactNode;
  tone?: SectionTone;
  children?: ReactNode;
}

/** 하위 페이지 맨 위의 제목 영역. 페이지의 h1 은 여기에 하나만 둔다. */
export function PageIntro({ label, title, description, tone = "dark", children }: PageIntroProps) {
  const surface = tone === "light" ? "light" : "dark";
  return (
    <Section tone={tone} sub>
      <SectionHeader label={label} title={title} description={description} as="h1" size="h1" surface={surface} />
      {children}
    </Section>
  );
}
