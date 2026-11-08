import { describe, expect, it } from "vitest";
import { stories, tours } from "@/data/fixtures";
import { articleLd, breadcrumbLd, eventLd, safeJson, websiteLd } from "./structured";

const ORIGIN = "https://example.test";

describe("구조화 데이터", () => {
  it("Article 은 화면에 있는 값(제목·요약·발행일·태그)만 담고 절대 주소를 쓴다", () => {
    const story = stories[0]!;
    const ld = articleLd(ORIGIN, story);
    expect(ld["@type"]).toBe("Article");
    expect(ld.headline).toBe(story.title);
    expect(ld.datePublished).toBe(story.publishedAt);
    expect(ld.mainEntityOfPage).toBe(`${ORIGIN}/story/${story.slug}`);
  });

  it("Event 는 가격·결제 정보(offers)를 만들지 않는다", () => {
    const ld = eventLd(ORIGIN, tours[0]!);
    expect(ld["@type"]).toBe("Event");
    expect(ld).not.toHaveProperty("offers");
    expect(ld.startDate).toBe(tours[0]!.startDate);
  });

  it("WebSite 와 BreadcrumbList 의 주소는 SITE_URL 기준이다", () => {
    expect(websiteLd(ORIGIN).url).toBe(`${ORIGIN}/`);
    const b = breadcrumbLd(ORIGIN, [{ name: "Freediving", path: "/freediving" }, { name: "투어", path: "/freediving/tours" }]);
    expect(JSON.stringify(b)).toContain(`${ORIGIN}/freediving/tours`);
  });

  it("safeJson 은 </script> 를 닫지 못하게 이스케이프한다", () => {
    const out = safeJson({ name: "</script><script>alert(1)</script>", a: "x&y" });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});
