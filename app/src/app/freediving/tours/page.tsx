import type { Metadata } from "next";
import { Suspense } from "react";
import { FilteredList, type FilteredItem } from "@/components/site/FilteredList";
import { TourArchiveCard } from "@/components/site/TourArchiveCard";
import { TourCard } from "@/components/site/TourCard";
import { tourArchiveCard, tourCard } from "@/components/site/mappers";
import { PageIntro } from "@/components/layout/PageIntro";
import { Section } from "@/components/ui/Section";
import { listPastTours, listUpcomingTours } from "@/data/tours";
import pages from "../../pages.module.css";

export const metadata: Metadata = { title: "투어" };

/** 투어는 어드민에서 발행·취소·마감할 때 바로 갱신되고, 종료 여부는 최대 5분 안에 반영된다 */
export const revalidate = 300;

/** TOUR 목록 (SCREEN-SPEC §5.6). 필터는 URL(?status=)에 남는다. 기본은 진행 예정이 위, 지난 투어가 아래. */
export default async function ToursPage() {
  const [upcoming, past] = await Promise.all([listUpcomingTours(), listPastTours()]);
  const items: FilteredItem[] = [
    ...upcoming.map((t) => ({ id: t.slug, values: ["upcoming"], node: <TourCard {...tourCard(t)} cta="자세히 보기" headingLevel={2} /> })),
    ...past.map((t) => ({ id: t.slug, values: ["past"], node: <TourArchiveCard {...tourArchiveCard(t)} headingLevel={2} /> })),
  ];
  return (
    <>
      <PageIntro tone="light" title="투어" />
      <Section tone="light" sub>
        <Suspense fallback={null}>
          <FilteredList
            label="투어 상태"
            param="status"
            options={[
              { value: "upcoming", label: "진행 예정" },
              { value: "past", label: "지난 투어" },
            ]}
            items={items}
            surface="light"
            listClassName={pages.grid3}
            empty={<p className={pages.emptyLight}>다음 투어를 준비하고 있습니다. 소식이 궁금하시면 문의를 남겨주세요.</p>}
          />
        </Suspense>
      </Section>
    </>
  );
}
