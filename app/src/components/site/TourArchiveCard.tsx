import { cx } from "@/lib/cx";
import { SmartLink } from "@/components/ui/SmartLink";
import { Thumb, type ThumbVariant } from "@/components/ui/Thumb";
import styles from "./TourArchiveCard.module.css";

export interface TourArchiveCardData {
  href: string;
  title: string;
  /** 해당하는 자료 표시. 예: ["후기 연결됨", "갤러리", "스케치 영상"] */
  extras?: string[];
  image?: { src: string; alt: string };
  thumbVariant?: ThumbVariant;
}

/** 지난 투어 카드. 밝은 배경 위에서 쓴다. */
export function TourArchiveCard({ href, title, extras = [], image, thumbVariant, className, headingLevel = 3 }: TourArchiveCardData & { className?: string; headingLevel?: 2 | 3 }) {
  const Heading = `h${headingLevel}` as "h2" | "h3";
  return (
    <article className={cx(styles.card, className)}>
      <Thumb height={200} src={image?.src} alt={image?.alt} variant={thumbVariant} />
      <p className={styles.meta}>{["종료", ...extras].join(" · ")}</p>
      <Heading className={styles.title}>
        <SmartLink href={href} className={styles.link}>
          {title}
        </SmartLink>
      </Heading>
    </article>
  );
}
