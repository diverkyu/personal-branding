/**
 * 수강 후기 입력 검증 (ADMIN-DESIGN §24, SCREEN-SPEC ADM-REV). 순수 함수만 둔다.
 * - **원문을 가공하지 않는다**: 줄바꿈 형식(CRLF→LF)과 앞뒤 공백만 정리하고, 문장·맞춤법·띄어쓰기는 건드리지 않는다.
 *   화면에서는 글자로만 그린다(HTML 해석 없음).
 * - 후기 작성일은 오늘(한국 시간)보다 뒤일 수 없다. 평점 항목은 없다.
 */
import { AppError } from "@/lib/errors";
import { isValidDate } from "@/content/tourFields";

export const LABEL_KINDS = ["real", "initial", "nick"] as const;
export type LabelKind = (typeof LABEL_KINDS)[number];
export const LABEL_KIND_LABELS: Record<LabelKind, string> = { real: "실명", initial: "이니셜", nick: "닉네임" };

export const SOURCE_KINDS = ["", "bluepebble", "instagram", "direct", "other"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];
export const SOURCE_LABELS: Record<SourceKind, string> = { "": "선택 안 함", bluepebble: "블루페블", instagram: "인스타그램", direct: "직접 전달", other: "기타" };

export const REVIEW_STATUSES = ["private", "public"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = { private: "비공개", public: "공개" };

export const REVIEW_LIMITS = { body: 1000, author: 40, sourceNote: 200, consentNote: 300, featuredOrderMax: 9999 } as const;
export const DEFAULT_FEATURED_ORDER = 100;

export interface ReviewInput {
  body: string;
  authorLabel: string;
  labelKind: string;
  writtenOn: string;
  sourceKind: string;
  sourceNote: string;
  /** 연결할 투어의 주소 이름. 없으면 빈 문자열 */
  tourSlug: string;
  featured: boolean;
  /** 대표 순서(숫자 문자열). 비우면 100 */
  featuredOrder: string;
  consentConfirmed: boolean;
  consentNote: string;
}

export interface CleanReview {
  body: string;
  authorLabel: string;
  labelKind: LabelKind;
  writtenOn: string;
  sourceKind: SourceKind;
  sourceNote: string;
  tourSlug: string | null;
  featured: boolean;
  featuredOrder: number;
  consentConfirmed: boolean;
  consentNote: string;
}

/** 줄바꿈·탭 말고는 제어 문자를 허용하지 않는다 */
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function cleanReview(input: ReviewInput, today: string): CleanReview {
  const body = input.body.replace(/\r\n?/g, "\n").trim();
  if (!body) throw new AppError("validation", "후기 원문을 입력해 주세요.");
  if (body.length > REVIEW_LIMITS.body) throw new AppError("validation", `후기 원문은 ${REVIEW_LIMITS.body}자까지 쓸 수 있습니다.`);
  if (CONTROL.test(body)) throw new AppError("validation", "후기 원문에 쓸 수 없는 문자가 있습니다.");

  const authorLabel = input.authorLabel.replace(/\s+/g, " ").trim();
  if (!authorLabel) throw new AppError("validation", "수강생 표기를 입력해 주세요.");
  if (authorLabel.length > REVIEW_LIMITS.author) throw new AppError("validation", `수강생 표기는 ${REVIEW_LIMITS.author}자까지 쓸 수 있습니다.`);

  if (!(LABEL_KINDS as readonly string[]).includes(input.labelKind)) throw new AppError("validation", "표기 방식(실명·이니셜·닉네임)을 골라 주세요.");

  const writtenOn = input.writtenOn.trim();
  if (!writtenOn) throw new AppError("validation", "후기 작성일을 입력해 주세요.");
  if (!isValidDate(writtenOn)) throw new AppError("validation", "후기 작성일이 올바른 날짜가 아닙니다.");
  if (writtenOn > today) throw new AppError("validation", "후기 작성일은 오늘보다 뒤일 수 없습니다.");

  if (!(SOURCE_KINDS as readonly string[]).includes(input.sourceKind)) throw new AppError("validation", "알 수 없는 출처입니다.");
  const sourceNote = input.sourceNote.replace(/\s+/g, " ").trim();
  if (sourceNote.length > REVIEW_LIMITS.sourceNote) throw new AppError("validation", `출처 메모는 ${REVIEW_LIMITS.sourceNote}자까지 쓸 수 있습니다.`);

  const tourSlug = input.tourSlug.trim();
  if (tourSlug && !SLUG.test(tourSlug)) throw new AppError("validation", "연결할 투어를 다시 골라 주세요.");

  let featuredOrder = DEFAULT_FEATURED_ORDER;
  const orderRaw = input.featuredOrder.trim();
  if (orderRaw !== "") {
    if (!/^\d+$/.test(orderRaw) || Number(orderRaw) > REVIEW_LIMITS.featuredOrderMax) throw new AppError("validation", `대표 순서는 0~${REVIEW_LIMITS.featuredOrderMax} 사이의 숫자로 입력해 주세요.`);
    featuredOrder = Number(orderRaw);
  }

  const consentNote = input.consentNote.replace(/\s+/g, " ").trim();
  if (consentNote.length > REVIEW_LIMITS.consentNote) throw new AppError("validation", `동의 메모는 ${REVIEW_LIMITS.consentNote}자까지 쓸 수 있습니다.`);

  return {
    body,
    authorLabel,
    labelKind: input.labelKind as LabelKind,
    writtenOn,
    sourceKind: input.sourceKind as SourceKind,
    sourceNote,
    tourSlug: tourSlug || null,
    featured: input.featured,
    featuredOrder,
    consentConfirmed: input.consentConfirmed,
    consentNote,
  };
}
