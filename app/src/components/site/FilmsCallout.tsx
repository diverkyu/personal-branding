import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionHeader";
import { filmsConfig, filmsMailto } from "@/config/films";
import styles from "./FilmsCallout.module.css";

/** AI 특강 소식 띠 (FILMS-09, FILMD-11, INT-18). 제목이 채워진 메일 창을 열 뿐이고 서버에 저장하지 않는다 */
export function FilmsCallout({ email, title = filmsConfig.callout.title, body = filmsConfig.callout.body }: { email: string; title?: string; body?: string }) {
  const c = filmsConfig.callout;
  return (
    <Section tone="teal" sub labelledBy="films-callout-title">
      <div className={styles.row}>
        <div className={styles.text}>
          <SectionLabel>{c.label}</SectionLabel>
          <h2 id="films-callout-title" className={styles.title}>
            {title}
          </h2>
          <p className={styles.body}>{body}</p>
        </div>
        <Button href={filmsMailto(email)} variant="primary" size="M" icon="arrow-up-right">
          {c.button}
        </Button>
      </div>
    </Section>
  );
}
