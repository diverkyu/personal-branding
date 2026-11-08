/**
 * 콘텐츠 본문 형식 (ADMIN-DESIGN §6). 편집기(Tiptap)가 만드는 JSON 문서를 **허용 목록으로 다시 만들어** 저장한다.
 * 편집기의 제한은 보안 경계가 아니다 — 서버가 이 함수로 모든 본문을 검사하고, 허용되지 않은 것은 거부하거나 버린다.
 * - 허용 노드: 문단, 제목(2·3), 목록(순서/비순서), 인용, 구분선, 줄바꿈, 이미지(미디어 id), 영상(허용 도메인).
 * - 허용 서식: 굵게, 기울임, 링크(https 만).
 * - 모르는 노드 종류는 **거부**하고, 모르는 속성은 **버린다**. 크기·깊이·글자 수에 상한이 있다.
 * 공개 화면은 이 문서를 React 요소로 직접 렌더링한다(HTML 문자열을 넣지 않는다).
 */
import { parseVideoUrl } from "@/lib/video";

export type Mark = { type: "bold" } | { type: "italic" } | { type: "link"; attrs: { href: string } };
export interface TextNode {
  type: "text";
  text: string;
  marks?: Mark[];
}
export type InlineNode = TextNode | { type: "hardBreak" };
export type BlockNode =
  | { type: "paragraph"; content?: InlineNode[] }
  | { type: "heading"; attrs: { level: 2 | 3 }; content?: InlineNode[] }
  | { type: "bulletList"; content: ListItem[] }
  | { type: "orderedList"; content: ListItem[] }
  | { type: "blockquote"; content: BlockNode[] }
  | { type: "horizontalRule" }
  | { type: "image"; attrs: { mediaId: string } }
  | { type: "video"; attrs: { url: string } };
export interface ListItem {
  type: "listItem";
  content: BlockNode[];
}
export interface BodyDoc {
  type: "doc";
  content: BlockNode[];
}

export const BODY_LIMITS = { maxNodes: 4000, maxDepth: 6, maxText: 100_000, maxLinkLength: 500 } as const;

export const EMPTY_BODY: BodyDoc = { type: "doc", content: [] };

export type BodyResult = { ok: true; doc: BodyDoc } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class Reject extends Error {}

interface Budget {
  nodes: number;
  text: number;
}

function obj(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Reject("본문 형식이 올바르지 않습니다.");
  return value as Record<string, unknown>;
}

function list(value: unknown): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Reject("본문 형식이 올바르지 않습니다.");
  return value;
}

/** 링크는 https 만 허용한다 (javascript:, data:, http: 등 거부). 사용자 정보가 든 주소도 거부한다 */
export function safeHttpsUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > BODY_LIMITS.maxLinkLength) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function marks(raw: unknown): Mark[] | undefined {
  const out: Mark[] = [];
  for (const item of list(raw)) {
    const m = obj(item);
    if (m.type === "bold" || m.type === "italic") {
      if (!out.some((x) => x.type === m.type)) out.push({ type: m.type });
    } else if (m.type === "link") {
      const href = safeHttpsUrl(obj(m.attrs ?? {}).href);
      if (!href) throw new Reject("링크는 https:// 로 시작하는 주소만 쓸 수 있습니다.");
      out.push({ type: "link", attrs: { href } });
    } else {
      throw new Reject("지원하지 않는 글자 서식이 있습니다.");
    }
  }
  return out.length ? out : undefined;
}

function inline(raw: unknown, budget: Budget): InlineNode[] {
  const out: InlineNode[] = [];
  for (const item of list(raw)) {
    const n = obj(item);
    if (++budget.nodes > BODY_LIMITS.maxNodes) throw new Reject("본문이 너무 깁니다.");
    if (n.type === "text") {
      if (typeof n.text !== "string") throw new Reject("본문 형식이 올바르지 않습니다.");
      if (n.text === "") continue;
      budget.text += n.text.length;
      if (budget.text > BODY_LIMITS.maxText) throw new Reject("본문이 너무 깁니다.");
      const m = marks(n.marks);
      out.push(m ? { type: "text", text: n.text, marks: m } : { type: "text", text: n.text });
    } else if (n.type === "hardBreak") {
      out.push({ type: "hardBreak" });
    } else {
      throw new Reject("문단 안에 지원하지 않는 요소가 있습니다.");
    }
  }
  return out;
}

function listItems(raw: unknown, depth: number, budget: Budget): ListItem[] {
  const items = list(raw).map((item) => {
    const n = obj(item);
    if (n.type !== "listItem") throw new Reject("목록 형식이 올바르지 않습니다.");
    if (++budget.nodes > BODY_LIMITS.maxNodes) throw new Reject("본문이 너무 깁니다.");
    return { type: "listItem" as const, content: blocks(n.content, depth + 1, budget) };
  });
  if (items.length === 0) throw new Reject("빈 목록은 쓸 수 없습니다.");
  return items;
}

