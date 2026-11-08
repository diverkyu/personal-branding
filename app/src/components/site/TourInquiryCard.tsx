import { Button } from "@/components/ui/Button";
import { NoticeForm, ReservationForm } from "./TourForms";
import type { TourStatus } from "@/types/content";
import styles from "./TourInquiryCard.module.css";

/**
 * 예약 문의 카드 (SCREEN-SPEC §5.7.1) — 투어 상태에 따라 4가지.
 * 폼은 서버 액션(`app/freediving/tours/[slug]/actions.ts`)에 연결된다. 검증·허니팟·빈도 제한은 서버가 맡는다.
 */
export function TourInquiryCard({ status, slug, capacity }: { status: TourStatus; slug: string; capacity?: number }) {
  if (status === "ended") return null;

  if (status === "closed") {
    return (
      <section id="inquiry" className={styles.card} aria-labelledby="inquiry-title">
        <p className={styles.label}>RESERVATION</p>
      <h2 id="inquiry-title" className={styles.title}>
          예약 문의
        </h2>
        <p>이번 투어는 마감되었습니다.</p>
        <Button href="/contact" variant="outline" size="M" icon="arrow-up-right">
          다음 투어 문의하기
        </Button>
      </section>
    );
  }

  if (status === "upcoming") {
    return (
      <section id="inquiry" className={styles.card} aria-labelledby="inquiry-title">
        <p className={styles.label}>RESERVATION</p>
      <h2 id="inquiry-title" className={styles.title}>
          예약 문의
        </h2>
        <p>모집이 시작되면 안내해 드립니다.</p>
        <NoticeForm slug={slug} />
      </section>
    );
  }

  return (
    <section id="inquiry" className={styles.card} aria-labelledby="inquiry-title">
      <p className={styles.label}>RESERVATION</p>
      <h2 id="inquiry-title" className={styles.title}>
        예약 문의
      </h2>
      <p>결제나 확정은 아닙니다. 남겨주신 내용을 확인한 뒤 연락처로 답변드립니다.</p>
      <ReservationForm slug={slug} capacity={capacity} />
    </section>
  );
}
