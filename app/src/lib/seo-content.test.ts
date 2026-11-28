import { afterEach, describe, expect, it, vi } from "vitest";
import { pageSeo, legacyHomeSeo } from "@/config/pageSeo";
import { filmSearchCopy } from "@/config/filmSeo";
import { resolveSettings } from "@/settings/registry";
import { pageMeta, sectionMeta } from "./seo";
import { articleLd, eventLd, personLd, videoLd } from "./structured";
import { stories, tours } from "@/data/fixtures";

afterEach(() => vi.unstubAllEnvs());

describe("페이지별 검색·공유 정책", () => {
  it("목록 설명이 서로 다르고 빈 목록만 noindex를 덧붙인다", () => {
    const values = Object.entries(pageSeo).map(([path]) => sectionMeta(path as keyof typeof pageSeo, 1));
    expect(new Set(values.map((m) => m.description)).size).toBe(values.length);
    for (const value of values) {
      expect(value.robots).toBeUndefined(); // Preview의 layout noindex를 덮어쓸 수 없다.
      expect(value.description?.length).toBeGreaterThanOrEqual(40);
      expect(value.description?.length).toBeLessThanOrEqual(160);
      expect(value.twitter).toMatchObject({ card: "summary_large_image" });
    }
    for (const path of ["/story", "/films", "/freediving/tours", "/freediving/equipment", "/freediving/reviews", "/freediving/travel"] as const) {
      expect(sectionMeta(path, 0).robots).toMatchObject({ index: false });
      expect(sectionMeta(path, 0).description).not.toBe(sectionMeta(path, 1).description);
    }
  });
  it("홈은 사이트맵과 같은 origin 표기를 쓰고 절대 제목에 브랜드를 중복하지 않는다", () => {
    vi.stubEnv("SITE_URL", "https://site.example");
    const result = pageMeta("/", { title: { absolute: "운영자 지정 제목" }, description: "홈 설명" });
    expect(result.alternates?.canonical).toBe("https://site.example");
    expect(result.openGraph).toMatchObject({ title: "운영자 지정 제목", url: "https://site.example" });
    expect(result.twitter).toMatchObject({ title: "운영자 지정 제목", description: "홈 설명" });
  });
  it("작품의 실제 이미지를 OG와 Twitter 모두에 쓰며 없으면 브랜드 이미지를 쓴다", () => {
    const images = [{ url: "/real-poster.webp", alt: "실제 장면" }];
    const m = pageMeta("/films/test", { title: "작품", openGraph: { images } });
    expect(m.twitter).toMatchObject({ images });
    expect(pageMeta("/contact").openGraph).toHaveProperty("images");
  });
  it("이전 초기값만 새 홈 설명으로 바꾸고 운영자가 직접 쓴 설정은 보존한다", () => {
    expect(resolveSettings({ "seo.description": legacyHomeSeo.description })["seo.description"]).not.toBe(legacyHomeSeo.description);
    const own = { "seo.title": "직접 쓴 제목", "seo.description": "직접 쓴 설명", "seo.indexing": "on" };
    expect(resolveSettings(own)).toMatchObject(own);
  });
});

describe("확인된 작품 설명과 작성자", () => {
  const film = { slug: "brilliant-ordinary-days-ep1", title: "찬란한 보통의 날들 EP1. 괜찮지 않아도 돼", summary: "찬란한 보통의 날들 EP1 AI로 만든 숏드라마입니다.", seoTitle: "", seoDescription: "", tags: ["숏드라마"], duration: "", hasCaptions: false };
  it("알려진 초기 작품에만 개별 설명을 쓰고 새 원고·SEO 입력을 덮어쓰지 않는다", () => {
    expect(filmSearchCopy(film).description).toContain("괜찮지 않아도 돼");
    expect(filmSearchCopy({ ...film, summary: "새로 쓴 실제 줄거리" }).description).toBe("새로 쓴 실제 줄거리");
    expect(filmSearchCopy({ ...film, seoTitle: "다른 제목", seoDescription: "제작자가 확정한 설명" })).toEqual({ title: "다른 제목", description: "제작자가 확정한 설명" });
    expect(filmSearchCopy({ ...film, title: "새 제목", summary: "새 요약" }).description).toBe("새 요약");
  });
  it("Person과 Article·영상 제작자는 같은 인물 ID와 소개 주소를 가리킨다", () => {
    const origin = "https://site.example";
    const person = personLd(origin, []);
    for (const ld of [articleLd(origin, stories[0]!), videoLd(origin, { ...film, publishedAtIso: "2026-11-01T00:00:00Z", videoUrl: "", poster: { src: "" } })]) {
      expect(ld.author).toMatchObject({ "@id": person["@id"], url: `${origin}/about` });
    }
    expect(person.hasCredential).toHaveLength(2);
  });
  it("행사 마감은 취소로 표시하지 않고 확인된 방문 지역만 넣는다", () => {
    const ld = eventLd("https://site.example", { ...tours[0]!, slug: "coron-freediving-tour-2026", status: "closed" });
    expect(ld.eventStatus).toBe("https://schema.org/EventScheduled");
    expect(ld.location).toHaveLength(3);
    expect(JSON.stringify(ld.location)).toContain('"addressCountry":"PH"');
    expect(JSON.stringify(ld)).not.toMatch(/streetAddress|postalCode|offers|aggregateRating/);
    expect(ld).not.toHaveProperty("image"); // 로고를 행사 사진으로 위장하지 않는다.
  });
});
