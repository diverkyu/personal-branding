/**
 * 화면이 투어를 읽는 입구 (서버 전용, AGENTS §6). 스토리의 data/stories.ts 와 같은 규칙이다.
 *
 * - DATABASE_URL 이 있으면 DB 의 공개 투어를 읽는다(태그 캐시 최대 5분, 어드민 변경 때 즉시 갱신).
 * - 없으면 가상 데이터 — 로컬 개발·자동 시험 전용. 배포 환경(VERCEL)에서는 절대 쓰지 않는다.
 * - 목록 읽기가 실패하면 빈 목록(캐시하지 않음). 상세는 오류로 둔다.
 * - 신청 접수는 캐시를 거치지 않고 읽는다(getTourForInquiry): 모집을 마감했는데 캐시 때문에 신청이 들어오면 안 된다.
 */
import "server-only";
import { unstable_cache } from "next/cache";
import { STORIES_MAX_AGE_SECONDS, TOURS_TAG } from "@/content/cacheTags";
import { getDb } from "@/db/client";
import type { AdminDb } from "@/data/admin/db";
import { logger } from "@/lib/logger";
import type { Tour } from "@/types/content";
import { getTour as getFixtureTour, listOpenTours as fixtureOpen, listPastTours as fixturePast, listReviews, listUpcomingTours as fixtureUpcoming, reviewTourOptions as fixtureReviewOptions } from "./index";
import { openOf, pastOf, queryLiveTour, queryLiveTours, upcomingOf, type TourItem } from "./tourQueries";

export type { TourItem } from "./tourQueries";

function db(): AdminDb | null {
  const url = process.env.DATABASE_URL?.trim();
  return url ? (getDb(url) as unknown as AdminDb) : null;
}

const shouldUseFixtures = () => !process.env.DATABASE_URL?.trim() && !process.env.VERCEL;

const cachedList = unstable_cache(async () => queryLiveTours(db() as AdminDb), ["tours-live-list"], { tags: [TOURS_TAG], revalidate: STORIES_MAX_AGE_SECONDS });
const cachedDetail = unstable_cache(async (slug: string) => queryLiveTour(db() as AdminDb, slug), ["tours-live-detail"], { tags: [TOURS_TAG], revalidate: STORIES_MAX_AGE_SECONDS });

async function all(): Promise<Tour[]> {
  if (shouldUseFixtures()) return [...fixtureUpcoming(), ...fixturePast()];
  if (!db()) return [];
  try {
    return await cachedList();
  } catch (error) {
    logger.error("tours.list_failed", { errorType: error instanceof Error ? error.name : typeof error });
    return [];
  }
}

export async function listUpcomingTours(): Promise<Tour[]> {
  return shouldUseFixtures() ? fixtureUpcoming() : upcomingOf(await all());
}

export async function listOpenTours(): Promise<Tour[]> {
  return shouldUseFixtures() ? fixtureOpen() : openOf(await all());
}

export async function listPastTours(): Promise<Tour[]> {
  return shouldUseFixtures() ? fixturePast() : pastOf(await all());
}

/** 공개된 투어 하나(상세용, 본문 포함). 없거나 공개 전이면 null */
export async function getTour(slug: string): Promise<TourItem | null> {
  if (shouldUseFixtures()) return getFixtureTour(slug) ?? null;
  if (!db()) return null;
  // 목록에 없는 주소는 상세 캐시를 만들지 않는다
  if (!(await all()).some((t) => t.slug === slug)) return null;
  return cachedDetail(slug);
}

/** 신청 접수용: 캐시를 거치지 않고 지금의 상태를 읽는다 */
export async function getTourForInquiry(slug: string): Promise<Tour | undefined> {
  if (shouldUseFixtures()) return getFixtureTour(slug);
  const d = db();
  if (!d) return undefined;
  return (await queryLiveTours(d)).find((t) => t.slug === slug);
}

/** 후기의 "투어" 필터·링크에 쓰는 투어 (후기가 연결한 투어 중 공개된 것) */
export async function reviewTourOptions(): Promise<Tour[]> {
  if (shouldUseFixtures()) return fixtureReviewOptions();
  const slugs = new Set(listReviews().map((r) => r.tourSlug).filter((s): s is string => Boolean(s)));
  return (await all()).filter((t) => slugs.has(t.slug));
}
