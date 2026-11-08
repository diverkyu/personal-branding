import type { Metadata } from "next";
import { Suspense } from "react";
import { EquipmentCard } from "@/components/site/EquipmentCard";
import { FilteredList } from "@/components/site/FilteredList";
import { ReviewCard } from "@/components/site/ReviewCard";
import { TourArchiveCard } from "@/components/site/TourArchiveCard";
import { TourCard } from "@/components/site/TourCard";
import { AFFILIATE_NOTICE, equipmentCard, reviewCard, tourArchiveCard, tourCard } from "@/components/site/mappers";
import { PageIntro } from "@/components/layout/PageIntro";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TextLink } from "@/components/ui/TextLink";
import { listEquipment, listEquipmentCategories, listFeaturedReviews, listPastTours, listUpcomingTours, reviewTourOptions } from "@/data";
import pages from "../pages.module.css";

export const metadata: Metadata = { title: "Freediving" };

const UPCOMING_LIMIT = 4;
const PAST_LIMIT = 6;
const EQUIPMENT_LIMIT = 8;

/** FD 허브 (SCREEN-SPEC §5.5). 영역 이동 칩은 같은 페이지의 구역으로 이동한다. */
export default function FreedivingPage() {
  const upcoming = listUpcomingTours();
  const past = listPastTours();
  const equipment = listEquipment().slice(0, EQUIPMENT_LIMIT);
  const reviews = listFeaturedReviews(3);
  const tourOptions = reviewTourOptions();

  return (
    <>
      <PageIntro label="03 / FREEDIVING" title="처음 물에 들어가는 날." description="바다를 만나고, 호흡에 집중하고, 물속에서 새로운 감각을 발견하는 시간.">
        <nav className={pages.chips} aria-label="Freediving 영역 이동">
          <Button href="#tours" variant="outline" size="S">
            투어
          </Button>
          <Button href="#equipment" variant="outline" size="S">
            장비 추천
          </Button>
          <Button href="#reviews" variant="outline" size="S">
            수강 후기
          </Button>
        </nav>
      </PageIntro>

      <Section tone="light" id="tours" labelledBy="fd-tours">
        <SectionHeader surface="light" titleId="fd-tours" title="투어" />
        {upcoming.length === 0 ? (
          <p className={pages.emptyLight}>다음 투어를 준비하고 있습니다. 소식이 궁금하시면 문의를 남겨주세요.</p>
        ) : (
          <ul className={pages.grid2} style={{ listStyle: "none", padding: 0 }}>
            {upcoming.slice(0, UPCOMING_LIMIT).map((t) => (
              <li key={t.slug}>
                <TourCard {...tourCard(t)} cta="자세히 보기" />
              </li>
            ))}
          </ul>
        )}
        {past.length > 0 ? (
          <ul className={pages.grid3} style={{ listStyle: "none", padding: 0 }}>
            {past.slice(0, PAST_LIMIT).map((t) => (
              <li key={t.slug}>
                <TourArchiveCard {...tourArchiveCard(t)} />
              </li>
            ))}
          </ul>
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
              options={listEquipmentCategories().map((c) => ({ value: c, label: c }))}
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
          <SectionHeader surface="light" titleId="fd-reviews" title="함께 물에 들어간 사람들의 이야기." />
          <ul className={pages.grid3} style={{ listStyle: "none", padding: 0 }}>
            {reviews.map((r) => (
              <li key={r.id}>
                <ReviewCard {...reviewCard(r, tourOptions)} />
              </li>
            ))}
          </ul>
          <div className={pages.after}>
            <TextLink href="/freediving/reviews" surface="light">
              후기 전체 보기
            </TextLink>
          </div>
        </Section>
      ) : null}
    </>
  );
}
