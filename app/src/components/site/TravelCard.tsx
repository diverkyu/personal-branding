import { SmartLink } from "@/components/ui/SmartLink";
import { travelConfig } from "@/config/travel";
import { LEVEL_LABELS, type TravelLevel } from "@/content/travelFields";
import { formatDate } from "@/lib/format";
import styles from "./TravelCard.module.css";

export interface TravelCardData {
  href: string;
  title: string;
  summary?: string;
  region: string;
  season: string;
  level: TravelLevel;
  checkedAt: string;
  /** 정보 확인일이 오래됐는가. 색만이 아니라 글자로 알린다 (TRAVEL-06) */
  stale: boolean;
  headingLevel?: 2 | 3;
}

/** 여행 카드 (TRAVEL-05). 제목이 링크이고 링크 영역을 카드 전체로 넓힌다. 이미지는 쓰지 않는다(결정 T-4). 값이 없는 항목은 그 줄에서 뺀다 */
export function TravelCard({ href, title, summary, region, season, level, checkedAt, stale, headingLevel = 3 }: TravelCardData) {
  const Heading = `h${headingLevel}` as "h2" | "h3";
  const meta = [season ? `추천 시기 ${season}` : "", level ? `난이도 ${LEVEL_LABELS[level]}` : "", checkedAt ? `확인 ${formatDate(checkedAt)}` : ""].filter(Boolean).join(" · ");
  return (
    <article className={styles.card}>
      <p className={styles.region}>{region}</p>
      <Heading className={styles.title}>
        <SmartLink href={href} className={styles.link}>
          {title}
        </SmartLink>
      </Heading>
      {summary ? <p className={styles.summary}>{summary}</p> : null}
      {meta ? <p className={styles.meta}>{meta}</p> : null}
      {stale ? <p className={styles.stale}>{travelConfig.staleCard}</p> : null}
    </article>
  );
}
