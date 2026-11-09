/**
 * About(규강 소개) 입력 규칙 (ADMIN-DESIGN §26). 순수 함수 — DB 없이 시험한다.
 * 실제 이력·자격은 규강이 확인한 내용만 쓴다(CONCEPT §7.5). 그래서 저장해도 공개되지 않고, "공개 반영"을 눌러야 공개된다.
 */
import { bodyFromPlainText, collectMediaIds, isBodyEmpty, sanitizeBody, type BodyDoc } from "@/content/body";
import { AppError } from "@/lib/errors";

export const ABOUT_LIMITS = { headline: 80, signature: 40 } as const;

/** 공개된 About 이 없을 때 /about 이 보여 주는 기본 문구 (확정 카피). 어드민에서 공개하면 그 내용으로 바뀐다 */
export const DEFAULT_ABOUT = {
  headline: "서로 다른 두 세계.\n하나의 호기심.",
  paragraphs: [
    "몸으로 경험하는 바다와 상상으로 만드는 세계. 프리다이빙과 AI 크리에이티브는 저를 소개하는 두 가지 언어입니다.",
    "물속의 고요함을 마주하는 순간부터 새로운 이미지를 만들어내는 순간까지. 저는 경계 너머의 가능성을 탐험합니다.",
  ],
  signature: "이동규 aka. KYU",
} as const;

export interface AboutInput {
  headline: string;
  /** 편집기 출력(JSON) */
  body: unknown;
  signature: string;
  photoMediaId: string;
}

export interface AboutContent {
  headline: string;
  body: BodyDoc;
  signature: string;
  photoMediaId: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 헤드라인은 줄바꿈을 허용한다(최대 2줄). 각 줄의 앞뒤 공백과 연속 공백을 정리한다 */
function cleanHeadline(raw: string): string {
  const lines = raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
  if (lines.length > 2) throw new AppError("validation", "헤드라인은 두 줄까지 쓸 수 있습니다.");
  const text = lines.join("\n");
  if (text.replace(/\n/g, "").length > ABOUT_LIMITS.headline) throw new AppError("validation", `헤드라인은 ${ABOUT_LIMITS.headline}자까지 쓸 수 있습니다.`);
  return text;
}

export function cleanAbout(input: AboutInput): AboutContent {
  const headline = cleanHeadline(input.headline);
  const signature = input.signature.replace(/\s+/g, " ").trim();
  if (signature.length > ABOUT_LIMITS.signature) throw new AppError("validation", `서명은 ${ABOUT_LIMITS.signature}자까지 쓸 수 있습니다.`);
  const body = sanitizeBody(input.body);
  if (!body.ok) throw new AppError("validation", body.error);
  const photo = input.photoMediaId.trim();
  if (photo && !UUID.test(photo)) throw new AppError("validation", "프로필 사진을 다시 골라 주세요.");
  return { headline, body: body.doc, signature, photoMediaId: photo ? photo.toLowerCase() : null };
}

/** 공개 반영 전에 막아야 할 문제. photoAlt 는 사진의 대체 텍스트(사진이 없으면 undefined) */
export function aboutProblems(content: AboutContent, photoAlt: string | undefined): string[] {
  const problems: string[] = [];
  if (!content.headline) problems.push("헤드라인을 입력해 주세요.");
  if (isBodyEmpty(content.body)) problems.push("본문을 입력해 주세요.");
  if (content.photoMediaId && !(photoAlt ?? "").trim()) problems.push("프로필 사진의 대체 텍스트가 없습니다. 어드민 > 미디어에서 입력해 주세요.");
  return problems;
}

/** 저장된 JSON(공개 칸·draft 칸)을 안전하게 읽는다. 잘못되었으면 null */
export function readAboutContent(stored: unknown): AboutContent | null {
  if (typeof stored !== "object" || stored === null) return null;
  const raw = stored as Record<string, unknown>;
  try {
    return cleanAbout({
      headline: typeof raw.headline === "string" ? raw.headline : "",
      body: raw.body ?? { type: "doc", content: [] },
      signature: typeof raw.signature === "string" ? raw.signature : "",
      photoMediaId: typeof raw.photoMediaId === "string" ? raw.photoMediaId : "",
    });
  } catch {
    return null;
  }
}

/** 기본 문구를 편집기 시작 내용으로 쓴다 (어드민에서 처음 열 때) */
export function defaultAboutContent(): AboutContent {
  return { headline: DEFAULT_ABOUT.headline, body: bodyFromPlainText(DEFAULT_ABOUT.paragraphs.join("\n\n")), signature: DEFAULT_ABOUT.signature, photoMediaId: null };
}

export const aboutMediaIds = (content: AboutContent): string[] => [...new Set([...(content.photoMediaId ? [content.photoMediaId] : []), ...collectMediaIds(content.body)])];
