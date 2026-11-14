/**
 * 화면이 여행 추천을 읽는 입구 (서버 전용, AGENTS §6). 스토리·투어·장비·Films 와 같은 규칙이다.
 * DATABASE_URL 이 있으면 DB 의 공개 글(태그 캐시 최대 5분, 어드민 변경 때 즉시 갱신), 없으면 가상 글 —
 * 로컬 개발·자동 시험 전용이고 배포 환경(VERCEL)에서는 절대 쓰지 않는다. 목록 읽기가 실패하면 빈 목록(캐시하지 않음), 상세는 오류.
 */
import "server-only";
import { unstable_cache } from "next/cache";
import { STORIES_MAX_AGE_SECONDS, TRAVEL_TAG } from "@/content/cacheTags";
import { bodyFromPlainText } from "@/content/body";
import { getDb } from "@/db/client";
import type { AdminDb } from "@/data/admin/db";
import { logger } from "@/lib/logger";
import { levelsOf, neighborsOf, queryLiveTravel, queryLiveTravelItem, regionsOf, type TravelDetail, type TravelItem } from "./travelQueries";

export type { TravelDetail, TravelItem } from "./travelQueries";

function db(): AdminDb | null {
  const url = process.env.DATABASE_URL?.trim();
  return url ? (getDb(url) as unknown as AdminDb) : null;
}

const shouldUseFixtures = () => !process.env.DATABASE_URL?.trim() && !process.env.VERCEL;

const cachedList = unstable_cache(async () => queryLiveTravel(db() as AdminDb), ["travel-live-list"], { tags: [TRAVEL_TAG], revalidate: STORIES_MAX_AGE_SECONDS });
const cachedDetail = unstable_cache(async (slug: string) => queryLiveTravelItem(db() as AdminDb, slug), ["travel-live-detail"], { tags: [TRAVEL_TAG], revalidate: STORIES_MAX_AGE_SECONDS });

/** 로컬 개발·시험용 가상 글. 글은 모두 자리표시이고 실제 장소·정보가 아니다 */
const FIXTURES: TravelDetail[] = [
  { slug: "sample-travel-jeju", title: "여행 제목이 들어갑니다 (제주)", summary: "한 줄 소개가 이 자리에 보입니다. (자리표시)", region: "제주", place: "장소 이름 (자리표시)", season: "5~10월", level: "beginner", budget: "예산 안내 (자리표시)", checkedAt: "2999-01-01", publishedAt: "2026-11-03", publishedAtIso: "2026-11-03T00:00:00+09:00", doc: bodyFromPlainText("본문이 이 자리에 보입니다. (자리표시)"), media: [], seoTitle: "", seoDescription: "" },
  { slug: "sample-travel-bohol", title: "여행 제목이 들어갑니다 (보홀)", summary: "한 줄 소개가 이 자리에 보입니다. (자리표시)", region: "필리핀 보홀", place: "장소 이름 (자리표시)", season: "11~5월", level: "intermediate", budget: "", checkedAt: "2999-01-01", publishedAt: "2026-11-02", publishedAtIso: "2026-11-02T00:00:00+09:00", doc: null, media: [], seoTitle: "", seoDescription: "" },
  { slug: "sample-travel-old", title: "오래된 정보 표시 예시 (자리표시)", summary: "정보 확인일이 오래된 글의 모양입니다.", region: "이집트 다합", place: "장소 이름 (자리표시)", season: "연중", level: "advanced", budget: "", checkedAt: "2020-01-01", publishedAt: "2026-11-01", publishedAtIso: "2026-11-01T00:00:00+09:00", doc: null, media: [], seoTitle: "", seoDescription: "" },
];

/** 공개된 여행 추천 (최신 공개 순) */
export async function listTravel(): Promise<TravelItem[]> {
  if (shouldUseFixtures()) return FIXTURES;
  if (!db()) return [];
  try {
    return await cachedList();
  } catch (error) {
    logger.error("travel.list_failed", { errorType: error instanceof Error ? error.name : typeof error });
    return [];
  }
}

/** 공개된 글 하나(상세용). 없거나 공개 전이면 null */
export async function getTravel(slug: string): Promise<TravelDetail | null> {
  if (shouldUseFixtures()) return FIXTURES.find((t) => t.slug === slug) ?? null;
  if (!db()) return null;
  // 목록에 없는 주소는 상세 캐시를 만들지 않는다 (임의 주소로 캐시가 쌓이지 않게)
  if (!(await listTravel()).some((t) => t.slug === slug)) return null;
  return cachedDetail(slug);
}

export async function getTravelNeighbors(slug: string) {
  return neighborsOf(await listTravel(), slug);
}

export async function listTravelRegions(): Promise<string[]> {
  return regionsOf(await listTravel());
}

export async function listTravelLevels() {
  return levelsOf(await listTravel());
}
