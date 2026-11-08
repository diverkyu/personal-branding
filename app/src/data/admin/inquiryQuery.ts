/** 신청·문의 목록의 URL 검색 조건 (화면과 데이터 함수가 공유하는 순수 코드). 허용 값만 통과시킨다. */
export type InquiryKindFilter = "reservation" | "notice";

export const RESERVATION_STATUSES = ["new", "checked", "confirmed", "cancelled"] as const;
export const NOTICE_STATUSES = ["new", "notified"] as const;
export const ALL_STATUSES = ["new", "checked", "confirmed", "cancelled", "notified"] as const;
export type InquiryStatus = (typeof ALL_STATUSES)[number];

export const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "신규",
  checked: "확인",
  confirmed: "확정",
  cancelled: "취소",
  notified: "안내 완료",
};

export const KIND_LABELS: Record<InquiryKindFilter, string> = { reservation: "예약 문의", notice: "소식 받기" };

export function allowedStatuses(kind: InquiryKindFilter): readonly InquiryStatus[] {
  return kind === "reservation" ? RESERVATION_STATUSES : NOTICE_STATUSES;
}

export interface InquiryQuery {
  kind?: InquiryKindFilter;
  status?: InquiryStatus;
  tourSlug?: string;
  q?: string;
  /** YYYY-MM-DD (한국 시간 기준 하루의 시작/끝) */
  from?: string;
  to?: string;
  page: number;
}

export const INQUIRY_PAGE_SIZE = 20;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

type Params = Record<string, string | string[] | undefined>;

function one(params: Params, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

function validDate(value: string | undefined): string | undefined {
  if (!value || !DATE.test(value)) return undefined;
  return Number.isNaN(new Date(`${value}T00:00:00+09:00`).getTime()) ? undefined : value;
}

export function parseInquiryQuery(params: Params): InquiryQuery {
  const kind = one(params, "kind");
  const status = one(params, "status");
  const tour = one(params, "tour");
  const q = one(params, "q")?.trim().slice(0, 60);
  const page = Number.parseInt(one(params, "page") ?? "1", 10);
  return {
    kind: kind === "reservation" || kind === "notice" ? kind : undefined,
    status: (ALL_STATUSES as readonly string[]).includes(status ?? "") ? (status as InquiryStatus) : undefined,
    tourSlug: tour && SLUG.test(tour) ? tour : undefined,
    q: q || undefined,
    from: validDate(one(params, "from")),
    to: validDate(one(params, "to")),
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, 1000) : 1,
  };
}

export function inquiryQueryString(query: Partial<InquiryQuery>): string {
  const sp = new URLSearchParams();
  if (query.kind) sp.set("kind", query.kind);
  if (query.status) sp.set("status", query.status);
  if (query.tourSlug) sp.set("tour", query.tourSlug);
  if (query.q) sp.set("q", query.q);
  if (query.from) sp.set("from", query.from);
  if (query.to) sp.set("to", query.to);
  if (query.page && query.page > 1) sp.set("page", String(query.page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string): boolean => UUID.test(value);
