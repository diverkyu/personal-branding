import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/site/JsonLd";
import { resolveSiteUrl } from "@/config/env";
import { breadcrumbLd, eventLd } from "@/lib/structured";
import { MobileInquiryBar } from "@/components/site/MobileInquiryBar";
import { Gallery } from "@/components/site/Gallery";
import { VideoPlayer } from "@/components/site/VideoPlayer";
import { InfoRow } from "@/components/site/InfoRow";
import { ReviewCard } from "@/components/site/ReviewCard";
import { TourCard } from "@/components/site/TourCard";
import { getConsent } from "@/settings/read";
import { TourInquiryCard } from "@/components/site/TourInquiryCard";
import { reviewCard, tourCard } from "@/components/site/mappers";
import { Section } from "@/components/ui/Section";
import { STATUS_LABELS, StatusBadge } from "@/components/ui/StatusBadge";
import { TextLink } from "@/components/ui/TextLink";
import { Thumb } from "@/components/ui/Thumb";
import { ContentBody } from "@/content/ContentBody";
import { listReviewsForTour, reviewTourOptions } from "@/data/reviews";
import { getTour, listPastTours, listUpcomingTours } from "@/data/tours";
import { formatPeriod } from "@/lib/format";
import pages from "../../../pages.module.css";
import styles from "./page.module.css";

interface Props {
  params: Promise<{ slug: string }>;
}

/** 투어는 어드민에서 발행·취소·마감할 때 바로 갱신되고, 종료 여부는 최대 5분 안에 반영된다 */
export const revalidate = 300;

export async function generateStaticParams() {
  return [...(await listUpcomingTours()), ...(await listPastTours())].map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tour = await getTour((await params).slug);
  return tour ? { title: tour.seoTitle || tour.title, description: tour.seoDescription || tour.summary } : {};
}

/** TOUR 상세 + 예약 문의 (SCREEN-SPEC §5.7). 상태에 따라 문의 카드가 달라진다. */
export default async function TourDetailPage({ params }: Props) {
  const consents = { reservation: await getConsent("reservation"), notice: await getConsent("notice") };
  const tour = await getTour((await params).slug);
  if (!tour) notFound();
  const reviews = await listReviewsForTour(tour.slug);
  const origin = resolveSiteUrl(process.env).url.origin;
  const tourOptions = await reviewTourOptions();
  const related = [...(await listUpcomingTours()), ...(await listPastTours())].filter((t) => t.slug !== tour.slug && t.status === tour.status).slice(0, 2);

  return (
    <Section tone="light" sub>
      <JsonLd data={eventLd(origin, tour)} />
      <JsonLd data={breadcrumbLd(origin, [{ name: "Freediving", path: "/freediving" }, { name: "투어", path: "/freediving/tours" }, { name: tour.title, path: `/freediving/tours/${tour.slug}` }])} />
      <nav aria-label="이동 경로" className={styles.crumbs}>
        <Link href="/freediving">Freediving</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/freediving/tours">투어</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{tour.title}</span>
      </nav>
      <div className={styles.media}>
        <Thumb height={460} variant={tour.thumbVariant} src={tour.cover?.src} alt={tour.cover?.alt} />
        <span className={styles.badge}>
          <StatusBadge status={tour.status} />
        </span>
      </div>
      <div className={styles.columns}>
        <div className={styles.main}>
          <h1 className={styles.title}>{tour.title}</h1>
          <InfoRow
            items={[
              { label: "일정", value: formatPeriod(tour.startDate, tour.endDate) },
              { label: "장소", value: tour.place },
              { label: "모집 상태", value: STATUS_LABELS[tour.status] },
              ...(tour.capacity ? [{ label: "정원", value: `${tour.capacity}명` }] : []),
            ]}
          />
          <h2 className={styles.h2}>투어 소개</h2>
          <div className={pages.prose}>
            {tour.doc ? <ContentBody doc={tour.doc} media={new Map((tour.media ?? []).map((m) => [m.id, m]))} /> : tour.description.map((p, i) => <p key={i}>{p}</p>)}
            {tour.feeNote ? <p style={{ whiteSpace: "pre-line" }}>{tour.feeNote}</p> : null}
          </div>

          {tour.gallery && tour.gallery.length > 0 ? (
            <>
              <h2 className={styles.h2}>갤러리</h2>
              <Gallery images={tour.gallery} label={`${tour.title} 갤러리`} />
            </>
          ) : null}
          {tour.videos && tour.videos.length > 0 ? (
            <>
              <h2 className={styles.h2}>스케치 영상</h2>
              {tour.videos.map((url, i) => (
                <VideoPlayer key={url} url={url} title={`${tour.title} 스케치 영상 ${i + 1}`} />
              ))}
            </>
          ) : null}

          <h2 className={styles.h2}>{tour.status === "ended" ? "이 투어의 후기" : "후기"}</h2>
          <ul className={styles.reviews}>
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
        </div>
        <TourInquiryCard status={tour.status} slug={tour.slug} capacity={tour.capacity} consents={consents} />
        {tour.status === "recruiting" ? <MobileInquiryBar targetId="inquiry" /> : null}
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
