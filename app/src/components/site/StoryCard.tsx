import { cx } from "@/lib/cx";
import { SmartLink } from "@/components/ui/SmartLink";
import { Thumb, type ThumbVariant } from "@/components/ui/Thumb";
import type { Surface } from "@/components/ui/types";
import styles from "./StoryCard.module.css";

export interface StoryCardData {
  href: string;
  title: string;
  summary?: string;
  /** 표시용 날짜 문구. 예: "2026.11.08" */
  dateLabel: string;
  image?: { src: string; alt: string };
  thumbVariant?: ThumbVariant;
}

interface StoryCardProps extends StoryCardData {
  /** 제목 수준. 화면의 위 제목이 h1 이면 2, h2 이면 3 (제목 단계를 건너뛰지 않는다) */
  headingLevel?: 2 | 3;
  surface?: Surface;
  /** 큰 카드(좌 이미지 + 우 텍스트). Story 목록의 최신 글에 쓴다 */
  featured?: boolean;
  className?: string;
}

/**
 * 스토리 카드. 제목이 링크이고, 링크 영역을 카드 전체로 넓힌다(stretched link).
 * 카드 전체를 <a>로 감싸지 않아 스크린리더가 제목만 링크 이름으로 읽는다.
 */
export function StoryCard({ href, title, summary, dateLabel, image, thumbVariant, surface = "dark", featured = false, className, headingLevel = 3 }: StoryCardProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3";
  return (
    <article className={cx(styles.card, className)} data-surface={surface} data-featured={featured || undefined}>
      <div className={styles.media}>
        <Thumb height={featured ? 380 : 240} src={image?.src} alt={image?.alt} variant={thumbVariant} />
      </div>
      <div className={styles.body}>
        <p className={styles.date}>{dateLabel}</p>
        <Heading className={styles.title}>
          <SmartLink href={href} className={styles.link}>
            {title}
          </SmartLink>
        </Heading>
        {summary ? <p className={styles.summary}>{summary}</p> : null}
      </div>
    </article>
  );
}
