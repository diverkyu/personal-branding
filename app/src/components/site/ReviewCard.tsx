import { cx } from "@/lib/cx";
import { SmartLink } from "@/components/ui/SmartLink";
import styles from "./ReviewCard.module.css";

export interface ReviewCardData {
  /** 후기 원문. 가공하지 않고 그대로 보여 준다 */
  text: string;
  /** 수강생 표기 (동의받은 방식: 실명·이니셜·닉네임) */
  author: string;
  /** 표시용 작성일. 예: "2026.10.21" */
  dateLabel: string;
  /** 연결된 투어가 있으면 링크로 보여 준다 */
  tour?: { href: string; title: string };
}

/** 수강 후기 카드. 평점(별점)은 쓰지 않는다 (SCREEN-SPEC §12 결정 4). 밝은 배경 위에서 쓴다. */
export function ReviewCard({ text, author, dateLabel, tour, className }: ReviewCardData & { className?: string }) {
  return (
    <figure className={cx(styles.card, className)}>
      <blockquote className={styles.text}>{text}</blockquote>
      <figcaption className={styles.caption}>
        <span>{author}</span>
        <span aria-hidden="true"> · </span>
        <span>{dateLabel}</span>
        {tour ? (
          <>
            <span aria-hidden="true"> · </span>
            <SmartLink href={tour.href} className={styles.tour}>
              {tour.title}
            </SmartLink>
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}
