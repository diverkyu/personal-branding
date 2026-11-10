import { Icon } from "@/components/ui/Icon";
import { SmartLink } from "@/components/ui/SmartLink";
import styles from "./FilmCard.module.css";

export interface FilmCardData {
  href: string;
  title: string;
  summary?: string;
  /** 표시용 날짜 문구. 예: "2026.11.08" */
  dateLabel: string;
  duration?: string;
  hasCaptions?: boolean;
  poster?: { src: string; alt: string };
  headingLevel?: 2 | 3;
}

/**
 * 작품 카드 (FILMS-07). 제목이 링크이고 링크 영역을 카드 전체로 넓힌다(stretched link). 재생은 상세에서 한다.
 * 재생 아이콘은 장식이다(카드 자체가 상세로 가는 링크).
 */
export function FilmCard({ href, title, summary, dateLabel, duration, hasCaptions, poster, headingLevel = 3 }: FilmCardData) {
  const Heading = `h${headingLevel}` as "h2" | "h3";
  const meta = [dateLabel, hasCaptions ? "자막 있음" : ""].filter(Boolean).join(" · ");
  return (
    <article className={styles.card}>
      <div className={styles.media}>
        {poster?.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.poster} src={poster.src} alt={poster.alt} loading="lazy" decoding="async" />
        ) : null}
        <span className={styles.play} aria-hidden="true">
          <Icon name="play" size={24} />
        </span>
        {duration ? <span className={styles.duration}>{duration}</span> : null}
      </div>
      <p className={styles.meta}>{meta}</p>
      <Heading className={styles.title}>
        <SmartLink href={href} className={styles.link}>
          {title}
        </SmartLink>
      </Heading>
      {summary ? <p className={styles.summary}>{summary}</p> : null}
    </article>
  );
}
