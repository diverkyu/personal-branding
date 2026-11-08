// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { sanitizeBody } from "@/content/body";
import { insertBlockAfterSelection } from "./commands";
import { buildExtensions } from "./extensions";

/**
 * 편집기 확장이 서버 본문 검사기와 맞는지 확인한다. 편집기가 만든 문서는 검사기를 그대로 통과해야 하고,
 * 허용 밖의 HTML(스크립트·iframe·외부 이미지·코드·밑줄·위험한 링크)은 편집기 단계에서 이미 걸러져야 한다.
 */
const UUID = "123e4567-e89b-42d3-a456-426614174000";
let editor: Editor | undefined;

function make(content: unknown = "") {
  editor = new Editor({ element: document.createElement("div"), extensions: buildExtensions(), content: content as never });
  return editor;
}

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

function names(node: unknown, found = new Set<string>()): Set<string> {
  if (node && typeof node === "object") {
    const n = node as { type?: string; marks?: { type: string }[]; content?: unknown[] };
    if (n.type) found.add(n.type);
    n.marks?.forEach((m) => found.add(`mark:${m.type}`));
    n.content?.forEach((c) => names(c, found));
  }
  return found;
}

describe("편집기가 만드는 문서는 서버 검사기를 통과한다", () => {
  it("모든 서식 명령의 결과", () => {
    const e = make("<p>본문</p>");
    e.commands.selectAll();
    e.commands.toggleBold();
    e.commands.toggleItalic();
    e.commands.setLink({ href: "https://example.com" });
    e.commands.insertContentAt(e.state.doc.content.size, { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "제목" }] });
    e.commands.insertContentAt(e.state.doc.content.size, { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "소제목" }] });
    e.commands.insertContentAt(e.state.doc.content.size, { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "항목" }] }] }] });
    e.commands.insertContentAt(e.state.doc.content.size, { type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "첫째" }] }] }] });
    e.commands.insertContentAt(e.state.doc.content.size, { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "인용" }] }] });
    e.commands.insertContentAt(e.state.doc.content.size, { type: "horizontalRule" });
    e.commands.insertContentAt(e.state.doc.content.size, { type: "image", attrs: { mediaId: UUID } });
    e.commands.insertContentAt(e.state.doc.content.size, { type: "video", attrs: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } });
    const json = e.getJSON();
    const result = sanitizeBody(json);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    const types = names(json);
    for (const t of ["heading", "bulletList", "orderedList", "blockquote", "horizontalRule", "image", "video", "mark:bold", "mark:italic", "mark:link"]) expect(types.has(t), t).toBe(true);
  });

  it("검사기를 통과한 문서를 다시 편집기에 넣고 꺼내도 같다 (왕복)", () => {
    const first = make("<h2>제목</h2><p>글 <strong>굵게</strong> <a href=\"https://example.com/x\">링크</a></p><ul><li><p>항목</p></li></ul>").getJSON();
    const clean = sanitizeBody(first);
    if (!clean.ok) throw new Error(clean.error);
    editor?.destroy();
    const again = make(clean.doc).getJSON();
    expect(sanitizeBody(again)).toEqual(clean);
  });
});

describe("허용 밖의 내용은 편집기에서 이미 걸러진다 (붙여넣기·불러오기)", () => {
  it("스크립트·iframe·외부 이미지·코드·밑줄·취소선·1단계 제목이 남지 않는다", () => {
    const html =
      "<h1>큰 제목</h1><p>안녕 <u>밑줄</u> <s>취소선</s> <code>코드</code></p><script>alert(1)</script><iframe src=\"https://evil.example\"></iframe>" +
      "<img src=\"http://evil.example/x.png\" onerror=\"alert(1)\"><pre><code>소스</code></pre><p style=\"color:red\" onclick=\"x()\">스타일</p>";
    const json = make(html).getJSON();
    const types = names(json);
    for (const bad of ["script", "iframe", "codeBlock", "mark:underline", "mark:strike", "mark:code", "img"]) expect(types.has(bad), bad).toBe(false);
    const result = sanitizeBody(json);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(JSON.stringify(json)).not.toMatch(/alert|evil|onclick|color:red/);
  });

  it("https 가 아닌 링크는 링크로 남지 않는다", () => {
    for (const href of ["javascript:alert(1)", "data:text/html,x", "http://example.com", "//evil.example", "ftp://example.com"]) {
      editor?.destroy();
      const json = make(`<p><a href="${href}">링크</a></p>`).getJSON();
      expect(names(json).has("mark:link"), href).toBe(false);
    }
    editor?.destroy();
    expect(names(make('<p><a href="https://example.com">링크</a></p>').getJSON()).has("mark:link")).toBe(true);
  });

  it("setLink 명령도 http 주소를 거부한다", () => {
    const e = make("<p>글자</p>");
    e.commands.selectAll();
    e.commands.setLink({ href: "http://example.com" });
    expect(names(e.getJSON()).has("mark:link")).toBe(false);
    e.commands.setLink({ href: "javascript:alert(1)" });
    expect(names(e.getJSON()).has("mark:link")).toBe(false);
  });

  it("허용 도메인이 아닌 영상 주소는 붙여넣어도 영상이 되지 않는다", () => {
    expect(names(make('<figure data-type="video" data-url="https://evil.example/v"></figure>').getJSON()).has("video")).toBe(false);
    editor?.destroy();
    expect(names(make('<figure data-type="video" data-url="https://vimeo.com/123456789"></figure>').getJSON()).has("video")).toBe(true);
  });
});

describe("이미지·영상 넣기는 선택한 것을 덮어쓰지 않는다", () => {
  const image = { type: "image", attrs: { mediaId: UUID } };
  const video = { type: "video", attrs: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } };
  const top = (e: Editor) => (e.getJSON().content ?? []).map((n) => n.type);

  it("선택한 글자는 그대로 두고 그 뒤에 넣는다", () => {
    const e = make("<p>선택한 글자</p>");
    e.commands.selectAll();
    insertBlockAfterSelection(e, image);
    expect(JSON.stringify(e.getJSON())).toContain("선택한 글자");
    expect(top(e)).toContain("image");
    expect(sanitizeBody(e.getJSON()).ok).toBe(true);
  });

  it("문단 한가운데에서 넣으면 글자가 사라지지 않고 문단이 나뉜다", () => {
    const e = make("<p>앞뒤</p>");
    e.commands.setTextSelection(2);
    insertBlockAfterSelection(e, image);
    const text = JSON.stringify(e.getJSON());
    expect(text).toContain("앞");
    expect(text).toContain("뒤");
    expect(top(e)).toContain("image");
    expect(sanitizeBody(e.getJSON()).ok).toBe(true);
  });

  it("이미 선택된 영상을 이미지로 바꿔 치우지 않고 둘 다 남는다", () => {
    const e = make("<p>글</p>");
    insertBlockAfterSelection(e, video);
    insertBlockAfterSelection(e, image);
    const types = top(e);
    expect(types).toContain("video");
    expect(types).toContain("image");
    expect(types.indexOf("video")).toBeLessThan(types.indexOf("image"));
    expect(sanitizeBody(e.getJSON()).ok).toBe(true);
  });

  it("넣은 뒤에 이어서 쓸 빈 문단이 있다", () => {
    const e = make("");
    insertBlockAfterSelection(e, image);
    const types = top(e);
    expect(types[types.length - 1]).toBe("paragraph");
  });
});
