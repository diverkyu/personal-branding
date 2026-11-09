/**
 * 장비 유형의 항목 (ADMIN-DESIGN §5.0 `fields`, §23, SCREEN-SPEC 어드민 > 장비). 장비는 `contents`의 한 유형이다.
 * 장비명은 제목, "한 줄 추천 이유"는 요약, "추천 이유 상세"는 본문(선택)이고, 나머지는 여기의 항목이다.
 * 순수 함수만 둔다. 임시저장은 일부가 비어도 되고, 비어 있으면 안 되는 항목은 발행 점검(equipmentProblems)에서 막는다.
 */
import { AppError } from "@/lib/errors";
import { isValidDate } from "./tourFields";

export const ACTION_VALUES = ["none", "external", "inquiry"] as const;
export type EquipmentAction = (typeof ACTION_VALUES)[number];
export const ACTION_LABELS: Record<EquipmentAction, string> = { none: "버튼 없음", external: "구매처 링크", inquiry: "문의하기" };
/** 버튼 라벨을 비웠을 때 쓰는 기본값 */
export const DEFAULT_BUTTON_LABEL: Record<Exclude<EquipmentAction, "none">, string> = { external: "구매처 보기", inquiry: "문의하기" };

export const EQUIPMENT_LIMITS = {
  title: 60,
  summary: 100,
  category: 20,
  brand: 40,
  feature: 60,
  features: 8,
  priceNote: 40,
  buttonLabel: 20,
  url: 300,
  images: 6,
  sortOrderMax: 9999,
} as const;

/** 노출 순서를 정하지 않았을 때의 값. 정한 것보다 뒤에 온다 */
export const DEFAULT_SORT_ORDER = 100;

export interface EquipmentFields {
  category: string;
  brand: string;
  features: string[];
  /** 대표(썸네일) 이미지 id. 공개하려면 필요하다 */
  thumbMediaId: string | null;
  /** 추가 이미지 id (0~6장) */
  images: string[];
  priceNote: string;
  /** 정보 확인일 (YYYY-MM-DD) 또는 빈 문자열 */
  checkedAt: string;
  action: EquipmentAction;
  /** action 이 external 일 때만 값이 있다 (https) */
  externalUrl: string;
  buttonLabel: string;
  affiliate: boolean;
  sortOrder: number;
}

export const EMPTY_EQUIPMENT_FIELDS: EquipmentFields = {
  category: "",
  brand: "",
  features: [],
  thumbMediaId: null,
  images: [],
  priceNote: "",
  checkedAt: "",
  action: "none",
  externalUrl: "",
  buttonLabel: "",
  affiliate: false,
  sortOrder: DEFAULT_SORT_ORDER,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (value: unknown): string => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

/** 구매 링크: https 만, 계정 정보(user:pass@) 없음, 호스트에 점이 있는 주소. 정규화한 주소를 돌려준다 */
export function parseExternalUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (!url.hostname.includes(".")) return null;
  return url.toString();
}

function mediaId(value: unknown, what: string): string {
  const id = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!UUID.test(id)) throw new AppError("validation", `${what}에 올바르지 않은 이미지가 있습니다.`);
  return id;
}

