// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { sanitizeBody, BODY_LIMITS, type BodyDoc } from "@/content/body";
import { VIDEO_LIMITS, cleanVideoFields, videoProblems } from "@/content/videoFields";
import { LIMITS } from "@/data/admin/contents";
import { buildExtensions } from "./extensions";

/**
 * 발행 원고(docs/content/ai-video-guide)가 사이트의 한도와 편집기 서식에 맞는지 확인한다.
 * 원고를 고치다 한도를 넘거나, 편집기가 받지 못하는 서식이 들어가면 여기서 먼저 알게 된다.
 */
const DIR = path.resolve(__dirname, "../../../docs/content/ai-video-guide");
const html = readFileSync(path.join(DIR, "story-guide.html"), "utf8");
const films = readFileSync(path.join(DIR, "film-fields.md"), "utf8");

let editor: Editor | undefined;
afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

function guideBody(): string {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  return parsed.getElementById("guide")?.innerHTML ?? "";
}

function count(node: unknown, type: string): number {
  const n = node as { type?: string; content?: unknown[] };
  return (n.type === type ? 1 : 0) + (n.content ?? []).reduce<number>((sum, c) => sum + count(c, type), 0);
}

function textOf(node: unknown): string {
  const n = node as { text?: string; content?: unknown[] };
  return (n.text ?? "") + (n.content ?? []).map(textOf).join("\n");
}

/** `### 제목` 바로 뒤의 ```text 블록 */
function noteBlock(heading: string): string {
  const start = films.indexOf(`### ${heading}`);
  expect(start, `${heading} 칸이 없습니다`).toBeGreaterThan(-1);
  const open = films.indexOf("```text\n", start) + "```text\n".length;
  return films.slice(open, films.indexOf("\n```", open));
}

