import { describe, expect, it } from "vitest";
import { DEFAULT_SORT_ORDER, EMPTY_EQUIPMENT_FIELDS, cleanEquipmentFields, equipmentMediaIds, equipmentProblems, parseExternalUrl, readEquipmentFields } from "./equipmentFields";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const good = { category: "마스크", brand: "예시 브랜드", features: ["넓은 시야", "저용량"], thumbMediaId: A, images: [B], priceNote: "10만원대", checkedAt: "2026-11-01", action: "external", externalUrl: "https://example.com/mask", buttonLabel: "구매하러 가기", affiliate: true, sortOrder: "5" };

describe("구매 링크", () => {
  it("https 만, 계정 정보 없이, 점이 있는 호스트만 통과한다", () => {
    expect(parseExternalUrl("https://shop.example.com/a?x=1")).toBe("https://shop.example.com/a?x=1");
    for (const bad of ["http://example.com", "javascript:alert(1)", "data:text/html,x", "//example.com", "https://user:pw@example.com", "https://localhost/x", "example.com", "ftp://example.com"]) expect(parseExternalUrl(bad)).toBeNull();
  });
});

describe("cleanEquipmentFields", () => {
  it("정상 입력을 정리해 돌려준다", () => {
    expect(cleanEquipmentFields(good)).toEqual({ category: "마스크", brand: "예시 브랜드", features: ["넓은 시야", "저용량"], thumbMediaId: A, images: [B], priceNote: "10만원대", checkedAt: "2026-11-01", action: "external", externalUrl: "https://example.com/mask", buttonLabel: "구매하러 가기", affiliate: true, sortOrder: 5 });
  });

  it("임시저장은 비어 있어도 된다 (기본값)", () => {
    expect(cleanEquipmentFields({})).toEqual(EMPTY_EQUIPMENT_FIELDS);
    expect(cleanEquipmentFields(null)).toEqual(EMPTY_EQUIPMENT_FIELDS);
    expect(EMPTY_EQUIPMENT_FIELDS.sortOrder).toBe(DEFAULT_SORT_ORDER);
  });

  it("글자 수 한도를 지킨다", () => {
    expect(() => cleanEquipmentFields({ ...good, category: "가".repeat(21) })).toThrow("카테고리");
    expect(() => cleanEquipmentFields({ ...good, brand: "가".repeat(41) })).toThrow("브랜드");
    expect(() => cleanEquipmentFields({ ...good, priceNote: "가".repeat(41) })).toThrow("가격대");
    expect(() => cleanEquipmentFields({ ...good, buttonLabel: "가".repeat(21) })).toThrow("버튼 라벨");
    expect(() => cleanEquipmentFields({ ...good, features: ["가".repeat(61)] })).toThrow("특징 하나");
  });

  it("특징은 8개까지, 빈 줄과 중복은 버린다", () => {
    expect(cleanEquipmentFields({ ...good, features: ["a", " a ", "", "b"] }).features).toEqual(["a", "b"]);
    expect(() => cleanEquipmentFields({ ...good, features: ["1", "2", "3", "4", "5", "6", "7", "8", "9"] })).toThrow("8개");
  });

  it("이미지: 올바른 id 만, 대표와 같은 것·중복은 합치고, 추가 이미지는 6장까지", () => {
    expect(cleanEquipmentFields({ ...good, images: [A, B, B, C.toUpperCase()] }).images).toEqual([B, C]);
    expect(() => cleanEquipmentFields({ ...good, thumbMediaId: "nope" })).toThrow("대표 이미지");
    expect(() => cleanEquipmentFields({ ...good, images: ["nope"] })).toThrow("추가 이미지");
    const seven = Array.from({ length: 7 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    expect(() => cleanEquipmentFields({ ...good, images: seven })).toThrow("6장");
  });

  it("행동 유형: 정해진 값만. 구매 링크는 구매처 링크일 때만 남고 https 만 받는다", () => {
    expect(() => cleanEquipmentFields({ ...good, action: "buy" })).toThrow("행동 유형");
    expect(() => cleanEquipmentFields({ ...good, externalUrl: "http://example.com" })).toThrow("https");
    expect(() => cleanEquipmentFields({ ...good, externalUrl: "javascript:alert(1)" })).toThrow("https");
    expect(cleanEquipmentFields({ ...good, action: "inquiry" })).toMatchObject({ action: "inquiry", externalUrl: "" });
    expect(cleanEquipmentFields({ ...good, action: "none", buttonLabel: "x" })).toMatchObject({ action: "none", externalUrl: "", buttonLabel: "" });
    expect(cleanEquipmentFields({ ...good, action: "", affiliate: true }).action).toBe("none");
  });

  it("정보 확인일은 실제 날짜만, 노출 순서는 0~9999 정수만 (비우면 100)", () => {
    expect(() => cleanEquipmentFields({ ...good, checkedAt: "2026-02-30" })).toThrow("정보 확인일");
    for (const bad of ["-1", "10000", "1.5", "빠르게"]) expect(() => cleanEquipmentFields({ ...good, sortOrder: bad })).toThrow("노출 순서");
    expect(cleanEquipmentFields({ ...good, sortOrder: "" }).sortOrder).toBe(DEFAULT_SORT_ORDER);
    expect(cleanEquipmentFields({ ...good, sortOrder: 0 }).sortOrder).toBe(0);
  });

  it("제휴 표시는 체크(on·true)일 때만 켜진다", () => {
    expect(cleanEquipmentFields({ ...good, affiliate: "on" }).affiliate).toBe(true);
    expect(cleanEquipmentFields({ ...good, affiliate: "" }).affiliate).toBe(false);
    expect(cleanEquipmentFields({ ...good, affiliate: undefined }).affiliate).toBe(false);
  });

  it("엉뚱한 형태의 입력에도 던지지 않고 기본값으로 읽는다 (readEquipmentFields)", () => {
    for (const weird of [[], "x", 7, undefined, { thumbMediaId: "깨짐" }]) expect(readEquipmentFields(weird)).toEqual(EMPTY_EQUIPMENT_FIELDS);
  });
});

describe("발행 점검", () => {
  it("카테고리·대표 이미지가 있어야 하고, 구매처 링크 유형이면 링크가 있어야 한다", () => {
    expect(equipmentProblems(EMPTY_EQUIPMENT_FIELDS)).toEqual(["카테고리를 입력해 주세요.", "대표 이미지를 골라 주세요."]);
    expect(equipmentProblems(cleanEquipmentFields(good))).toEqual([]);
    expect(equipmentProblems(cleanEquipmentFields({ ...good, externalUrl: "" }))).toEqual(["구매처 링크를 입력해 주세요."]);
    expect(equipmentProblems(cleanEquipmentFields({ ...good, action: "inquiry", externalUrl: "" }))).toEqual([]);
  });

  it("쓰는 이미지 id 를 대표 → 추가 순서로 모은다", () => {
    expect(equipmentMediaIds(cleanEquipmentFields(good))).toEqual([A, B]);
    expect(equipmentMediaIds(EMPTY_EQUIPMENT_FIELDS)).toEqual([]);
  });
});
