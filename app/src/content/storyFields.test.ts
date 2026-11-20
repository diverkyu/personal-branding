import { describe, expect, it } from "vitest";
import { cleanStoryFields, readStoryFields } from "./storyFields";
import { CONTENT_TYPES } from "./types";

describe("스토리 대표 이미지 입력", () => {
  it("기존 글과 선택 해제를 허용한다", () => {
    for (const value of [undefined, {}, { thumbMediaId: null }, { thumbMediaId: "" }]) expect(cleanStoryFields(value)).toEqual({ thumbMediaId: null });
    expect(CONTENT_TYPES.story!.fields?.problems({})).toEqual([]);
  });
  it("URL·잘못된 id는 저장하지 않고 이미지 사용 목록은 선택한 id만 반환한다", () => {
    for (const value of ["https://example.com/a.jpg", 123, "bad"]) expect(() => cleanStoryFields({ thumbMediaId: value })).toThrow();
    const id = "22222222-2222-4222-8222-222222222222";
    expect(CONTENT_TYPES.story!.fields?.mediaIds({ thumbMediaId: id })).toEqual([id]);
    expect(readStoryFields({ thumbMediaId: "bad" })).toEqual({ thumbMediaId: null });
  });
});

