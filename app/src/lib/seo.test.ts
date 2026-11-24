import { describe, expect, it } from "vitest";
import { personLd, websiteLd } from "./structured";
import { BASE_OPEN_GRAPH, pageMeta, verificationOf } from "./seo";

describe("페이지 메타 (pageMeta)", () => {
  it("정규 주소는 자기 경로이고, 공유 미리보기에 사이트 이름·언어·제목·설명이 함께 들어간다", () => {
    const m = pageMeta("/freediving/tours", { title: "투어", description: "설명" });
    expect(m.alternates).toEqual({ canonical: "/freediving/tours" });
    expect(m.openGraph).toMatchObject({ ...BASE_OPEN_GRAPH, url: "/freediving/tours", title: "투어 — KYU", description: "설명" });
    expect(m.title).toBe("투어");
  });

  it("페이지가 준 openGraph(이미지·종류)는 기본값 위에 얹힌다", () => {
    const m = pageMeta("/films/a", { title: "A", openGraph: { type: "video.other", images: [{ url: "/p.webp" }] } });
    expect(m.openGraph).toMatchObject({ siteName: "KYU", type: "video.other", images: [{ url: "/p.webp" }] });
  });
});

describe("검색엔진 소유 확인 (verificationOf)", () => {
  it("값이 없으면 태그를 만들지 않는다", () => {
    expect(verificationOf({})).toBeUndefined();
    expect(verificationOf({ GOOGLE_SITE_VERIFICATION: "  " })).toBeUndefined();
  });

  it("구글은 google, 네이버·빙은 각자의 meta 이름으로 넣는다", () => {
    expect(verificationOf({ GOOGLE_SITE_VERIFICATION: "g1", NAVER_SITE_VERIFICATION: "n1", BING_SITE_VERIFICATION: "b1" })).toEqual({
      google: "g1",
      other: { "naver-site-verification": "n1", "msvalidate.01": "b1" },
    });
  });
});

describe("인물 구조화 데이터 (personLd)", () => {
  const ORIGIN = "https://www.example.test";

  it("이름·활동명·하는 일·About 주소를 담고, 홈의 WebSite 가 같은 @id 를 가리킨다", () => {
    const p = personLd(ORIGIN, []);
    expect(p).toMatchObject({ "@type": "Person", name: "이동규", alternateName: "KYU", url: `${ORIGIN}/about`, jobTitle: ["프리다이빙 강사", "AI 크리에이터"] });
    expect((websiteLd(ORIGIN).publisher as Record<string, unknown>)["@id"]).toBe(p["@id"]);
  });

  it("SNS 주소가 있을 때만 sameAs 를 넣고, 이메일은 넣지 않는다", () => {
    expect(personLd(ORIGIN, [])).not.toHaveProperty("sameAs");
    const p = personLd(ORIGIN, ["https://www.instagram.com/kyu"]);
    expect(p.sameAs).toEqual(["https://www.instagram.com/kyu"]);
    expect(JSON.stringify(p)).not.toContain("@example");
    expect(p).not.toHaveProperty("email");
  });
});
