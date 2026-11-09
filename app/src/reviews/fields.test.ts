import { describe, expect, it } from "vitest";
import { DEFAULT_FEATURED_ORDER, cleanReview, type ReviewInput } from "./fields";

const TODAY = "2026-11-10";
const good: ReviewInput = { body: "처음 바다에 들어갔는데 정말 좋았어요.", authorLabel: "홍*동", labelKind: "initial", writtenOn: "2026-11-01", sourceKind: "direct", sourceNote: "카톡으로 받음", tourSlug: "jeju-tour", featured: true, featuredOrder: "3", consentConfirmed: true, consentNote: "2026-11-02 DM 동의" };

describe("cleanReview", () => {
  it("정상 입력을 정리해 돌려준다", () => {
    expect(cleanReview(good, TODAY)).toEqual({ body: "처음 바다에 들어갔는데 정말 좋았어요.", authorLabel: "홍*동", labelKind: "initial", writtenOn: "2026-11-01", sourceKind: "direct", sourceNote: "카톡으로 받음", tourSlug: "jeju-tour", featured: true, featuredOrder: 3, consentConfirmed: true, consentNote: "2026-11-02 DM 동의" });
  });

  it("원문은 가공하지 않는다: 줄바꿈 형식과 앞뒤 공백만 정리하고 안쪽 글자·띄어쓰기·맞춤법은 그대로", () => {
    const body = cleanReview({ ...good, body: "  첫 줄입니다  \r\n둘째줄은   띄어쓰기가   이상해도\r\n\r\n그대로 입니다 ㅎㅎ  " }, TODAY).body;
    expect(body).toBe("첫 줄입니다  \n둘째줄은   띄어쓰기가   이상해도\n\n그대로 입니다 ㅎㅎ");
  });

  it("HTML 처럼 보이는 글자도 그대로 둔다 (화면에서 글자로만 그린다)", () => {
    expect(cleanReview({ ...good, body: "<b>좋아요</b> <script>x</script> & 그리고" }, TODAY).body).toBe("<b>좋아요</b> <script>x</script> & 그리고");
  });

  it("원문은 1~1000자이고 제어 문자는 받지 않는다", () => {
    expect(() => cleanReview({ ...good, body: "   " }, TODAY)).toThrow("후기 원문을 입력");
    expect(cleanReview({ ...good, body: "가".repeat(1000) }, TODAY).body).toHaveLength(1000);
    expect(() => cleanReview({ ...good, body: "가".repeat(1001) }, TODAY)).toThrow("1000자");
    expect(() => cleanReview({ ...good, body: "나쁜\u0000글자" }, TODAY)).toThrow("쓸 수 없는 문자");
    expect(cleanReview({ ...good, body: "탭\t과\n줄바꿈은 허용" }, TODAY).body).toContain("\t");
  });

  it("수강생 표기는 1~40자 한 줄이고, 표기 방식은 정해진 값만", () => {
    expect(() => cleanReview({ ...good, authorLabel: " " }, TODAY)).toThrow("수강생 표기를 입력");
    expect(() => cleanReview({ ...good, authorLabel: "가".repeat(41) }, TODAY)).toThrow("40자");
    expect(cleanReview({ ...good, authorLabel: "홍\n길동" }, TODAY).authorLabel).toBe("홍 길동");
    for (const bad of ["", "anonymous", "REAL"]) expect(() => cleanReview({ ...good, labelKind: bad }, TODAY)).toThrow("표기 방식");
    for (const k of ["real", "initial", "nick"]) expect(cleanReview({ ...good, labelKind: k }, TODAY).labelKind).toBe(k);
  });

  it("작성일은 실제 날짜이고 오늘(한국 시간)보다 뒤일 수 없다", () => {
    expect(() => cleanReview({ ...good, writtenOn: "" }, TODAY)).toThrow("작성일을 입력");
    expect(() => cleanReview({ ...good, writtenOn: "2026-02-30" }, TODAY)).toThrow("올바른 날짜");
    expect(() => cleanReview({ ...good, writtenOn: "2026-11-11" }, TODAY)).toThrow("뒤일 수 없습니다");
    expect(cleanReview({ ...good, writtenOn: TODAY }, TODAY).writtenOn).toBe(TODAY);
  });

  it("출처는 정해진 값이고 비워도 된다, 메모는 200자까지", () => {
    expect(cleanReview({ ...good, sourceKind: "", sourceNote: "" }, TODAY).sourceKind).toBe("");
    expect(() => cleanReview({ ...good, sourceKind: "twitter" }, TODAY)).toThrow("출처");
    expect(() => cleanReview({ ...good, sourceNote: "가".repeat(201) }, TODAY)).toThrow("출처 메모");
  });

  it("연결할 투어는 주소 이름 모양이어야 하고 비우면 연결 없음", () => {
    expect(cleanReview({ ...good, tourSlug: "" }, TODAY).tourSlug).toBeNull();
    expect(cleanReview({ ...good, tourSlug: "  jeju-tour  " }, TODAY).tourSlug).toBe("jeju-tour");
    for (const bad of ["Jeju Tour", "../admin", "투어", "a_b"]) expect(() => cleanReview({ ...good, tourSlug: bad }, TODAY)).toThrow("투어를 다시");
  });

  it("대표 순서는 0~9999 정수, 비우면 100", () => {
    expect(cleanReview({ ...good, featuredOrder: "" }, TODAY).featuredOrder).toBe(DEFAULT_FEATURED_ORDER);
    expect(cleanReview({ ...good, featuredOrder: "0" }, TODAY).featuredOrder).toBe(0);
    for (const bad of ["-1", "10000", "1.5", "첫째"]) expect(() => cleanReview({ ...good, featuredOrder: bad }, TODAY)).toThrow("대표 순서");
  });

  it("동의 메모는 300자까지", () => {
    expect(() => cleanReview({ ...good, consentNote: "가".repeat(301) }, TODAY)).toThrow("동의 메모");
  });
});
