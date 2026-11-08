import type { Metadata } from "next";
import { Suspense } from "react";
import { EquipmentCard } from "@/components/site/EquipmentCard";
import { FilteredList } from "@/components/site/FilteredList";
import { AFFILIATE_NOTICE, equipmentCard } from "@/components/site/mappers";
import { PageIntro } from "@/components/layout/PageIntro";
import { Section } from "@/components/ui/Section";
import { listEquipment, listEquipmentCategories } from "@/data";
import pages from "../../pages.module.css";

export const metadata: Metadata = { title: "장비 추천" };

/** EQ 목록 (SCREEN-SPEC §5.8). 카테고리 필터는 URL(?category=)에 남는다. */
export default function EquipmentPage() {
  return (
    <>
      <PageIntro title="제가 추천하는 장비." />
      <Section tone="dark" sub>
        <Suspense fallback={null}>
          <FilteredList
            label="장비 카테고리"
            param="category"
            options={listEquipmentCategories().map((c) => ({ value: c, label: c }))}
            items={listEquipment().map((e) => ({ id: e.slug, values: [e.category], node: <EquipmentCard {...equipmentCard(e)} affiliateNotice={AFFILIATE_NOTICE} headingLevel={2} /> }))}
            listClassName={pages.grid4}
            empty={<p className={pages.empty}>준비 중입니다.</p>}
          />
        </Suspense>
      </Section>
    </>
  );
}
