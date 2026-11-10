/**
 * 여행 추천 유형의 항목 (ADMIN-DESIGN §5.0 `fields`, §27). 여행 추천은 `contents`의 한 유형이다.
 * 제목·한 줄 소개(요약)·본문은 공통 항목이고, 나머지는 여기의 항목이다. 가격·시기 정보는 오래되기 쉬워 "정보 확인일"을 둔다.
 * **공개 화면이 아직 없다**(AD-6d 는 어드민까지) — 발행해도 사이트에는 나타나지 않는다.
 * 순수 함수만 둔다. 임시저장은 일부가 비어도 되고, 비어 있으면 안 되는 항목은 발행 점검(travelProblems)에서 막는다.
 */
import { AppError } from "@/lib/errors";
import { isValidDate } from "./tourFields";

export const TRAVEL_LIMITS = { region: 30, place: 60, season: 30, budget: 60 } as const;

export const LEVEL_VALUES = ["", "beginner", "intermediate", "advanced"] as const;
export type TravelLevel = (typeof LEVEL_VALUES)[number];
export const LEVEL_LABELS: Record<TravelLevel, string> = { "": "정하지 않음", beginner: "입문", intermediate: "중급", advanced: "상급" };

export interface TravelFields {
  /** 지역 (예: 제주, 필리핀 보홀). 발행하려면 필요하다 */
  region: string;
  /** 장소 (예: 서귀포 문섬 인근). 발행하려면 필요하다 */
  place: string;
  /** 추천 시기 (예: 5~10월) */
  season: string;
  /** 난이도 */
  level: TravelLevel;
  /** 예산 안내 (예: 1인 약 80만 원) */
  budget: string;
  /** 정보 확인일 (YYYY-MM-DD) 또는 빈 문자열 */
  checkedAt: string;
}

export const EMPTY_TRAVEL_FIELDS: TravelFields = { region: "", place: "", season: "", level: "", budget: "", checkedAt: "" };

const str = (value: unknown): string => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

function limited(raw: unknown, max: number, label: string): string {
  const v = str(raw);
  if (v.length > max) throw new AppError("validation", `${label}은(는) ${max}자까지 쓸 수 있습니다.`);
  return v;
}

export function cleanTravelFields(input: unknown): TravelFields {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const region = limited(raw.region, TRAVEL_LIMITS.region, "지역");
  const place = limited(raw.place, TRAVEL_LIMITS.place, "장소");
  const season = limited(raw.season, TRAVEL_LIMITS.season, "추천 시기");
  const budget = limited(raw.budget, TRAVEL_LIMITS.budget, "예산 안내");
  const levelRaw = raw.level === undefined || raw.level === null ? "" : raw.level;
  if (!(LEVEL_VALUES as readonly unknown[]).includes(levelRaw)) throw new AppError("validation", "알 수 없는 난이도입니다.");
  const checkedAt = str(raw.checkedAt);
  if (checkedAt && !isValidDate(checkedAt)) throw new AppError("validation", "정보 확인일이 올바른 날짜가 아닙니다.");
  return { region, place, season, level: levelRaw as TravelLevel, budget, checkedAt };
}

/** 저장된 항목을 읽을 때: 깨져 있으면 빈 값으로 본다 */
export function readTravelFields(stored: unknown): TravelFields {
  try {
    return cleanTravelFields(stored);
  } catch {
    return { ...EMPTY_TRAVEL_FIELDS };
  }
}

/** 발행·예약 전에 채워져 있어야 하는 항목 */
export function travelProblems(f: TravelFields): string[] {
  const problems: string[] = [];
  if (!f.region) problems.push("지역을 입력해 주세요.");
  if (!f.place) problems.push("장소를 입력해 주세요.");
  return problems;
}
