import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/site/JsonLd";
import { resolveSiteUrl } from "@/config/env";
import { articleLd, breadcrumbLd } from "@/lib/structured";
import { Section } from "@/components/ui/Section";
import { TextLink } from "@/components/ui/TextLink";
import { storyHref } from "@/components/site/mappers";
import { getStory, getStoryNeighbors, listStories } from "@/data";
import { formatDate } from "@/lib/format";
import pages from "../../pages.module.css";
import styles from "./page.module.css";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return listStories().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const story = getStory((await params).slug);
  return story ? { title: story.title, description: story.summary } : {};
}

/** STORY 상세 (SCREEN-SPEC §5.4). 존재하지 않거나 비공개인 글은 404. 글 안에 투어·후기 광고를 넣지 않는다. */
export default async function StoryDetailPage({ params }: Props) {
  const story = getStory((await params).slug);
  if (!story) notFound();
  const { newer, older } = getStoryNeighbors(story.slug);
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
        {story.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {story.questions && story.questions.length > 0 ? (
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
