import { cx } from "@/lib/cx";
import { SmartLink } from "@/components/ui/SmartLink";
import { StatusBadge, type StatusKind } from "@/components/ui/StatusBadge";
import { Thumb, type ThumbVariant } from "@/components/ui/Thumb";
import { Icon } from "@/components/ui/Icon";
import styles from "./TourCard.module.css";

export interface TourCardData {
  href: string;
  title: string;
  status: StatusKind;
  /** 표시용 일정 문구. 예: "2026.12.05 – 12.07" */
  scheduleLabel: string;
  place: string;
  /** 정원. 없으면 표시하지 않는다 */
  capacityLabel?: string;
  image?: { src: string; alt: string };
  thumbVariant?: ThumbVariant;
}

interface TourCardProps extends TourCardData {
  /** 좌 이미지 + 우 정보. Freediving 허브의 큰 카드 */
  split?: boolean;
  /** 카드 아래 안내 문구 (예: "자세히 보기"). 링크는 제목 하나이므로 이 문구는 장식이다 */
  cta?: string;
  className?: string;
}

/** 진행 예정 투어 카드. 남색 카드이므로 밝은(페이퍼) 섹션 위에 놓는다. 제목이 링크이고 카드 전체가 눌린다. */
export function TourCard({ href, title, status, scheduleLabel, place, capacityLabel, image, thumbVariant, split = false, cta, className }: TourCardProps) {
  return (
    <article className={cx(styles.card, className)} data-split={split || undefined}>
      {split ? (
        <div className={styles.media}>
          <Thumb height={220} src={image?.src} alt={image?.alt} variant={thumbVariant} />
        </div>
      ) : null}
      <div className={styles.body}>
        <StatusBadge status={status} />
        <h3 className={styles.title}>
          <SmartLink href={href} className={styles.link}>
            {title}
          </SmartLink>
        </h3>
        <dl className={styles.info}>
          <div>
            <dt>일정</dt>
            <dd>{scheduleLabel}</dd>
          </div>
          <div>
            <dt>장소</dt>
            <dd>{place}</dd>
          </div>
          {capacityLabel ? (
            <div>
              <dt>정원</dt>
              <dd>{capacityLabel}</dd>
            </div>
          ) : null}
        </dl>
        {cta ? (
          <span className={styles.cta} aria-hidden="true">
            {cta}
            <Icon name="arrow-up-right" size={16} />
          </span>
        ) : null}
      </div>
    </article>
  );
}
