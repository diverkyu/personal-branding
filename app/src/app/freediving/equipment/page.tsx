import type { Metadata } from "next";
import { Suspense } from "react";
import { EquipmentCard } from "@/components/site/EquipmentCard";
import { FilteredList } from "@/components/site/FilteredList";
import { AFFILIATE_NOTICE, equipmentCard } from "@/components/site/mappers";
import { PageIntro } from "@/components/layout/PageIntro";
import { Section } from "@/components/ui/Section";
import { listEquipment, listEquipmentCategories } from "@/data/equipment";
import pages from "../../pages.module.css";

export const metadata: Metadata = { title: "장비 추천" };

/** 장비는 어드민에서 발행·취소·삭제할 때 바로 갱신되고, 예약 시각은 최대 5분 안에 반영된다 */
export const revalidate = 300;

/** EQ 목록 (SCREEN-SPEC §5.8). 카테고리 필터는 URL(?category=)에 남는다. */
export default async function EquipmentPage() {
  const [equipment, categories] = await Promise.all([listEquipment(), listEquipmentCategories()]);
  return (
    <>
      <PageIntro title="제가 추천하는 장비." />
      <Section tone="dark" sub>
        <Suspense fallback={null}>
          <FilteredList
            label="장비 카테고리"
            param="category"
            options={categories.map((c) => ({ value: c, label: c }))}
            items={equipment.map((e) => ({ id: e.slug, values: [e.category], node: <EquipmentCard {...equipmentCard(e)} affiliateNotice={AFFILIATE_NOTICE} headingLevel={2} /> }))}
            listClassName={pages.grid4}
            empty={<p className={pages.empty}>준비 중입니다.</p>}
          />
        </Suspense>
      </Section>
    </>
  );
}
