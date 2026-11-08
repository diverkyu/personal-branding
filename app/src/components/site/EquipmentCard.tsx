import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/Button";
import { SmartLink } from "@/components/ui/SmartLink";
import { Thumb, type ThumbVariant } from "@/components/ui/Thumb";
import styles from "./EquipmentCard.module.css";

/**
 * 행동 버튼은 장비마다 설정한다 (SCREEN-SPEC §7.5). 향후 "자체 구매"는 같은 형태로 추가한다.
 * - external: 외부 구매처 링크 (새 탭)
 * - inquiry: 문의하기 (사이트 안 주소)
 * - 없으면 버튼 없이 소개만 한다
 */
export type EquipmentAction = { type: "external"; href: string; label?: string } | { type: "inquiry"; href: string; label?: string };

export interface EquipmentCardData {
  href: string;
  name: string;
  category: string;
  /** 한 줄 추천 이유 */
  reason: string;
  action?: EquipmentAction;
  /** 제휴 링크이면 고지 문구를 함께 보여 준다 */
  affiliate?: boolean;
  image?: { src: string; alt: string };
  thumbVariant?: ThumbVariant;
}

interface EquipmentCardProps extends EquipmentCardData {
  /** 제목 수준. 화면의 위 제목이 h1 이면 2, h2 이면 3 (제목 단계를 건너뛰지 않는다) */
  headingLevel?: 2 | 3;
  /** 제휴 고지 문구. 사이트 설정의 값을 넘긴다 */
  affiliateNotice?: string;
  className?: string;
}

const DEFAULT_LABEL = { external: "구매처 보기", inquiry: "문의하기" } as const;

export function EquipmentCard({ href, name, category, reason, action, affiliate = false, affiliateNotice, image, thumbVariant, className, headingLevel = 3 }: EquipmentCardProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3";
  return (
    <article className={cx(styles.card, className)}>
      <Thumb height={180} src={image?.src} alt={image?.alt} variant={thumbVariant} />
      <p className={styles.category}>{category}</p>
      <Heading className={styles.name}>
        <SmartLink href={href} className={styles.link}>
          {name}
        </SmartLink>
      </Heading>
      <p className={styles.reason}>{reason}</p>
      {action ? (
        <div className={styles.action}>
          <Button href={action.href} variant={action.type === "external" ? "primary" : "outline"} size="S" icon={action.type === "external" ? "arrow-up-right" : undefined}>
            {action.label ?? DEFAULT_LABEL[action.type]}
          </Button>
          {affiliate && affiliateNotice ? <p className={styles.notice}>{affiliateNotice}</p> : null}
        </div>
      ) : null}
    </article>
  );
}
