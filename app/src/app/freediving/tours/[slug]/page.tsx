import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InfoRow } from "@/components/site/InfoRow";
import { ReviewCard } from "@/components/site/ReviewCard";
import { TourCard } from "@/components/site/TourCard";
import { TourInquiryCard } from "@/components/site/TourInquiryCard";
import { reviewCard, tourCard } from "@/components/site/mappers";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextLink } from "@/components/ui/TextLink";
import { Thumb } from "@/components/ui/Thumb";
import { getTour, listReviewsForTour, listUpcomingTours, listPastTours, reviewTourOptions } from "@/data";
import { formatPeriod } from "@/lib/format";
import pages from "../../../pages.module.css";
import styles from "./page.module.css";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return [...listUpcomingTours(), ...listPastTours()].map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tour = getTour((await params).slug);
  return tour ? { title: tour.title, description: tour.summary } : {};
}

/** TOUR 상세 + 예약 문의 (SCREEN-SPEC §5.7). 상태에 따라 문의 카드가 달라진다. */
export default async function TourDetailPage({ params }: Props) {
  const tour = getTour((await params).slug);
  if (!tour) notFound();
  const reviews = listReviewsForTour(tour.slug);
  const tourOptions = reviewTourOptions();
  const related = [...listUpcomingTours(), ...listPastTours()].filter((t) => t.slug !== tour.slug && t.status === tour.status).slice(0, 2);

  return (
    <Section tone="light" sub>
      <nav aria-label="이동 경로" className={styles.crumbs}>
        <Link href="/freediving">Freediving</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/freediving/tours">투어</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{tour.title}</span>
      </nav>
      <div className={styles.media}>
        <Thumb height={420} variant={tour.thumbVariant} />
      </div>
      <StatusBadge status={tour.status} surface="light" />
      <h1 className={styles.title}>{tour.title}</h1>
      <InfoRow
        items={[
          { label: "일정", value: formatPeriod(tour.startDate, tour.endDate) },
          { label: "장소", value: tour.place },
          { label: "모집 상태", value: <StatusBadge status={tour.status} surface="light" /> },
          ...(tour.capacity ? [{ label: "정원", value: `${tour.capacity}명` }] : []),
        ]}
      />
      <div className={styles.columns}>
        <div className={pages.prose}>
          {tour.description.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {tour.feeNote ? <p>{tour.feeNote}</p> : null}
        </div>
        <TourInquiryCard status={tour.status} />
      </div>

      <h2 className={styles.h2}>{tour.status === "ended" ? "이 투어의 후기" : "후기"}</h2>
      <ul className={pages.grid2} style={{ listStyle: "none", padding: 0 }}>
        {reviews.map((r) => (
          <li key={r.id}>
            <ReviewCard {...reviewCard(r, tourOptions)} />
          </li>
        ))}
      </ul>
      <div className={pages.after}>
        <TextLink href={`/freediving/reviews?tour=${encodeURIComponent(tour.slug)}`} surface="light">
          후기 전체 보기
        </TextLink>
      </div>

      {related.length > 0 ? (
        <>
          <h2 className={styles.h2}>다른 투어</h2>
          <ul className={pages.grid2} style={{ listStyle: "none", padding: 0 }}>
            {related.map((t) => (
              <li key={t.slug}>
                <TourCard {...tourCard(t)} cta="자세히 보기" />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Section>
  );
}
