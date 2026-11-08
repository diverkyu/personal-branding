import type { Metadata } from "next";
import { Suspense } from "react";
import { FilteredList, type FilteredItem } from "@/components/site/FilteredList";
import { StoryCard } from "@/components/site/StoryCard";
import { storyCard } from "@/components/site/mappers";
import { PageIntro } from "@/components/layout/PageIntro";
import { Section } from "@/components/ui/Section";
import { listStories, listStoryTags } from "@/data";
import pages from "../pages.module.css";

export const metadata: Metadata = { title: "Story" };

/** STORY 목록 (SCREEN-SPEC §5.3). 최신 글은 큰 카드, 나머지는 격자. 태그 필터는 URL(?tag=)에 남는다. */
export default function StoryPage() {
  const stories = listStories();
  const [latest, ...rest] = stories;
  const items: FilteredItem[] = rest.map((s) => ({ id: s.slug, values: s.tags, node: <StoryCard {...storyCard(s)} surface="light" headingLevel={2} /> }));

  return (
    <>
      <PageIntro
        label="02 / STORY"
        tone="light"
        title={
          <>
            한 호흡 사이에
            <br />
            떠오른 생각들.
          </>
        }
        description="바다와 창작 사이에서 기록합니다."
      />
      <Section tone="light" sub>
        {latest ? (
          <>
            <StoryCard {...storyCard(latest)} surface="light" featured headingLevel={2} />
            <div className={pages.after}>
              <Suspense fallback={null}>
                <FilteredList
                  label="스토리 태그"
                  param="tag"
                  options={listStoryTags().map((t) => ({ value: t, label: t }))}
                  items={items}
                  surface="light"
                  listClassName={pages.grid3}
                  empty={<p className={pages.emptyLight}>이 태그의 글이 없습니다.</p>}
                />
              </Suspense>
            </div>
          </>
        ) : (
          <p className={pages.emptyLight}>아직 올린 글이 없습니다. 곧 첫 이야기를 올리겠습니다.</p>
        )}
      </Section>
    </>
  );
}
