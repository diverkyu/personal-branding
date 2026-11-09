/**
 * 화면이 후기를 읽는 입구 (서버 전용, AGENTS §6). 스토리·투어·장비와 같은 규칙이다.
 * DATABASE_URL 이 있으면 DB 의 공개 후기(태그 캐시 최대 5분, 어드민 변경·철회 때 즉시 갱신), 없으면 가상 데이터 —
 * 로컬 개발·자동 시험 전용이고 배포 환경(VERCEL)에서는 절대 쓰지 않는다. 읽기가 실패하면 빈 목록(캐시하지 않음).
 */
import "server-only";
import { unstable_cache } from "next/cache";
import { REVIEWS_TAG, STORIES_MAX_AGE_SECONDS } from "@/content/cacheTags";
import { getDb } from "@/db/client";
import type { AdminDb } from "@/data/admin/db";
import { logger } from "@/lib/logger";
import type { Review, Tour } from "@/types/content";
import { listFeaturedReviews as fixtureFeatured, listReviews as fixtureReviews, listReviewsForTour as fixtureForTour } from "./index";
import { featuredOf, forTourOf, queryPublicReviews, type PublicReview } from "./reviewQueries";
import { listPastTours, listUpcomingTours } from "./tours";

function db(): AdminDb | null {
  const url = process.env.DATABASE_URL?.trim();
  return url ? (getDb(url) as unknown as AdminDb) : null;
}

const shouldUseFixtures = () => !process.env.DATABASE_URL?.trim() && !process.env.VERCEL;

const cachedList = unstable_cache(async () => queryPublicReviews(db() as AdminDb), ["reviews-public-list"], { tags: [REVIEWS_TAG], revalidate: STORIES_MAX_AGE_SECONDS });

async function all(): Promise<PublicReview[]> {
  if (shouldUseFixtures()) return fixtureReviews().map((r) => ({ ...r, featuredOrder: 100 }));
  if (!db()) return [];
  try {
    return await cachedList();
  } catch (error) {
    logger.error("reviews.list_failed", { errorType: error instanceof Error ? error.name : typeof error });
    return [];
  }
}

/** 공개된 후기 전부 (작성일 역순) */
export async function listReviews(): Promise<Review[]> {
  return all();
}

/** 대표 후기 (홈·허브) */
export async function listFeaturedReviews(limit = 3): Promise<Review[]> {
  if (shouldUseFixtures()) return fixtureFeatured(limit);
  return featuredOf(await all(), limit);
}

/** 투어 상세용: 연결된 후기 최대 4건, 없으면 대표 후기 3건 (INT-07) */
export async function listReviewsForTour(tourSlug: string): Promise<Review[]> {
  if (shouldUseFixtures()) return fixtureForTour(tourSlug);
  return forTourOf(await all(), tourSlug);
}

/** 후기의 "투어" 필터·링크에 쓰는 투어 (공개 후기가 연결한 투어 중 지금 공개된 것) */
export async function reviewTourOptions(): Promise<Tour[]> {
  const slugs = new Set((await all()).map((r) => r.tourSlug).filter((s): s is string => Boolean(s)));
  if (slugs.size === 0) return [];
  return [...(await listUpcomingTours()), ...(await listPastTours())].filter((t) => slugs.has(t.slug));
}
