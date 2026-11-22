import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroVisual } from "./HeroVisual";

describe("홈 히어로 그림 자리", () => {
  it("이미지가 없으면 기본 일러스트와 CONCEPT VISUAL 표시를 그린다", () => {
    const html = renderToStaticMarkup(<HeroVisual image={null} />);
    expect(html).toContain("<svg");
    expect(html).toContain("CONCEPT VISUAL");
  });

  it("이미지가 있으면 아래 문구만 얹고, 위쪽 INTO THE BLUE 와 CONCEPT VISUAL 은 보이지 않는다", () => {
    const html = renderToStaticMarkup(<HeroVisual image={{ url: "/media-dev/a.webp", alt: "바다 위 아치 바위", width: 1280, height: 1560 }} />);
    expect(html).toContain('src="/media-dev/a.webp"');
    expect(html).toContain('alt="바다 위 아치 바위"');
    expect(html).not.toContain("INTO THE BLUE");
    expect(html).toContain("한 호흡, 무한한 가능성.");
    expect(html).not.toContain("CONCEPT VISUAL");
  });
});
