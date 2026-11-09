/**
 * 화면이 스토리를 읽는 입구 (서버 전용, AGENTS §6). 공개 화면은 여기서만 읽는다.
 *
 * - DATABASE_URL 이 있으면 DB 의 공개 글을 읽는다 (storyQueries.ts). 결과는 태그 캐시에 둔다.
 * - DATABASE_URL 이 없으면 가상 데이터를 쓴다 — 로컬 개발·자동 시험 전용이다.
 *   단, 배포 환경(VERCEL)에서는 절대 가상 글을 보여 주지 않는다. 설정이 빠졌다면 빈 목록이다.
 * - 목록 읽기가 실패하면 빈 목록으로 열어 사이트가 깨지지 않게 하고(캐시하지 않는다), 상세는 오류로 둔다
 *   (일시 오류를 "없는 글"(404)로 굳히지 않기 위해서다).
 */
import "server-only";
import { unstable_cache } from "next/cache";
import { bodyFromPlainText } from "@/content/body";
import { STORIES_MAX_AGE_SECONDS, STORIES_TAG } from "@/content/cacheTags";
import { getDb } from "@/db/client";
import type { AdminDb } from "@/data/admin/db";
import { logger } from "@/lib/logger";
import { listStories as listFixtureStories, getStory as getFixtureStory } from "./index";
import { neighborsOf, queryLiveStories, queryLiveStory, tagsOf, type StoryDetail, type StoryListItem } from "./storyQueries";

export type { StoryDetail, StoryListItem } from "./storyQueries";

function db(): AdminDb | null {
  const url = process.env.DATABASE_URL?.trim();
  return url ? (getDb(url) as unknown as AdminDb) : null;
}

/** 가상 글은 배포 환경이 아닐 때만 쓴다 */
const shouldUseFixtures = () => !process.env.DATABASE_URL?.trim() && !process.env.VERCEL;

const cachedList = unstable_cache(async () => queryLiveStories(db() as AdminDb), ["stories-live-list"], { tags: [STORIES_TAG], revalidate: STORIES_MAX_AGE_SECONDS });
const cachedDetail = unstable_cache(async (slug: string) => queryLiveStory(db() as AdminDb, slug), ["stories-live-detail"], { tags: [STORIES_TAG], revalidate: STORIES_MAX_AGE_SECONDS });

function fixtureItems(): StoryListItem[] {
  return listFixtureStories().map((s) => ({ slug: s.slug, title: s.title, summary: s.summary, publishedAt: s.publishedAt, publishedAtIso: `${s.publishedAt}T00:00:00+09:00`, tags: s.tags, thumbVariant: s.thumbVariant }));
}

/** 공개된 스토리 (최신 순) */
export async function listStories(): Promise<StoryListItem[]> {
  if (shouldUseFixtures()) return fixtureItems();
  if (!db()) return [];
  try {
    return await cachedList();
  } catch (error) {
    logger.error("stories.list_failed", { errorType: error instanceof Error ? error.name : typeof error });
    return [];
  }
}

/** 공개된 글 하나. 공개되지 않았거나 없으면 null */
export async function getStory(slug: string): Promise<StoryDetail | null> {
  if (shouldUseFixtures()) {
    const s = getFixtureStory(slug);
    if (!s) return null;
    return { ...fixtureItems().find((i) => i.slug === slug)!, doc: bodyFromPlainText(s.body.join("\n\n")), media: [], questions: s.questions ?? [], seoTitle: "", seoDescription: "", thumbVariant: s.thumbVariant };
  }
  if (!db()) return null;
  // 목록에 없는 주소는 상세 캐시를 만들지 않는다 (임의 주소로 캐시가 쌓이지 않게)
  const known = await listStories();
  if (!known.some((s) => s.slug === slug)) return null;
  return cachedDetail(slug);
}

export async function getStoryNeighbors(slug: string) {
  return neighborsOf(await listStories(), slug);
}

export async function listStoryTags(): Promise<string[]> {
  return tagsOf(await listStories());
}

