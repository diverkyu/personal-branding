/**
 * 연락 영역·푸터가 쓰는 연락처 묶음 (SCREEN-SPEC CONTACT-03·07, ABOUT-07, GL-F3). 순수 함수.
 * 모든 연락 영역이 같은 사이트 설정을 읽도록 한곳에서 만든다 — 어드민에서 바꾸면 홈·/contact·About·푸터가 함께 바뀐다.
 */
import { contactConfig } from "@/config/site";
import type { ResolvedSettings } from "./registry";

export type SocialKind = "instagram" | "youtube";

export interface SocialLink {
  kind: SocialKind;
  /** 화면에 보이지 않는 이름 (읽기 도구가 읽는다) */
  label: string;
  href: string;
}

const SOCIAL: { kind: SocialKind; key: string; label: string }[] = [
  { kind: "instagram", key: "social.instagram", label: "인스타그램" },
  { kind: "youtube", key: "social.youtube", label: "유튜브" },
];

/** 주소가 들어 있는 SNS 만, 정해진 순서(인스타그램 → 유튜브)로 */
export function socialLinksOf(settings: ResolvedSettings): SocialLink[] {
  return SOCIAL.flatMap(({ kind, key, label }) => {
    const href = settings[key]?.trim();
    return href ? [{ kind, label, href }] : [];
  });
}

export interface ContactProps {
  email: string;
  intro: string[];
  social: SocialLink[];
}

export function contactPropsOf(settings: ResolvedSettings): ContactProps {
  return {
    email: settings["contact.email"] || contactConfig.email,
    intro: (settings["contact.intro"] || contactConfig.intro.join("\n")).split("\n"),
    social: socialLinksOf(settings),
  };
}