describe("Story 가이드 원고 (story-guide.html)", () => {
  it("편집기에 붙여넣으면 서버 검사기를 그대로 통과한다", () => {
    editor = new Editor({ element: document.createElement("div"), extensions: buildExtensions(), content: guideBody() });
    const json = editor.getJSON();
    const clean = sanitizeBody(json);
    expect(clean.ok, JSON.stringify(clean)).toBe(true);
    if (!clean.ok) return;
    // 편집기를 거치지 않은 직접 검사도 같은 결과
    expect(sanitizeBody(clean.doc)).toEqual(clean);
  });

  it("가이드에 필요한 서식이 모두 살아 있다: 제목 6단계+, 표 2개, 복사 상자 4개, 목록, 인용", () => {
    editor = new Editor({ element: document.createElement("div"), extensions: buildExtensions(), content: guideBody() });
    const doc = editor.getJSON() as BodyDoc;
    expect(count(doc, "table")).toBe(2);
    expect(count(doc, "codeBlock")).toBe(4);
    expect(count(doc, "bulletList")).toBeGreaterThanOrEqual(4);
    expect(count(doc, "blockquote")).toBeGreaterThanOrEqual(4);
    const headings = (doc.content ?? []).filter((b) => b.type === "heading").map((b) => textOf(b));
    for (const step of ["1단계", "2단계", "3단계", "4단계", "5단계", "6단계"]) expect(headings.some((h) => h.startsWith(step)), step).toBe(true);
  });

  it("복사 상자는 줄바꿈을 지키고 한도(6,000자) 안이며, 표는 격자 한도 안이다", () => {
    editor = new Editor({ element: document.createElement("div"), extensions: buildExtensions(), content: guideBody() });
    const doc = editor.getJSON() as BodyDoc;
    const boxes = (doc.content ?? []).filter((b) => b.type === "codeBlock").map((b) => textOf(b));
    expect(boxes).toHaveLength(4);
    for (const box of boxes) {
      expect(box.length).toBeLessThanOrEqual(BODY_LIMITS.maxCodeBlock);
      expect(box).toContain("\n");
    }
    expect(boxes.some((b) => b.startsWith("15초 길이의 사실적인 한국어 셀카 영상"))).toBe(true);
    for (const t of (doc.content ?? []).filter((b) => b.type === "table")) {
      const rows = (t as { content: { content: unknown[] }[] }).content;
      expect(rows.length).toBeLessThanOrEqual(BODY_LIMITS.maxTableRows);
      expect(Math.max(...rows.map((r) => r.content.length))).toBeLessThanOrEqual(BODY_LIMITS.maxTableCols);
    }
  });

  it("노션 흔적(원시 태그, 댓글·태그 요청, 초안 안내, 불러오는 중)이 없고, 이미지 자리 표시는 3곳이다", () => {
    const text = textOf(new Editor({ element: document.createElement("div"), extensions: buildExtensions(), content: guideBody() }).getJSON());
    for (const bad of ["<aside>", "<table", "댓글로 남겨", "저를 태그", "제작용 초안", "불러오는 중", "코드를 불러오는"]) expect(text, bad).not.toContain(bad);
    expect(text.match(/\[이미지 자리/g)).toHaveLength(3);
  });
});

describe("Films 작품 원고 (film-fields.md)", () => {
  it("제작 노트 3칸은 5,000자 이내이고 영상 항목 검사를 통과한다", () => {
    const notes = { sceneIntent: noteBlock("장면 의도"), promptNotes: noteBlock("프롬프트 · 스킬"), editNotes: noteBlock("편집 판단") };
    for (const [key, text] of Object.entries(notes)) {
      expect(text.length, key).toBeGreaterThan(50);
      expect(text.length, key).toBeLessThanOrEqual(VIDEO_LIMITS.note);
    }
    const fields = cleanVideoFields({ ...notes, videoUrl: "https://www.instagram.com/reel/DfyQydRMWBw/?utm_source=ig_web_copy_link&rpxt=x&srtk=y", duration: "0:15", hasCaptions: true });
    expect(fields.videoUrl).toBe("https://www.instagram.com/reel/DfyQydRMWBw/");
    expect(fields.promptNotes).toContain("15초 길이의 사실적인 한국어 셀카 영상");
    // 포스터만 빠진 상태: 발행 점검이 막는 것은 포스터뿐이어야 한다
    expect(videoProblems(fields)).toEqual(["포스터 이미지를 골라 주세요."]);
  });

  it("제목·요약·태그·영상 소개 문단이 공통 한도 안이고 영상 소개도 편집기 서식에 맞는다", () => {
    const row = (name: string) => new RegExp(`\\| ${name} \\| (.+?) \\|`).exec(films)?.[1] ?? "";
    expect(row("제목").length).toBeLessThanOrEqual(LIMITS.title);
    expect(row("요약\\(설명\\)").length).toBeLessThanOrEqual(160); // 발행 점검의 요약 한도
    const tags = row("태그").split(",").map((t) => t.trim());
    expect(tags.length).toBeLessThanOrEqual(LIMITS.tags);
    for (const t of tags) expect(t.length).toBeLessThanOrEqual(LIMITS.tag);
    const storyTitle = /\| 제목 \| (이런 AI 영상.+?) \|/.exec(films)?.[1] ?? "";
    expect(storyTitle.length).toBeGreaterThan(0);
    expect(storyTitle.length).toBeLessThanOrEqual(LIMITS.title);
    const storySummary = /\| 요약 \| (캐릭터 준비부터.+?) \|/.exec(films)?.[1] ?? "";
    expect(storySummary.length).toBeLessThanOrEqual(160);

    const intro = films.slice(films.indexOf("## 영상 소개"));
    const open = intro.indexOf("```text\n") + "```text\n".length;
    const body = intro.slice(open, intro.indexOf("\n```", open));
    const paragraphs = body.split(/\n{2,}/).map((p) => `<p>${p}</p>`).join("");
    editor = new Editor({ element: document.createElement("div"), extensions: buildExtensions(), content: paragraphs });
    expect(sanitizeBody(editor.getJSON()).ok).toBe(true);
    expect((editor.getJSON().content ?? []).length).toBe(2);
  });
});