function blocks(raw: unknown, depth: number, budget: Budget): BlockNode[] {
  if (depth > BODY_LIMITS.maxDepth) throw new Reject("본문의 중첩이 너무 깊습니다.");
  const out: BlockNode[] = [];
  for (const item of list(raw)) {
    const n = obj(item);
    if (++budget.nodes > BODY_LIMITS.maxNodes) throw new Reject("본문이 너무 깁니다.");
    switch (n.type) {
      case "paragraph":
        out.push({ type: "paragraph", content: inline(n.content, budget) });
        break;
      case "heading": {
        const level = obj(n.attrs ?? {}).level;
        if (level !== 2 && level !== 3) throw new Reject("제목은 2단계와 3단계만 쓸 수 있습니다.");
        out.push({ type: "heading", attrs: { level }, content: inline(n.content, budget) });
        break;
      }
      case "bulletList":
        out.push({ type: "bulletList", content: listItems(n.content, depth, budget) });
        break;
      case "orderedList":
        out.push({ type: "orderedList", content: listItems(n.content, depth, budget) });
        break;
      case "blockquote":
        out.push({ type: "blockquote", content: blocks(n.content, depth + 1, budget) });
        break;
      case "horizontalRule":
        out.push({ type: "horizontalRule" });
        break;
      case "image": {
        const mediaId = obj(n.attrs ?? {}).mediaId;
        if (typeof mediaId !== "string" || !UUID.test(mediaId)) throw new Reject("이미지는 미디어 라이브러리의 이미지만 넣을 수 있습니다.");
        out.push({ type: "image", attrs: { mediaId: mediaId.toLowerCase() } });
        break;
      }
      case "video": {
        const url = obj(n.attrs ?? {}).url;
        if (typeof url !== "string" || !parseVideoUrl(url)) throw new Reject("영상은 YouTube·Vimeo 주소만 넣을 수 있습니다.");
        out.push({ type: "video", attrs: { url: url.trim() } });
        break;
      }
      default:
        throw new Reject("지원하지 않는 요소가 있습니다.");
    }
  }
  return out;
}

/** 본문 JSON 을 검사하고 허용 목록으로 다시 만든 깨끗한 문서를 돌려준다 */
export function sanitizeBody(input: unknown): BodyResult {
  try {
    const root = obj(input);
    if (root.type !== "doc") throw new Reject("본문 형식이 올바르지 않습니다.");
    return { ok: true, doc: { type: "doc", content: blocks(root.content, 1, { nodes: 0, text: 0 }) } };
  } catch (error) {
    if (error instanceof Reject) return { ok: false, error: error.message };
    throw error;
  }
}

function inlineText(nodes: InlineNode[] | undefined): string {
  return (nodes ?? []).map((n) => (n.type === "text" ? n.text : "\n")).join("");
}

function blockText(block: BlockNode): string {
  switch (block.type) {
    case "paragraph":
    case "heading":
      return inlineText(block.content);
    case "bulletList":
    case "orderedList":
      return block.content.map((li) => li.content.map(blockText).join("\n")).join("\n");
    case "blockquote":
      return block.content.map(blockText).join("\n");
    default:
      return "";
  }
}

/** 본문의 글자만 모은 문자열 (요약 자동 생성·검색·글자 수에 쓴다) */
export function plainTextFromBody(doc: BodyDoc): string {
  return doc.content.map(blockText).filter(Boolean).join("\n\n");
}

export function isBodyEmpty(doc: BodyDoc): boolean {
  return doc.content.every((b) => b.type === "paragraph" && inlineText(b.content).trim() === "") && !doc.content.some((b) => ["image", "video", "horizontalRule"].includes(b.type));
}

/** 편집기가 붙기 전의 간단한 입력(빈 줄로 문단 나눔, 줄바꿈은 줄바꿈)을 본문 문서로 바꾼다 */
export function bodyFromPlainText(text: string): BodyDoc {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    type: "doc",
    content: paragraphs.map((p) => {
      const content: InlineNode[] = [];
      p.split("\n").forEach((line, i) => {
        if (i > 0) content.push({ type: "hardBreak" });
        if (line) content.push({ type: "text", text: line });
      });
      return { type: "paragraph" as const, content };
    }),
  };
}

/**
 * 서식 없는 본문(글자만 있는 문단)이면 편집용 글자를, 서식이 있으면 null 을 돌려준다.
 * 서식이 있는 본문을 글자 입력칸으로 고치면 서식이 사라지므로, 그런 본문은 편집기 단계 전까지 고치지 않고 보존한다.
 */
export function plainEditableText(doc: BodyDoc): string | null {
  for (const block of doc.content) {
    if (block.type !== "paragraph") return null;
    for (const node of block.content ?? []) {
      if (node.type === "text" && node.marks) return null;
    }
  }
  return plainTextFromBody(doc);
}
