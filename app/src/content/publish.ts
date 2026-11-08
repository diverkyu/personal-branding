/**
 * 발행 상태와 전이 규칙 (ADMIN-DESIGN §14.2). 모든 발행형 콘텐츠가 같은 규칙을 쓴다 (순수 코드).
 * 임시저장 → 검토 필요 → 예약 → 발행 → 보관. 허용되지 않은 전이는 서버가 거부한다.
 */
export const STATUSES = ["draft", "review", "scheduled", "published", "archived"] as const;
export type ContentStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "임시저장",
  review: "검토 필요",
  scheduled: "예약",
  published: "발행",
  archived: "보관",
};

const ALLOWED: Record<ContentStatus, readonly ContentStatus[]> = {
  draft: ["review", "scheduled", "published", "archived"],
  review: ["draft", "scheduled", "published", "archived"],
  scheduled: ["draft", "published"],
  published: ["draft", "archived"],
  archived: ["draft"],
};

export function allowedTransitions(from: ContentStatus): readonly ContentStatus[] {
  return ALLOWED[from];
}

export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return ALLOWED[from].includes(to);
}

/** 이 상태에서 공개되는가 (예약 시각이 지난 예약 항목은 아직 작업이 돌지 않았어도 공개로 본다) */
export function isLive(status: ContentStatus, publishAt: Date | null, now: Date): boolean {
  if (status === "published") return true;
  return status === "scheduled" && publishAt !== null && publishAt.getTime() <= now.getTime();
}

export const ORIGINS = ["manual", "ai_assisted", "automated"] as const;
export type ContentOrigin = (typeof ORIGINS)[number];
export const ORIGIN_LABELS: Record<ContentOrigin, string> = { manual: "직접", ai_assisted: "AI 도움", automated: "자동" };

/** 자동 입력(후속)이 만든 글은 사람이 검토하기 전에는 발행할 수 없다 (ADMIN-DESIGN §14.4) */
export function requiresReview(origin: ContentOrigin): boolean {
  return origin === "automated";
}

export interface PublishCheckInput {
  title: string;
  slug: string;
  bodyEmpty: boolean;
  summary: string;
  origin: ContentOrigin;
  /** review 를 거쳤는지(이전 상태가 review 였는지) */
  reviewed: boolean;
}

/** 발행(공개·예약)하기 전 점검. 문제 목록을 돌려주고, 비어 있으면 통과다 */
export function publishChecks(input: PublishCheckInput): string[] {
  const problems: string[] = [];
  if (!input.title.trim()) problems.push("제목을 입력해 주세요.");
  if (!input.slug) problems.push("주소 이름이 필요합니다.");
  if (input.bodyEmpty) problems.push("본문을 입력해 주세요.");
  if (input.summary.length > 160) problems.push("요약은 160자 이하여야 합니다.");
  if (requiresReview(input.origin) && !input.reviewed) problems.push("자동으로 만든 글은 먼저 '검토 필요'에서 확인한 뒤 발행할 수 있습니다.");
  return problems;
}

/** 예약 시각 검사. 너무 먼 미래(1년 초과)와 이미 지난 시각은 거부한다 */
export function validatePublishAt(at: Date, now: Date): string | null {
  if (Number.isNaN(at.getTime())) return "예약 시각이 올바르지 않습니다.";
  if (at.getTime() <= now.getTime()) return "예약 시각은 지금보다 뒤여야 합니다.";
  if (at.getTime() > now.getTime() + 366 * 24 * 60 * 60 * 1000) return "예약은 1년 이내로만 할 수 있습니다.";
  return null;
}

/** 'datetime-local' 입력값(한국 시간, 2026-11-15T09:00)을 시각으로 바꾼다 */
export function parseKstLocal(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+09:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 시각을 'datetime-local' 입력값(한국 시간)으로 바꾼다 */
export function toKstLocal(date: Date): string {
  const k = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return k.toISOString().slice(0, 16);
}

/** 예약 입력칸의 기본값: 일주일 뒤 오전 9시(한국 시간) */
export function suggestPublishAt(now: Date = new Date()): string {
  return toKstLocal(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)).replace(/T.*/, "T09:00");
}
