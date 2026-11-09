import type { Metadata } from "next";
import { Suspense } from "react";
import { AreaNav } from "@/components/site/AreaNav";
import { EquipmentCard } from "@/components/site/EquipmentCard";
import { FilteredList } from "@/components/site/FilteredList";
import { ReviewCard } from "@/components/site/ReviewCard";
import { TourArchiveCard } from "@/components/site/TourArchiveCard";
import { TourCard } from "@/components/site/TourCard";
import { AFFILIATE_NOTICE, equipmentCard, reviewCard, tourArchiveCard, tourCard } from "@/components/site/mappers";
import { PageIntro } from "@/components/layout/PageIntro";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TextLink } from "@/components/ui/TextLink";
import { listEquipment, listEquipmentCategories } from "@/data/equipment";
import { listFeaturedReviews, reviewTourOptions } from "@/data/reviews";
import { listPastTours, listUpcomingTours } from "@/data/tours";
import pages from "../pages.module.css";

export const metadata: Metadata = { title: "Freediving" };

/** 투어·장비는 어드민에서 발행·취소·마감할 때 바로 갱신되고, 종료 여부와 예약 시각은 최대 5분 안에 반영된다 */
export const revalidate = 300;

const UPCOMING_LIMIT = 4;
const PAST_LIMIT = 6;
const EQUIPMENT_LIMIT = 8;

/** FD 허브 (SCREEN-SPEC §5.5). 영역 이동 칩은 같은 페이지의 구역으로 이동한다. */
export default async function FreedivingPage() {
  const upcoming = await listUpcomingTours();
  const past = await listPastTours();
  const equipment = (await listEquipment()).slice(0, EQUIPMENT_LIMIT);
  const equipmentCategories = await listEquipmentCategories();
  const reviews = await listFeaturedReviews(3);
  const tourOptions = await reviewTourOptions();

  return (
    <>
      <PageIntro
        label="03 / FREEDIVING"
        title="처음 물에 들어가는 날."
        lead={
          <>
            바다를 만나고, 호흡에 집중하고,
            <br />
            물속에서 새로운 감각을 발견하는 시간.
          </>
        }
      >
        <AreaNav
          areas={[
            { id: "tours", label: "투어" },
            { id: "equipment", label: "장비 추천" },
            { id: "reviews", label: "수강 후기" },
          ]}
        />
      </PageIntro>

      <Section tone="light" id="tours" labelledBy="fd-tours">
        <SectionHeader surface="light" titleId="fd-tours" title="투어" action={<span className={pages.eyebrow}>UPCOMING · 진행 예정</span>} />
        {upcoming.length === 0 ? (
          <p className={pages.emptyLight}>다음 투어를 준비하고 있습니다. 소식이 궁금하시면 문의를 남겨주세요.</p>
        ) : (
          <ul className={pages.grid2} style={{ listStyle: "none", padding: 0 }}>
            {upcoming.slice(0, UPCOMING_LIMIT).map((t) => (
              <li key={t.slug}>
                <TourCard {...tourCard(t)} split />
              </li>
            ))}
          </ul>
        )}
        {past.length > 0 ? (
          <>
            <p className={pages.eyebrow} style={{ marginTop: 64 }}>
              ARCHIVE · 지난 투어
            </p>
          <ul className={pages.grid3} style={{ listStyle: "none", padding: 0 }}>
            {past.slice(0, PAST_LIMIT).map((t) => (
              <li key={t.slug}>
                <TourArchiveCard {...tourArchiveCard(t)} />
              </li>
            ))}
          </ul>
          </>
        ) : null}
        {upcoming.length + past.length > UPCOMING_LIMIT ? (
          <div className={pages.after}>
            <TextLink href="/freediving/tours" surface="light">
              투어 전체 보기
            </TextLink>
          </div>
        ) : null}
      </Section>

      <Section tone="dark" id="equipment" labelledBy="fd-equipment">
        <SectionHeader titleId="fd-equipment" title="제가 추천하는 장비." />
        <div className={pages.after}>
          <Suspense fallback={null}>
            <FilteredList
              label="장비 카테고리"
              param="category"
              options={equipmentCategories.map((c) => ({ value: c, label: c }))}
              items={equipment.map((e) => ({ id: e.slug, values: [e.category], node: <EquipmentCard {...equipmentCard(e)} affiliateNotice={AFFILIATE_NOTICE} /> }))}
              listClassName={pages.grid4}
              empty={<p className={pages.empty}>준비 중입니다.</p>}
            />
          </Suspense>
        </div>
        <div className={pages.after}>
          <TextLink href="/freediving/equipment" surface="dark">
            장비 전체 보기
          </TextLink>
        </div>
      </Section>

      {reviews.length > 0 ? (
        <Section tone="light" id="reviews" labelledBy="fd-reviews">
          <SectionHeader
            surface="light"
            titleId="fd-reviews"
            title="함께 물에 들어간 사람들의 이야기."
            action={
              <TextLink href="/freediving/reviews" surface="light">
                후기 전체 보기
              </TextLink>
            }
          />
          <ul className={pages.grid3} style={{ listStyle: "none", padding: 0 }}>
            {reviews.map((r) => (
              <li key={r.id}>
                <ReviewCard {...reviewCard(r, tourOptions)} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
