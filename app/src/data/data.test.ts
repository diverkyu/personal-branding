import { describe, expect, it } from "vitest";
import { getStoryNeighbors, listFeaturedReviews, listOpenTours, listPastTours, listReviewsForTour, listStories, listUpcomingTours } from "./index";

describe("가상 데이터 읽기 규칙", () => {
  it("스토리는 발행일 역순이다", () => {
    const dates = listStories().map((s) => s.publishedAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("이전·다음 글은 발행일 기준 이웃이고 양 끝은 비어 있다", () => {
    const list = listStories();
    const first = list[0]!;
    const last = list[list.length - 1]!;
    expect(getStoryNeighbors(first.slug).newer).toBeUndefined();
    expect(getStoryNeighbors(first.slug).older?.slug).toBe(list[1]?.slug);
    expect(getStoryNeighbors(last.slug).older).toBeUndefined();
  });

  it("진행 예정은 종료를 제외하고, 요약은 모집 중·모집 예정만 담는다", () => {
    expect(listUpcomingTours().every((t) => t.status !== "ended")).toBe(true);
    expect(listOpenTours().every((t) => t.status === "recruiting" || t.status === "upcoming")).toBe(true);
    expect(listPastTours().every((t) => t.status === "ended")).toBe(true);
  });

  it("투어 후기는 연결된 것이 없으면 대표 후기로 대신한다", () => {
    expect(listReviewsForTour("sample-ended-1").every((r) => r.tourSlug === "sample-ended-1")).toBe(true);
    expect(listReviewsForTour("sample-recruiting")).toEqual(listFeaturedReviews(3));
  });
});
