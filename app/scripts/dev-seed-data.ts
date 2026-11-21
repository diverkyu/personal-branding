/**
 * 개발 DB 시험 데이터의 내용 (scripts/dev-seed.ts 가 쓴다). 모두 **가상**이다.
 * - 주소 이름은 `test-` 로 시작하고, 사람이 보는 글에는 "[시험]" 표시를 붙여 실제 콘텐츠와 구분한다.
 * - 이미지는 서버가 그린 색 그림(글자 없음)이다. 실제 사진·사람 얼굴·개인정보를 쓰지 않는다.
 */
import sharp from "sharp";
import type { BlockNode, BodyDoc, InlineNode } from "../src/content/body";

export const MARK = "[시험]";
export const SLUG_PREFIX = "test-";
/** 시험 콘텐츠에 붙는 제작 메모. 시험 데이터 구분과 운영 DB 오인 방지 점검에 쓴다 */
export const ORIGIN_NOTE = "dev-seed 시험 데이터";

// ---------- 이미지 (글자 없는 그림) ----------

function hex(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** 번호마다 색·해·물결이 달라지는 그림 (PNG). 서버의 이미지 처리(WebP 변환)를 그대로 거친다 */
export async function artwork(w: number, h: number, i: number): Promise<Buffer> {
  const hue = (170 + i * 23) % 360;
  const top = hex(hue, 55, 30);
  const bottom = hex((hue + 28) % 360, 62, 62);
  const sun = hex((hue + 150) % 360, 70, 82);
  const cx = Math.round(w * (0.25 + ((i * 17) % 50) / 100));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="${cx}" cy="${Math.round(h * 0.3)}" r="${Math.round(Math.min(w, h) * 0.12)}" fill="${sun}" opacity="0.9"/>
  <path d="M0 ${Math.round(h * 0.72)} Q ${Math.round(w * 0.25)} ${Math.round(h * 0.62)} ${Math.round(w * 0.5)} ${Math.round(h * 0.72)} T ${w} ${Math.round(h * 0.72)} V ${h} H 0 Z" fill="${hex(hue, 50, 22)}" opacity="0.55"/>
  <path d="M0 ${Math.round(h * 0.84)} Q ${Math.round(w * 0.3)} ${Math.round(h * 0.76)} ${Math.round(w * 0.6)} ${Math.round(h * 0.84)} T ${w} ${Math.round(h * 0.84)} V ${h} H 0 Z" fill="${hex(hue, 45, 15)}" opacity="0.6"/>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// ---------- 본문 만들기 ----------

const t = (text: string, bold = false): InlineNode => (bold ? { type: "text", text, marks: [{ type: "bold" }] } : { type: "text", text });
export const p = (text: string): BlockNode => ({ type: "paragraph", content: [t(text)] });
export const h2 = (text: string): BlockNode => ({ type: "heading", attrs: { level: 2 }, content: [t(text)] });
export const h3 = (text: string): BlockNode => ({ type: "heading", attrs: { level: 3 }, content: [t(text)] });
export const ul = (...items: string[]): BlockNode => ({ type: "bulletList", content: items.map((x) => ({ type: "listItem", content: [p(x)] })) });
export const ol = (...items: string[]): BlockNode => ({ type: "orderedList", content: items.map((x) => ({ type: "listItem", content: [p(x)] })) });
export const quote = (text: string): BlockNode => ({ type: "blockquote", content: [p(text)] });
export const code = (text: string): BlockNode => ({ type: "codeBlock", content: [{ type: "text", text }] });
export const img = (mediaId: string): BlockNode => ({ type: "image", attrs: { mediaId } });
export const video = (url: string): BlockNode => ({ type: "video", attrs: { url } });
export const hr = (): BlockNode => ({ type: "horizontalRule" });
export const boldP = (lead: string, rest: string): BlockNode => ({ type: "paragraph", content: [t(lead, true), t(rest)] });
export function table(rows: string[][]): BlockNode {
  return {
    type: "table",
    content: rows.map((row, r) => ({
      type: "tableRow" as const,
      content: row.map((cell) => ({ type: (r === 0 ? "tableHeader" : "tableCell") as "tableHeader" | "tableCell", content: [{ type: "paragraph" as const, content: [t(cell)] }] })),
    })),
  };
}
export const doc = (...content: BlockNode[]): BodyDoc => ({ type: "doc", content });

/** 문장을 늘려 긴 본문을 만든다 (긴 글 화면·목차·스크롤 확인용) */
export function longParagraphs(topic: string, count: number): BlockNode[] {
  return Array.from({ length: count }, (_, i) => p(`${MARK} ${topic} 문단 ${i + 1}. 이 문단은 가상 데이터입니다. 글이 길어졌을 때 줄 간격, 문단 사이 여백, 모바일에서의 읽기 편안함을 확인하려고 같은 모양의 문장을 여러 번 이어 붙였습니다. 실제 경험이나 사실을 담고 있지 않습니다.`));
}

export const YOUTUBE_SAMPLE = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";
export const YOUTUBE_SAMPLE_2 = "https://www.youtube.com/watch?v=YE7VzlLtp-4";
export const VIMEO_SAMPLE = "https://vimeo.com/76979871";
export const INSTAGRAM_SAMPLE = "https://www.instagram.com/reel/TESTSEED0001/";