export function cleanEquipmentFields(input: unknown): EquipmentFields {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;

  const category = str(raw.category);
  if (category.length > EQUIPMENT_LIMITS.category) throw new AppError("validation", `카테고리는 ${EQUIPMENT_LIMITS.category}자까지 쓸 수 있습니다.`);
  const brand = str(raw.brand);
  if (brand.length > EQUIPMENT_LIMITS.brand) throw new AppError("validation", `브랜드는 ${EQUIPMENT_LIMITS.brand}자까지 쓸 수 있습니다.`);

  const featuresRaw = Array.isArray(raw.features) ? raw.features : [];
  const features = [...new Set(featuresRaw.map(str).filter(Boolean))];
  if (features.length > EQUIPMENT_LIMITS.features) throw new AppError("validation", `특징은 ${EQUIPMENT_LIMITS.features}개까지 쓸 수 있습니다.`);
  if (features.some((f) => f.length > EQUIPMENT_LIMITS.feature)) throw new AppError("validation", `특징 하나는 ${EQUIPMENT_LIMITS.feature}자까지 쓸 수 있습니다.`);

  const thumbRaw = typeof raw.thumbMediaId === "string" ? raw.thumbMediaId.trim() : "";
  const thumbMediaId = thumbRaw ? mediaId(thumbRaw, "대표 이미지") : null;

  const imagesRaw = Array.isArray(raw.images) ? raw.images : [];
  const images: string[] = [];
  for (const item of imagesRaw) {
    const id = mediaId(item, "추가 이미지");
    // 대표 이미지와 같은 것, 중복은 한 번만
    if (id !== thumbMediaId && !images.includes(id)) images.push(id);
  }
  if (images.length > EQUIPMENT_LIMITS.images) throw new AppError("validation", `추가 이미지는 ${EQUIPMENT_LIMITS.images}장까지 넣을 수 있습니다.`);

  const priceNote = str(raw.priceNote);
  if (priceNote.length > EQUIPMENT_LIMITS.priceNote) throw new AppError("validation", `가격대는 ${EQUIPMENT_LIMITS.priceNote}자까지 쓸 수 있습니다.`);

  const checkedAt = str(raw.checkedAt);
  if (checkedAt && !isValidDate(checkedAt)) throw new AppError("validation", "정보 확인일이 올바른 날짜가 아닙니다.");

  const actionRaw = raw.action === undefined || raw.action === "" ? "none" : raw.action;
  if (!(ACTION_VALUES as readonly unknown[]).includes(actionRaw)) throw new AppError("validation", "알 수 없는 행동 유형입니다.");
  const action = actionRaw as EquipmentAction;

  let externalUrl = "";
  const urlRaw = str(raw.externalUrl);
  if (action === "external" && urlRaw) {
    if (urlRaw.length > EQUIPMENT_LIMITS.url) throw new AppError("validation", `구매 링크는 ${EQUIPMENT_LIMITS.url}자까지 쓸 수 있습니다.`);
    const parsed = parseExternalUrl(urlRaw);
    if (!parsed) throw new AppError("validation", "구매 링크는 https 로 시작하는 주소만 쓸 수 있습니다.");
    externalUrl = parsed;
  }

  const buttonLabel = action === "none" ? "" : str(raw.buttonLabel);
  if (buttonLabel.length > EQUIPMENT_LIMITS.buttonLabel) throw new AppError("validation", `버튼 라벨은 ${EQUIPMENT_LIMITS.buttonLabel}자까지 쓸 수 있습니다.`);

  const affiliate = raw.affiliate === true || raw.affiliate === "on" || raw.affiliate === "true";

  let sortOrder = DEFAULT_SORT_ORDER;
  const sortRaw = typeof raw.sortOrder === "number" ? String(raw.sortOrder) : str(raw.sortOrder);
  if (sortRaw !== "") {
    if (!/^\d+$/.test(sortRaw) || Number(sortRaw) > EQUIPMENT_LIMITS.sortOrderMax) throw new AppError("validation", `노출 순서는 0~${EQUIPMENT_LIMITS.sortOrderMax} 사이의 숫자로 입력해 주세요.`);
    sortOrder = Number(sortRaw);
  }

  return { category, brand, features, thumbMediaId, images, priceNote, checkedAt, action, externalUrl, buttonLabel, affiliate, sortOrder };
}

/** 저장된 항목을 읽을 때: 깨져 있으면 빈 값으로 본다 */
export function readEquipmentFields(stored: unknown): EquipmentFields {
  try {
    return cleanEquipmentFields(stored);
  } catch {
    return { ...EMPTY_EQUIPMENT_FIELDS, features: [], images: [] };
  }
}

/** 발행·예약 전에 채워져 있어야 하는 항목 */
export function equipmentProblems(f: EquipmentFields): string[] {
  const problems: string[] = [];
  if (!f.category) problems.push("카테고리를 입력해 주세요.");
  if (!f.thumbMediaId) problems.push("대표 이미지를 골라 주세요.");
  if (f.action === "external" && !f.externalUrl) problems.push("구매처 링크를 입력해 주세요.");
  return problems;
}

export function equipmentMediaIds(f: EquipmentFields): string[] {
  return [...(f.thumbMediaId ? [f.thumbMediaId] : []), ...f.images];
}
