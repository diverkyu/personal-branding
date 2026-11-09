/**
 * 투어 유형의 항목 (ADMIN-DESIGN §5.0 `fields`, §22). 투어는 `contents`의 한 유형이고, 투어에만 있는 항목은 이 모양으로 `fields`에 담는다.
 * 순수 함수만 둔다(서버·시험에서 같은 규칙을 쓴다).
 *
 * - 임시저장은 일부가 비어 있어도 허용한다. 비어 있으면 안 되는 항목은 발행 점검(tourProblems)에서 막는다.
 * - 날짜는 한국 시간 기준 YYYY-MM-DD 문자열이다. "종료"는 저장하지 않고 종료일이 오늘보다 앞서면 계산한다 (SCREEN-SPEC 결정 2).
 */
import { AppError } from "@/lib/errors";
import { parseVideoUrl } from "@/lib/video";
import type { TourStatus } from "@/types/content";

export const RECRUIT_VALUES = ["upcoming", "recruiting", "closed"] as const;
export type RecruitStatus = (typeof RECRUIT_VALUES)[number];
export const RECRUIT_LABELS: Record<RecruitStatus, string> = { upcoming: "모집 예정", recruiting: "모집 중", closed: "모집 마감" };

export const TOUR_LIMITS = { place: 80, feeNote: 500, caption: 100, capacityMax: 500, gallery: 30, videos: 5 } as const;

export interface TourGalleryItem {
  mediaId: string;
  caption: string;
}

export interface TourFields {
  startDate: string;
  endDate: string;
  place: string;
  recruit: RecruitStatus;
  capacity: number | null;
  feeNote: string;
  gallery: TourGalleryItem[];
  videos: string[];
}

export const EMPTY_TOUR_FIELDS: TourFields = { startDate: "", endDate: "", place: "", recruit: "upcoming", capacity: null, feeNote: "", gallery: [], videos: [] };

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidDate(value: string): boolean {
  const m = DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

const str = (value: unknown): string => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

/** 입력(폼·저장된 값)을 검사해 깨끗한 항목으로 만든다. 잘못된 값은 이유와 함께 던진다 */
export function cleanTourFields(input: unknown): TourFields {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;

  const startDate = str(raw.startDate);
  const endDate = str(raw.endDate);
  if (startDate && !isValidDate(startDate)) throw new AppError("validation", "시작일이 올바른 날짜가 아닙니다.");
  if (endDate && !isValidDate(endDate)) throw new AppError("validation", "종료일이 올바른 날짜가 아닙니다.");
  if (startDate && endDate && endDate < startDate) throw new AppError("validation", "종료일은 시작일과 같거나 그 뒤여야 합니다.");

  const place = str(raw.place);
  if (place.length > TOUR_LIMITS.place) throw new AppError("validation", `장소는 ${TOUR_LIMITS.place}자까지 쓸 수 있습니다.`);

  const recruit = raw.recruit === undefined || raw.recruit === "" ? "upcoming" : raw.recruit;
  if (!(RECRUIT_VALUES as readonly unknown[]).includes(recruit)) throw new AppError("validation", "알 수 없는 모집 상태입니다.");

  let capacity: number | null = null;
  const capRaw = typeof raw.capacity === "number" ? String(raw.capacity) : str(raw.capacity);
  if (capRaw !== "") {
    if (!/^\d+$/.test(capRaw)) throw new AppError("validation", "정원은 숫자로 입력해 주세요.");
    capacity = Number(capRaw);
    if (capacity < 1 || capacity > TOUR_LIMITS.capacityMax) throw new AppError("validation", `정원은 1~${TOUR_LIMITS.capacityMax}명이어야 합니다.`);
  }

  const feeNote = typeof raw.feeNote === "string" ? raw.feeNote.replace(/\r\n/g, "\n").trim() : "";
  if (feeNote.length > TOUR_LIMITS.feeNote) throw new AppError("validation", `참가비 안내는 ${TOUR_LIMITS.feeNote}자까지 쓸 수 있습니다.`);

  const galleryRaw = Array.isArray(raw.gallery) ? raw.gallery : [];
  if (galleryRaw.length > TOUR_LIMITS.gallery) throw new AppError("validation", `갤러리 사진은 ${TOUR_LIMITS.gallery}장까지 넣을 수 있습니다.`);
  const seen = new Set<string>();
  const gallery: TourGalleryItem[] = [];
  for (const item of galleryRaw) {
    const it = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const mediaId = typeof it.mediaId === "string" ? it.mediaId.toLowerCase() : "";
    if (!UUID.test(mediaId)) throw new AppError("validation", "갤러리에 올바르지 않은 이미지가 있습니다.");
    if (seen.has(mediaId)) continue;
    seen.add(mediaId);
    const caption = str(it.caption);
    if (caption.length > TOUR_LIMITS.caption) throw new AppError("validation", `사진 설명은 ${TOUR_LIMITS.caption}자까지 쓸 수 있습니다.`);
    gallery.push({ mediaId, caption });
  }

  const videosRaw = Array.isArray(raw.videos) ? raw.videos : [];
  const videos: string[] = [];
  for (const v of videosRaw) {
    const url = str(v);
    if (!url) continue;
    const parsed = parseVideoUrl(url);
    if (!parsed) throw new AppError("validation", "영상은 YouTube 또는 Vimeo 주소(https)만 넣을 수 있습니다.");
    if (!videos.includes(parsed.watchUrl)) videos.push(parsed.watchUrl);
  }
  if (videos.length > TOUR_LIMITS.videos) throw new AppError("validation", `스케치 영상은 ${TOUR_LIMITS.videos}개까지 넣을 수 있습니다.`);

  return { startDate, endDate, place, recruit: recruit as RecruitStatus, capacity, feeNote, gallery, videos };
}

/** 저장된 항목을 읽을 때: 깨져 있으면 빈 값으로 본다(공개 화면은 깨지지 않는다) */
export function readTourFields(stored: unknown): TourFields {
  try {
    return cleanTourFields(stored);
  } catch {
    return { ...EMPTY_TOUR_FIELDS };
  }
}

/** 발행·예약 전에 채워져 있어야 하는 항목 */
export function tourProblems(fields: TourFields): string[] {
  const problems: string[] = [];
  if (!fields.startDate) problems.push("시작일을 입력해 주세요.");
  if (!fields.endDate) problems.push("종료일을 입력해 주세요.");
  if (!fields.place) problems.push("장소를 입력해 주세요.");
  return problems;
}

/** 공개 화면의 투어 상태. 종료일이 지났으면 모집 상태와 상관없이 "종료" */
export function tourStatusOf(fields: Pick<TourFields, "endDate" | "recruit">, today: string): TourStatus {
  if (fields.endDate && fields.endDate < today) return "ended";
  return fields.recruit;
}

export function tourMediaIds(fields: TourFields): string[] {
  return fields.gallery.map((g) => g.mediaId);
}
