import Link from "next/link";
import { InfoRow } from "@/components/site/InfoRow";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionHeader";
import { SmartLink } from "@/components/ui/SmartLink";
import { travelConfig, travelMailto } from "@/config/travel";
import { ContentBody } from "@/content/ContentBody";
import { LEVEL_LABELS } from "@/content/travelFields";
import type { TravelDetail, TravelItem } from "@/data/travelQueries";
import { formatDate } from "@/lib/format";
import styles from "./TravelDetailView.module.css";

/**
 * 여행 추천 상세 본체 (SCREEN-SPEC §5.17). 공개 `/freediving/travel/[slug]` 와 어드민 미리보기가 함께 쓴다.
 * 순서는 고정: 경로 → 지역·장소·제목·한 줄 소개 → (정보 표 | 본문) → 이전·다음 → 여행 문의 띠.
 * `stale`(오래된 정보) 판단은 호출하는 쪽이 한다(true: 오래됨, false: 최신, null: 확인일 없음).
 */
export function TravelDetailView({ item, stale, newer, older, email }: { item: TravelDetail; stale: boolean | null; newer: TravelItem | null; older: TravelItem | null; email: string }) {
  const info = [
    { label: "지역", value: item.region },
    { label: "장소", value: item.place },
    ...(item.season ? [{ label: "추천 시기", value: item.season }] : []),
    ...(item.level ? [{ label: "난이도", value: LEVEL_LABELS[item.level] }] : []),
    ...(item.budget ? [{ label: "예산(참고)", value: item.budget }] : []),
    ...(item.checkedAt ? [{ label: "정보 확인일", value: formatDate(item.checkedAt) }] : []),
  ];
  const warning = stale === true ? travelConfig.staleDetail : stale === null ? travelConfig.noCheckedAt : null;
  const c = travelConfig.inquiry;
  return (
    <>
      <Section tone="light" sub>
        <nav className={styles.crumbs} aria-label="이동 경로">
          <Link href="/freediving/travel">여행 추천</Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{item.title}</span>
        </nav>
        <p className={styles.place}>{`${item.region} · ${item.place}`}</p>
        <h1 className={styles.title}>{item.title}</h1>
        {item.summary ? <p className={styles.summary}>{item.summary}</p> : null}
        {warning ? (
          <p className={styles.warn} role="note">
            {warning}
          </p>
        ) : null}
        <p className={styles.notice}>{travelConfig.notice}</p>
        <div className={styles.cols}>
          <div className={styles.info}>
            <InfoRow items={info} />
          </div>
          {item.doc ? (
            <div className={styles.prose}>
              <ContentBody doc={item.doc} media={new Map(item.media.map((m) => [m.id, m]))} />
            </div>
          ) : null}
        </div>
      </Section>

      {newer || older ? (
        <Section tone="dark" sub>
          <nav className={styles.neighbors} aria-label="이전·다음 글">
            {older ? <SmartLink href={`/freediving/travel/${older.slug}`}>← 이전 글 · {older.title}</SmartLink> : <span />}
            {newer ? <SmartLink href={`/freediving/travel/${newer.slug}`}>다음 글 · {newer.title} →</SmartLink> : <span />}
          </nav>
        </Section>
      ) : null}

      <Section tone="teal" sub labelledBy="travel-inquiry-title">
        <div className={styles.inquiry}>
          <div className={styles.inquiryText}>
            <SectionLabel>{c.label}</SectionLabel>
            <h2 id="travel-inquiry-title" className={styles.inquiryTitle}>
              {c.title}
            </h2>
          </div>
          <Button href={travelMailto(email)} variant="primary" size="M" icon="arrow-up-right">
            {c.button}
          </Button>
        </div>
      </Section>
    </>
  );
}
