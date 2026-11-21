import { describe, expect, it } from "vitest";
import { EMPTY_STORY_FIELDS, cleanStoryFields, readStoryFields, storyMediaIds, storyProblems, withCoverInBody } from "./storyFields";

const A = "0b0f7c0e-3f1d-4a52-9a37-1c2d3e4f5a6b";
const B = "1c1f8d1f-4a2e-4b63-8b48-2d3e4f5a6b7c";

describe("스토리 대표 이미지 항목", () => {
  it("비어 있으면 대표 없음으로 본다", () => {
    expect(cleanStoryFields(undefined)).toEqual(EMPTY_STORY_FIELDS);
    expect(cleanStoryFields({ coverMediaId: "  " })).toEqual({ coverMediaId: null });
  });

  it("올바른 id 는 소문자로 정리해 담고, 올바르지 않으면 거부한다", () => {
    expect(cleanStoryFields({ coverMediaId: A.toUpperCase() })).toEqual({ coverMediaId: A });
    expect(() => cleanStoryFields({ coverMediaId: "깨짐" })).toThrow("대표 이미지");
  });

  it("저장된 깨진 값은 던지지 않고 비어 있는 것으로 읽는다", () => {
    for (const weird of [null, "x", 7, [], { coverMediaId: 5 }, { coverMediaId: "nope" }]) expect(readStoryFields(weird)).toEqual(EMPTY_STORY_FIELDS);
    expect(readStoryFields({ coverMediaId: A })).toEqual({ coverMediaId: A });
  });

  it("대표 이미지는 선택이라 발행을 막지 않고, 별도 이미지 점검도 하지 않는다 (본문 점검이 한다)", () => {
    expect(storyProblems()).toEqual([]);
    expect(storyMediaIds()).toEqual([]);
  });

  it("본문에 없는 이미지는 대표에서 빠진다", () => {
    expect(withCoverInBody({ coverMediaId: A }, [A, B])).toEqual({ coverMediaId: A });
    expect(withCoverInBody({ coverMediaId: A }, [B])).toEqual({ coverMediaId: null });
    expect(withCoverInBody({ coverMediaId: A }, [])).toEqual({ coverMediaId: null });
    expect(withCoverInBody({ coverMediaId: null }, [A])).toEqual({ coverMediaId: null });
  });
});
