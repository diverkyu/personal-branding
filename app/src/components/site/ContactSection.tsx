import { contactConfig } from "@/config/site";
import { SOCIAL_LINKS } from "@/config/nav";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SmartLink } from "@/components/ui/SmartLink";
import { Icon } from "@/components/ui/Icon";
import { CopyEmailButton } from "./CopyEmailButton";
import styles from "./ContactSection.module.css";

/** 홈 하단과 /contact 가 함께 쓰는 Contact 영역 (SCREEN-SPEC §5.11). 페이지의 h1 이 아니므로 기본은 h2. */
export function ContactSection({ asPage = false }: { asPage?: boolean }) {
  const { email, intro, subjects } = contactConfig;
  return (
    <Section tone="teal" id="contact" labelledBy="contact-title">
      <SectionHeader
        label="04 / LET’S CONNECT"
        titleId="contact-title"
        as={asPage ? "h1" : "h2"}
        size={asPage ? "h1" : "h2"}
        title={
          <>
            다음 탐험은,
            <br />
            함께.
          </>
        }
        description={intro}
      />
      <div className={styles.body}>
        <a className={styles.email} href={`mailto:${email}`}>
          {email}
        </a>
        <CopyEmailButton email={email} />
        <ul className={styles.subjects}>
          {subjects.map((s) => (
            <li key={s.label}>
              <a href={`mailto:${email}?subject=${encodeURIComponent(s.subject)}`}>
                {s.label}
                <Icon name="arrow-up-right" size={16} />
              </a>
            </li>
          ))}
          {SOCIAL_LINKS.slice(0, 4).map((l) => (
            <li key={l.href}>
              <SmartLink href={l.href}>
                {l.label}
                <Icon name="arrow-up-right" size={16} />
              </SmartLink>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
