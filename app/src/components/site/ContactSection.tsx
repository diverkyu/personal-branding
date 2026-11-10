import { filmsMailto } from "@/config/films";
import { contactConfig } from "@/config/site";
import { SOCIAL_LINKS } from "@/config/nav";
import { Section } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionHeader";
import { SmartLink } from "@/components/ui/SmartLink";
import { Icon } from "@/components/ui/Icon";
import { CopyEmailButton } from "./CopyEmailButton";
import styles from "./ContactSection.module.css";

/** 홈 하단과 /contact 가 함께 쓰는 Contact 영역 (SCREEN-SPEC §5.11). 페이지의 h1 이 아니므로 기본은 h2. */
export function ContactSection({ asPage = false, email = contactConfig.email, intro = contactConfig.intro, withFilms = false }: { asPage?: boolean; email?: string; intro?: readonly string[]; withFilms?: boolean }) {
  const { subjects } = contactConfig;
  const Title = asPage ? "h1" : "h2";
  return (
    <Section tone="teal" id="contact" labelledBy="contact-title">
      <SectionLabel>{withFilms ? "05" : "04"} / LET’S CONNECT</SectionLabel>
      <Title id="contact-title" className={styles.title}>
        다음 탐험은,
        <br />
        <span className={styles.accent}>함께.</span>
      </Title>
      <div className={styles.row}>
        <div>
          <p className={styles.intro}>
            {intro.map((line, i) => (
              <span key={i}>
                {line}
                {i < intro.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
          <a className={styles.email} href={`mailto:${email}`}>
            {email}
            <Icon name="arrow-up-right" size={24} />
          </a>
        </div>
        <CopyEmailButton email={email} />
      </div>
      <ul className={styles.subjects}>
        {subjects.map((s) => (
          <li key={s.label}>
            <a href={`mailto:${email}?subject=${encodeURIComponent(s.subject)}`}>
              {s.label}
              <Icon name="arrow-up-right" size={16} />
            </a>
          </li>
        ))}
        {withFilms ? (
          <li>
            <a href={filmsMailto(email)}>
              AI 영상 특강 소식 요청하기
              <Icon name="arrow-up-right" size={16} />
            </a>
          </li>
        ) : null}
        {SOCIAL_LINKS.slice(0, 4).map((l) => (
          <li key={l.href}>
            <SmartLink href={l.href}>
              {l.label}
              <Icon name="arrow-up-right" size={16} />
            </SmartLink>
          </li>
        ))}
      </ul>
    </Section>
  );
}
