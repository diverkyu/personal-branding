import { describe, expect, it } from "vitest";
import { EMPTY_HERO, cleanHeroMediaId, editableHero, heroProblems, readHeroState, writeHeroState } from "./heroImage";

const A = "0b0f7c0e-3f1d-4a52-9a37-1c2d3e4f5a6b";
const B = "1c1f8d1f-4a2e-4b63-8b48-2d3e4f5a6b7c";

describe("홈 히어로 이미지 저장 값", () => {
  it("비어 있거나 깨진 값은 기본 일러스트·수정 없음으로 읽는다", () => {
    for (const weird of [undefined, null, "", "x", "[]", "7", '{"published":5}', '{"published":"nope","draft":"x"}']) expect(readHeroState(weird)).toEqual(EMPTY_HERO);
  });

  it("쓴 값을 그대로 다시 읽는다 (id 는 소문자로)", () => {
    const state = { published: A, draft: { mediaId: B } };
    expect(readHeroState(writeHeroState(state))).toEqual(state);
    expect(readHeroState(JSON.stringify({ published: A.toUpperCase(), draft: { mediaId: null } }))).toEqual({ published: A, draft: { mediaId: null } });
  });

  it("편집 화면은 수정 중인 것 → 공개 중인 것 순서로 보여 준다", () => {
    expect(editableHero({ published: A, draft: null })).toBe(A);
    expect(editableHero({ published: A, draft: { mediaId: B } })).toBe(B);
    expect(editableHero({ published: A, draft: { mediaId: null } })).toBeNull();
  });

  it("폼 값: 빈 값은 기본 일러스트, 형식이 틀리면 거부한다", () => {
    expect(cleanHeroMediaId("  ")).toBeNull();
    expect(cleanHeroMediaId(A.toUpperCase())).toBe(A);
    expect(() => cleanHeroMediaId("깨짐")).toThrow("다시 골라");
  });

  it("이미지는 대체 텍스트가 있어야 공개할 수 있고, 기본 일러스트는 점검할 것이 없다", () => {
    expect(heroProblems(null, undefined)).toEqual([]);
    expect(heroProblems(A, { alt: "바다" })).toEqual([]);
    expect(heroProblems(A, { alt: "  " })[0]).toContain("대체 텍스트");
    expect(heroProblems(A, undefined)[0]).toContain("삭제");
  });
});
