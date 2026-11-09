import { describe, expect, it } from "vitest";
import { EMPTY_TOUR_FIELDS, cleanTourFields, isValidDate, readTourFields, tourMediaIds, tourProblems, tourStatusOf } from "./tourFields";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";
const good = { startDate: "2026-12-05", endDate: "2026-12-07", place: "제주 서귀포", recruit: "recruiting", capacity: "8", feeNote: "참가비는 문의", gallery: [], videos: [] };

describe("날짜", () => {
  it("실제 있는 날짜만 통과한다", () => {
    expect(isValidDate("2026-12-05")).toBe(true);
    expect(isValidDate("2028-02-29")).toBe(true);
    for (const bad of ["2026-02-30", "2026-13-01", "2026-1-5", "20261205", "", "2026-12-05T00:00"]) expect(isValidDate(bad)).toBe(false);
  });
});

describe("cleanTourFields", () => {
  it("정상 입력을 정리해 돌려준다 (정원은 숫자로)", () => {
    expect(cleanTourFields(good)).toMatchObject({ startDate: "2026-12-05", endDate: "2026-12-07", place: "제주 서귀포", recruit: "recruiting", capacity: 8, feeNote: "참가비는 문의" });
  });

  it("임시저장은 비어 있어도 된다 (빈 입력 = 기본값)", () => {
    expect(cleanTourFields({})).toEqual(EMPTY_TOUR_FIELDS);
    expect(cleanTourFields(null)).toEqual(EMPTY_TOUR_FIELDS);
    expect(cleanTourFields({ ...good, startDate: "", endDate: "", place: "", capacity: "" })).toMatchObject({ startDate: "", endDate: "", place: "", capacity: null });
  });

  it("날짜 형식·순서를 검사한다", () => {
    expect(() => cleanTourFields({ ...good, startDate: "2026-02-30" })).toThrow("시작일");
    expect(() => cleanTourFields({ ...good, endDate: "내일" })).toThrow("종료일");
    expect(() => cleanTourFields({ ...good, startDate: "2026-12-08", endDate: "2026-12-07" })).toThrow("같거나 그 뒤");
    expect(() => cleanTourFields({ ...good, startDate: "2026-12-07", endDate: "2026-12-07" })).not.toThrow();
  });

  it("모집 상태는 정해진 값만, 정원은 1~500 정수만", () => {
    expect(() => cleanTourFields({ ...good, recruit: "ended" })).toThrow("모집 상태");
    expect(cleanTourFields({ ...good, recruit: "" }).recruit).toBe("upcoming");
    for (const bad of ["0", "501", "-3", "1.5", "여덟"]) expect(() => cleanTourFields({ ...good, capacity: bad })).toThrow("정원");
    expect(cleanTourFields({ ...good, capacity: 12 }).capacity).toBe(12);
  });

  it("글자 수 한도를 지킨다", () => {
    expect(() => cleanTourFields({ ...good, place: "가".repeat(81) })).toThrow("장소");
    expect(() => cleanTourFields({ ...good, feeNote: "가".repeat(501) })).toThrow("참가비");
    expect(() => cleanTourFields({ ...good, gallery: [{ mediaId: ID_A, caption: "가".repeat(101) }] })).toThrow("사진 설명");
  });

  it("갤러리: 올바른 id 만, 중복은 합치고, 30장까지", () => {
    expect(cleanTourFields({ ...good, gallery: [{ mediaId: ID_A.toUpperCase(), caption: " 첫 장 " }, { mediaId: ID_B }, { mediaId: ID_A, caption: "중복" }] }).gallery).toEqual([
      { mediaId: ID_A, caption: "첫 장" },
      { mediaId: ID_B, caption: "" },
    ]);
    expect(() => cleanTourFields({ ...good, gallery: [{ mediaId: "not-a-uuid" }] })).toThrow("올바르지 않은 이미지");
    expect(() => cleanTourFields({ ...good, gallery: [{ caption: "id 없음" }] })).toThrow("올바르지 않은 이미지");
    const many = Array.from({ length: 31 }, (_, i) => ({ mediaId: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}` }));
    expect(() => cleanTourFields({ ...good, gallery: many })).toThrow("30장");
  });

  it("영상: YouTube·Vimeo https 만, 중복은 합치고, 5개까지, 주소는 정규화", () => {
    const yt = "https://youtu.be/dQw4w9WgXcQ";
    const same = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    expect(cleanTourFields({ ...good, videos: [yt, same, "", "  "] }).videos).toEqual(["https://www.youtube.com/watch?v=dQw4w9WgXcQ"]);
    for (const bad of ["http://youtu.be/dQw4w9WgXcQ", "https://evil.example/video", "javascript:alert(1)", "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ"]) {
      expect(() => cleanTourFields({ ...good, videos: [bad] })).toThrow("YouTube 또는 Vimeo");
    }
    const six = Array.from({ length: 6 }, (_, i) => `https://vimeo.com/${100000 + i}`);
    expect(() => cleanTourFields({ ...good, videos: six })).toThrow("5개");
  });

  it("엉뚱한 형태의 입력(배열·문자열·숫자)에도 던지지 않고 기본값으로 읽는다 (readTourFields)", () => {
    for (const weird of [[], "x", 7, undefined, { startDate: "2026-02-30" }]) expect(readTourFields(weird)).toEqual(EMPTY_TOUR_FIELDS);
  });
});

describe("발행 점검·상태 계산", () => {
  it("발행 전에는 일정과 장소가 있어야 한다", () => {
    expect(tourProblems(EMPTY_TOUR_FIELDS)).toHaveLength(3);
    expect(tourProblems(cleanTourFields(good))).toEqual([]);
    expect(tourProblems({ ...EMPTY_TOUR_FIELDS, startDate: "2026-12-05", endDate: "2026-12-06" })).toEqual(["장소를 입력해 주세요."]);
  });

  it("종료일이 오늘보다 앞서면 모집 상태와 상관없이 종료, 종료일 당일은 아직 종료가 아니다", () => {
    expect(tourStatusOf({ endDate: "2026-12-07", recruit: "recruiting" }, "2026-12-08")).toBe("ended");
    expect(tourStatusOf({ endDate: "2026-12-07", recruit: "closed" }, "2026-12-08")).toBe("ended");
    expect(tourStatusOf({ endDate: "2026-12-07", recruit: "recruiting" }, "2026-12-07")).toBe("recruiting");
    expect(tourStatusOf({ endDate: "2026-12-07", recruit: "upcoming" }, "2026-11-01")).toBe("upcoming");
    expect(tourStatusOf({ endDate: "2026-12-07", recruit: "closed" }, "2026-11-01")).toBe("closed");
  });

  it("쓰는 이미지 id 를 모은다", () => {
    expect(tourMediaIds(cleanTourFields({ ...good, gallery: [{ mediaId: ID_A }, { mediaId: ID_B }] }))).toEqual([ID_A, ID_B]);
  });
});
