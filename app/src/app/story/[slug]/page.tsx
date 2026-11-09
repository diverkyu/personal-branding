import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/site/JsonLd";
import { resolveSiteUrl } from "@/config/env";
import { articleLd, breadcrumbLd } from "@/lib/structured";
import { Section } from "@/components/ui/Section";
import { TextLink } from "@/components/ui/TextLink";
import { storyHref } from "@/components/site/mappers";
import { ContentBody } from "@/content/ContentBody";
import { getStory, getStoryNeighbors, listStories } from "@/data/stories";
import { formatDate } from "@/lib/format";
import pages from "../../pages.module.css";
import styles from "./page.module.css";

interface Props {
  params: Promise<{ slug: string }>;
}

/** 새로 발행된 글은 처음 열릴 때 만들어지고(dynamicParams), 발행·취소·삭제 때 캐시가 갱신된다. 최대 5분 안에는 반드시 새 내용을 읽는다 */
export const revalidate = 300;

export async function generateStaticParams() {
  return (await listStories()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const story = await getStory((await params).slug);
  return story ? { title: story.seoTitle || story.title, description: story.seoDescription || story.summary } : {};
}

/** STORY 상세 (SCREEN-SPEC §5.4). 존재하지 않거나 비공개인 글은 404. 글 안에 투어·후기 광고를 넣지 않는다. */
export default async function StoryDetailPage({ params }: Props) {
  const story = await getStory((await params).slug);
  if (!story) notFound();
  const { newer, older } = await getStoryNeighbors(story.slug);
  const origin = resolveSiteUrl(process.env).url.origin;

  return (
    <Section tone="light" sub>
      <JsonLd data={articleLd(origin, story)} />
      <JsonLd data={breadcrumbLd(origin, [{ name: "Story", path: "/story" }, { name: story.title, path: `/story/${story.slug}` }])} />
      <TextLink href="/story" surface="light" icon={null}>
        Story 목록으로
      </TextLink>
      <div className={styles.meta} style={{ marginTop: 32 }}>
        <time dateTime={story.publishedAt}>{formatDate(story.publishedAt)}</time>
        <ul className={styles.tags} aria-label="태그">
          {story.tags.map((t) => (
            <li key={t}>
              <Link href={`/story?tag=${encodeURIComponent(t)}`}>#{t}</Link>
            </li>
          ))}
        </ul>
      </div>
      <h1 className={styles.title}>{story.title}</h1>
      <div className={pages.prose}>
        <ContentBody doc={story.doc} media={new Map(story.media.map((m) => [m.id, m]))} />
      </div>
      {story.questions.length > 0 ? (
        <details className={styles.questions}>
          <summary>이 글이 답하는 질문</summary>
          <ul>
            {story.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <nav className={styles.nav} aria-label="이전·다음 글">
        {older ? (
          <TextLink href={storyHref(older)} surface="light" icon={null}>
            이전 글 · {older.title}
          </TextLink>
        ) : (
          <span />
        )}
        {newer ? (
          <TextLink href={storyHref(newer)} surface="light" icon={null}>
            다음 글 · {newer.title}
          </TextLink>
        ) : null}
      </nav>
    </Section>
  );
}
