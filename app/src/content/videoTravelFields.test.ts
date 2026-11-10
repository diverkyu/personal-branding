import { describe, expect, it } from "vitest";
import { cleanTravelFields, travelProblems, readTravelFields, EMPTY_TRAVEL_FIELDS } from "./travelFields";
import { cleanVideoFields, readVideoFields, videoProblems } from "./videoFields";

describe("영상 항목", () => {
  it("YouTube·Vimeo 주소만 받고 시청 주소로 정규화한다", () => {
    expect(cleanVideoFields({ videoUrl: "https://youtu.be/dQw4w9WgXcQ" }).videoUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(cleanVideoFields({ videoUrl: "https://vimeo.com/123456789" }).videoUrl).toBe("https://vimeo.com/123456789");
    for (const bad of ["http://youtu.be/dQw4w9WgXcQ", "https://example.com/v.mp4", "javascript:alert(1)", "not a url"]) {
      expect(() => cleanVideoFields({ videoUrl: bad })).toThrow("YouTube 또는 Vimeo");
    }
  });

  it("길이는 3:25 또는 1:02:30 모양만 받는다", () => {
    for (const ok of ["3:25", "0:09", "12:00", "1:02:30"]) expect(cleanVideoFields({ duration: ok }).duration).toBe(ok);
    for (const bad of ["325", "3:5", "3:75", "abc", "1:2:3:4"]) expect(() => cleanVideoFields({ duration: bad })).toThrow("길이");
  });

  it("자막 표시와 빈 입력, 발행 점검", () => {
    expect(cleanVideoFields({ hasCaptions: "on" }).hasCaptions).toBe(true);
    expect(cleanVideoFields(undefined)).toEqual({ videoUrl: "", duration: "", hasCaptions: false });
    expect(videoProblems(cleanVideoFields({}))).toEqual(["영상 주소(YouTube 또는 Vimeo)를 입력해 주세요."]);
    expect(videoProblems(cleanVideoFields({ videoUrl: "https://youtu.be/dQw4w9WgXcQ" }))).toEqual([]);
    expect(readVideoFields({ videoUrl: "javascript:x" })).toEqual({ videoUrl: "", duration: "", hasCaptions: false });
  });
});

describe("여행 추천 항목", () => {
  it("글자 수 제한·난이도·확인일을 검사한다", () => {
    expect(() => cleanTravelFields({ region: "가".repeat(31) })).toThrow("지역");
    expect(() => cleanTravelFields({ place: "가".repeat(61) })).toThrow("장소");
    expect(() => cleanTravelFields({ level: "expert" })).toThrow("난이도");
    expect(() => cleanTravelFields({ checkedAt: "2026-02-30" })).toThrow("정보 확인일");
    expect(cleanTravelFields({ region: " 제주  ", level: "beginner", checkedAt: "2026-11-01" })).toMatchObject({ region: "제주", level: "beginner", checkedAt: "2026-11-01" });
  });

  it("발행하려면 지역·장소가 있어야 한다", () => {
    expect(travelProblems(cleanTravelFields({}))).toEqual(["지역을 입력해 주세요.", "장소를 입력해 주세요."]);
    expect(travelProblems(cleanTravelFields({ region: "제주", place: "문섬" }))).toEqual([]);
    expect(readTravelFields({ level: "expert" })).toEqual(EMPTY_TRAVEL_FIELDS);
  });
});
