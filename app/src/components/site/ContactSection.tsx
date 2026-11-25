import { filmsMailto } from "@/config/films";
import { contactConfig } from "@/config/site";
import { Section } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionHeader";
import { Icon } from "@/components/ui/Icon";
import type { SocialLink } from "@/settings/social";
import { CopyEmailButton } from "./CopyEmailButton";
import { SocialLinks } from "./SocialIcon";
import styles from "./ContactSection.module.css";

/**
 * 홈 하단·/contact·About 하단이 함께 쓰는 Contact 영역 (SCREEN-SPEC §5.11). 페이지의 h1 이 아니므로 기본은 h2.
 * 이메일·안내문·SNS 는 사이트 설정에서 온다(`contactPropsOf`). 기본값은 화면 시험용이다.
 */
export function ContactSection({ asPage = false, email = contactConfig.email, intro = contactConfig.intro, social = [], withFilms = false }: { asPage?: boolean; email?: string; intro?: readonly string[]; social?: SocialLink[]; withFilms?: boolean }) {
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
      <p className={styles.intro}>
        {intro.map((line, i) => (
          <span key={i}>
            {line}
            {i < intro.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
      {/* 복사 버튼은 이메일 바로 옆에 둔다 — 무엇을 복사하는지 짝으로 보이게 (CONTACT-04) */}
      <div className={styles.emailRow}>
        <a className={styles.email} href={`mailto:${email}`}>
          {email}
          <Icon name="arrow-up-right" size={24} />
        </a>
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
      </ul>
      <SocialLinks links={social} className={styles.social} itemClassName={styles.socialLink} />
    </Section>
  );
}
