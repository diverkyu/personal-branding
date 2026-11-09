import type { Metadata } from "next";
import { Suspense } from "react";
import { FilteredList } from "@/components/site/FilteredList";
import { ReviewCard } from "@/components/site/ReviewCard";
import { reviewCard, tourHref } from "@/components/site/mappers";
import { PageIntro } from "@/components/layout/PageIntro";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { listReviews } from "@/data";
import { listOpenTours, reviewTourOptions } from "@/data/tours";
import pages from "../../pages.module.css";

export const metadata: Metadata = { title: "수강 후기" };

/** 투어는 어드민에서 발행·취소·마감할 때 바로 갱신되고, 종료 여부는 최대 5분 안에 반영된다 */
export const revalidate = 300;

/** REV 전체 (SCREEN-SPEC §5.10). 후기는 원문 그대로이며 평점이 없다. 필터는 URL(?tour=)에 남는다. */
export default async function ReviewsPage() {
  const tours = await reviewTourOptions();
  const next = (await listOpenTours())[0];
  return (
    <>
      <PageIntro tone="light" title="함께 물에 들어간 사람들의 이야기." />
      <Section tone="light" sub>
        <Suspense fallback={null}>
          <FilteredList
            label="투어별 후기"
            param="tour"
            options={tours.map((t) => ({ value: t.slug, label: t.title }))}
            items={listReviews().map((r) => ({ id: r.id, values: r.tourSlug ? [r.tourSlug] : [], node: <ReviewCard {...reviewCard(r, tours)} /> }))}
            surface="light"
            listClassName={pages.grid3}
            pagination={{ mode: "more", size: 12 }}
            empty={<p className={pages.emptyLight}>아직 등록된 후기가 없습니다.</p>}
          />
        </Suspense>
        <div className={pages.chips}>
          <Button href={next ? tourHref(next) : "/contact"} size="M" icon="arrow-up-right">
            {next ? "진행 예정 투어 보기" : "문의하기"}
          </Button>
        </div>
      </Section>
    </>
  );
}
