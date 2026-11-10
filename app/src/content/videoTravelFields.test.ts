import { describe, expect, it } from "vitest";
import { cleanTravelFields, travelProblems, readTravelFields, EMPTY_TRAVEL_FIELDS } from "./travelFields";
import { EMPTY_VIDEO_FIELDS, NOTE_KEYS, VIDEO_LIMITS, cleanVideoFields, hasNotes, readVideoFields, videoMediaIds, videoProblems } from "./videoFields";

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
    expect(cleanVideoFields(undefined)).toEqual(EMPTY_VIDEO_FIELDS);
    expect(videoProblems(cleanVideoFields({}))).toEqual(["영상 주소(YouTube 또는 Vimeo)를 입력해 주세요.", "포스터 이미지를 골라 주세요."]);
    expect(videoProblems(cleanVideoFields({ videoUrl: "https://youtu.be/dQw4w9WgXcQ" }))).toEqual(["포스터 이미지를 골라 주세요."]);
    expect(videoProblems(cleanVideoFields({ videoUrl: "https://youtu.be/dQw4w9WgXcQ", posterMediaId: POSTER }))).toEqual([]);
    expect(readVideoFields({ videoUrl: "javascript:x" })).toEqual(EMPTY_VIDEO_FIELDS);
  });
});

const POSTER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("영상 항목: 포스터·표시 문구·대표 작품·제작 노트 (7a)", () => {
  it("포스터는 이미지 id 형식만 받고 소문자로 맞춘다", () => {
    expect(cleanVideoFields({ posterMediaId: POSTER.toUpperCase() }).posterMediaId).toBe(POSTER);
    expect(cleanVideoFields({ posterMediaId: "" }).posterMediaId).toBeNull();
    expect(() => cleanVideoFields({ posterMediaId: "https://example.com/p.jpg" })).toThrow("포스터");
    expect(videoMediaIds(cleanVideoFields({ posterMediaId: POSTER }))).toEqual([POSTER]);
    expect(videoMediaIds(cleanVideoFields({}))).toEqual([]);
  });

  it("표시 문구는 20자까지이고 공백을 정리한다", () => {
    expect(cleanVideoFields({ cutLabel: "  ROUGH   CUT " }).cutLabel).toBe("ROUGH CUT");
    expect(() => cleanVideoFields({ cutLabel: "가".repeat(VIDEO_LIMITS.cutLabel + 1) })).toThrow("표시 문구");
  });

  it("대표 작품 체크", () => {
    expect(cleanVideoFields({ featured: "on" }).featured).toBe(true);
    expect(cleanVideoFields({ featured: true }).featured).toBe(true);
    expect(cleanVideoFields({}).featured).toBe(false);
  });

  it("제작 노트는 가공하지 않는다 — 줄바꿈 형식과 앞뒤 공백만 정리하고 안쪽 글자·띄어쓰기·HTML 모양은 그대로 둔다", () => {
    const f = cleanVideoFields({ promptNotes: "  첫 줄\r\n\r\n  둘째   줄 <b>x</b> <script>1</script>  \r\n", sceneIntent: "의도", editNotes: "" });
    expect(f.promptNotes).toBe("첫 줄\n\n  둘째   줄 <b>x</b> <script>1</script>");
    expect(f.sceneIntent).toBe("의도");
    expect(f.editNotes).toBe("");
  });

  it("제작 노트는 1,500자까지이고 제어 문자는 거부한다", () => {
    expect(cleanVideoFields({ sceneIntent: "가".repeat(VIDEO_LIMITS.note) }).sceneIntent).toHaveLength(VIDEO_LIMITS.note);
    expect(() => cleanVideoFields({ sceneIntent: "가".repeat(VIDEO_LIMITS.note + 1) })).toThrow("장면 의도");
    expect(() => cleanVideoFields({ promptNotes: "a\u0000b" })).toThrow("프롬프트");
    expect(() => cleanVideoFields({ editNotes: "a\u001bb" })).toThrow("편집 판단");
    expect(cleanVideoFields({ editNotes: "탭\t과\n줄바꿈은 허용" }).editNotes).toContain("\t");
  });

  it("제작 노트가 하나라도 있는지 알려 준다 (공개 화면의 \"제작 노트 보기\" 표시용)", () => {
    expect(hasNotes(cleanVideoFields({}))).toBe(false);
    for (const key of NOTE_KEYS) expect(hasNotes(cleanVideoFields({ [key]: "있음" }))).toBe(true);
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
