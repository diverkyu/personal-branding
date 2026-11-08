import type { Metadata } from "next";
import { Suspense } from "react";
import { FilteredList, type FilteredItem } from "@/components/site/FilteredList";
import { StoryCard } from "@/components/site/StoryCard";
import { storyCard } from "@/components/site/mappers";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { listStories, listStoryTags } from "@/data";
import pages from "../pages.module.css";

/** 한 페이지에 보이는 글 수 (큰 카드 제외, SCREEN-SPEC STORY-05 제안값) */
const STORY_PAGE_SIZE = 9;

export const metadata: Metadata = { title: "Story" };

/** STORY 목록 (SCREEN-SPEC §5.3). 최신 글은 큰 카드, 나머지는 격자. 태그 필터는 URL(?tag=)에 남는다. */
export default function StoryPage() {
  const stories = listStories();
  const items: FilteredItem[] = stories.map((s, i) => ({
    id: s.slug,
    values: s.tags,
    wide: i === 0,
    node: <StoryCard {...storyCard(s)} surface={i === 0 ? "dark" : "light"} featured={i === 0} headingLevel={2} />,
  }));

  return (
    <>
      <Section tone="light" sub>
        <SectionHeader
          surface="light"
          label="02 / STORY"
          as="h1"
          size="h1"
          title={
            <>
              한 호흡 사이에
              <br />
              떠오른 생각들.
            </>
          }
          description="바다와 창작 사이에서 기록합니다."
        />
        <div className={pages.after}>
        {stories.length > 0 ? (
          <Suspense fallback={null}>
            <FilteredList
              label="스토리 태그"
              param="tag"
              options={listStoryTags().map((t) => ({ value: t, label: t }))}
              items={items}
              surface="light"
              listClassName={pages.grid4}
              pagination={{ mode: "pages", size: STORY_PAGE_SIZE }}
              empty={<p className={pages.emptyLight}>이 태그의 글이 없습니다.</p>}
            />
          </Suspense>
        ) : (
          <p className={pages.emptyLight}>아직 올린 글이 없습니다. 곧 첫 이야기를 올리겠습니다.</p>
        )}
        </div>
      </Section>
    </>
  );
}
