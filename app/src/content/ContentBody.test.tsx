import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { sanitizeBody } from "./body";
import { ContentBody, type BodyMedia } from "./ContentBody";

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const MEDIA: BodyMedia = { id: UUID, url: "https://files.example/media/a.webp", alt: "수면 아래", width: 800, height: 600 };

function html(input: unknown, media: BodyMedia[] = [MEDIA]) {
  const r = sanitizeBody(input);
  if (!r.ok) throw new Error(r.error);
  return renderToStaticMarkup(<ContentBody doc={r.doc} media={new Map(media.map((m) => [m.id, m]))} />);
}

const doc = (...content: unknown[]) => ({ type: "doc", content });
const p = (...c: unknown[]) => ({ type: "paragraph", content: c });
const t = (text: string, marks?: unknown[]) => ({ type: "text", text, ...(marks ? { marks } : {}) });

describe("본문 렌더링", () => {
  it("글자는 항상 이스케이프된다 (HTML 이 실행되지 않는다)", () => {
    const out = html(doc(p(t('<script>alert(1)</script> & "따옴표"'))));
    expect(out).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(out).not.toContain("<script>");
  });

  it("서식을 알맞은 요소로 그리고, 링크에는 안전한 속성을 붙인다", () => {
    const out = html(
      doc(
        { type: "heading", attrs: { level: 2 }, content: [t("제목")] },
        { type: "heading", attrs: { level: 3 }, content: [t("소제목")] },
        p(t("굵게", [{ type: "bold" }]), t(" 기울임", [{ type: "italic" }]), t(" 링크", [{ type: "link", attrs: { href: "https://example.com/a?x=1" } }])),
        { type: "bulletList", content: [{ type: "listItem", content: [p(t("항목"))] }] },
        { type: "orderedList", content: [{ type: "listItem", content: [p(t("첫째"))] }] },
        { type: "blockquote", content: [p(t("인용"))] },
        { type: "horizontalRule" },
      ),
    );
    expect(out).toContain("<h2>");
    expect(out).toContain("<h3>");
    expect(out).toContain("<strong>");
    expect(out).toContain("<em>");
    expect(out).toContain('href="https://example.com/a?x=1"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain("<ul>");
    expect(out).toContain("<ol>");
    expect(out).toContain("<blockquote>");
    expect(out).toContain("<hr/>");
  });

  it("이미지는 라이브러리의 주소·대체 텍스트·크기로 그리고, 삭제된 이미지는 건너뛴다", () => {
    const withImg = html(doc({ type: "image", attrs: { mediaId: UUID } }));
    expect(withImg).toContain('src="https://files.example/media/a.webp"');
    expect(withImg).toContain('alt="수면 아래"');
    expect(withImg).toContain('width="800"');
    expect(withImg).toContain('loading="lazy"');
    expect(html(doc({ type: "image", attrs: { mediaId: UUID } }), [])).not.toContain("<img");
  });

  it("영상은 누르기 전에 외부 주소를 요청하지 않는 재생기로 그린다", () => {
    const out = html(doc({ type: "video", attrs: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } }));
    expect(out).not.toContain("<iframe");
    expect(out).toContain("재생");
  });

  it("줄바꿈과 빈 본문", () => {
    expect(html(doc(p(t("가"), { type: "hardBreak" }, t("나"))))).toContain("<br/>");
    expect(html(doc())).toMatch(/^<div class="[^"]*"><\/div>$/);
  });
});
