import { beforeEach, expect, it, vi } from "vitest";
const data = vi.hoisted(() => ({ stories: [], films: [], travel: [], equipment: [], reviews: [], upcoming: [], past: [] } as Record<string, { slug: string; publishedAtIso?: string }[]>));
vi.mock("@/data/stories", () => ({ listStories: async () => data.stories }));
vi.mock("@/data/films", () => ({ listFilms: async () => data.films }));
vi.mock("@/data/travel", () => ({ listTravel: async () => data.travel }));
vi.mock("@/data/equipment", () => ({ listEquipment: async () => data.equipment }));
vi.mock("@/data/reviews", () => ({ listReviews: async () => data.reviews }));
vi.mock("@/data/tours", () => ({ listUpcomingTours: async () => data.upcoming, listPastTours: async () => data.past }));
import sitemap from "./sitemap";

beforeEach(() => { for (const key of Object.keys(data)) data[key] = []; });
it("빈 목록을 제외하고 공개 콘텐츠가 있으면 목록과 상세를 함께 알린다", async () => {
  const paths = (rows: Awaited<ReturnType<typeof sitemap>>) => rows.map((r) => new URL(r.url).pathname);
  expect(paths(await sitemap())).toEqual(["/", "/about", "/freediving", "/contact", "/privacy"]);
  const when = "2026-11-28T00:00:00.000Z";
  data.stories = [{ slug: "published-story", publishedAtIso: when }];
  data.past = [{ slug: "past-tour", publishedAtIso: when }];
  data.equipment = [{ slug: "mask", publishedAtIso: when }];
  const result = await sitemap();
  expect(paths(result)).toEqual(expect.arrayContaining(["/story", "/story/published-story", "/freediving/tours", "/freediving/tours/past-tour", "/freediving/equipment/mask"]));
  for (const row of result.filter((r) => /published-story|past-tour|\/mask$/.test(r.url))) expect(row.lastModified).toBe(when);
  expect(paths(result)).not.toContain("/films");
});
