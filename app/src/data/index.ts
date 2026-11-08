/**
 * 화면이 콘텐츠를 읽는 유일한 입구 (AGENTS §6: 화면에서 DB·스토리지 직접 접근 금지).
 * 지금은 가상 데이터(fixtures)를 돌려준다. 저장소가 정해지면 이 파일의 구현만 바꾼다.
 */
import { equipment, reviews, stories, tours } from "./fixtures";
import type { Equipment, Review, Story, Tour } from "@/types/content";

const byDateDesc = <T,>(date: (item: T) => string) => (a: T, b: T) => date(b).localeCompare(date(a));

export function listStories(): Story[] {
  return [...stories].sort(byDateDesc((s) => s.publishedAt));
}

export function getStory(slug: string): Story | undefined {
  return stories.find((s) => s.slug === slug);
}

/** 발행일 기준 이전 글(더 오래된 글)과 다음 글(더 새로운 글) */
export function getStoryNeighbors(slug: string): { newer?: Story; older?: Story } {
  const list = listStories();
  const i = list.findIndex((s) => s.slug === slug);
  if (i < 0) return {};
  return { newer: list[i - 1], older: list[i + 1] };
}

export function listStoryTags(): string[] {
  return [...new Set(stories.flatMap((s) => s.tags))];
}

/** 진행 예정 = 모집 중·모집 예정·마감. 시작일이 가까운 순 */
export function listUpcomingTours(): Tour[] {
  return tours.filter((t) => t.status !== "ended").sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** 홈·허브 요약용: 모집 중 또는 모집 예정 */
export function listOpenTours(): Tour[] {
  return listUpcomingTours().filter((t) => t.status === "recruiting" || t.status === "upcoming");
}

export function listPastTours(): Tour[] {
  return tours.filter((t) => t.status === "ended").sort(byDateDesc((t) => t.endDate));
}

export function getTour(slug: string): Tour | undefined {
  return tours.find((t) => t.slug === slug);
}

export function listEquipment(): Equipment[] {
  return [...equipment];
}

export function getEquipment(slug: string): Equipment | undefined {
  return equipment.find((e) => e.slug === slug);
}

export function listEquipmentCategories(): string[] {
  return [...new Set(equipment.map((e) => e.category))];
}

export function listReviews(): Review[] {
  return [...reviews].sort(byDateDesc((r) => r.writtenAt));
}

export function listFeaturedReviews(limit = 3): Review[] {
  return listReviews().filter((r) => r.featured).slice(0, limit);
}

/** 투어 상세용: 연결된 후기 최대 4건, 없으면 대표 후기 3건 (INT-07) */
export function listReviewsForTour(tourSlug: string): Review[] {
  const linked = listReviews().filter((r) => r.tourSlug === tourSlug).slice(0, 4);
  return linked.length > 0 ? linked : listFeaturedReviews(3);
}

export function reviewTourOptions(): Tour[] {
  const slugs = new Set(reviews.map((r) => r.tourSlug).filter((s): s is string => Boolean(s)));
  return tours.filter((t) => slugs.has(t.slug));
}
