import { describe, expect, it } from "vitest";
import { bodyFromPlainText } from "@/content/body";
import { ABOUT_LIMITS, aboutProblems, cleanAbout, defaultAboutContent, readAboutContent } from "./fields";

const doc = bodyFromPlainText("안녕하세요. 저는 KYU 입니다.");
const input = (over: Partial<Parameters<typeof cleanAbout>[0]> = {}) => ({ headline: "서로 다른 두 세계.\n하나의 호기심.", body: doc, signature: "이동규 aka. KYU", photoMediaId: "", ...over });

describe("cleanAbout", () => {
  it("헤드라인은 두 줄까지 쓰고 각 줄의 공백을 정리한다", () => {
    expect(cleanAbout(input({ headline: "  첫째   줄 \r\n\n  둘째 줄  " })).headline).toBe("첫째 줄\n둘째 줄");
    expect(() => cleanAbout(input({ headline: "가\n나\n다" }))).toThrow("두 줄");
    expect(() => cleanAbout(input({ headline: "가".repeat(ABOUT_LIMITS.headline + 1) }))).toThrow("80자");
  });

  it("서명 길이와 사진 id 형식을 검사한다", () => {
    expect(() => cleanAbout(input({ signature: "가".repeat(ABOUT_LIMITS.signature + 1) }))).toThrow("40자");
    expect(() => cleanAbout(input({ photoMediaId: "not-a-uuid" }))).toThrow("사진");
    expect(cleanAbout(input({ photoMediaId: "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA" })).photoMediaId).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    expect(cleanAbout(input()).photoMediaId).toBeNull();
  });

  it("허용 목록 밖의 본문은 거부한다", () => {
    expect(() => cleanAbout(input({ body: { type: "doc", content: [{ type: "script", content: [] }] } }))).toThrow();
  });
});

describe("aboutProblems", () => {
  it("헤드라인·본문이 비면 공개할 수 없다", () => {
    const empty = cleanAbout(input({ headline: "", body: { type: "doc", content: [] } }));
    const p = aboutProblems(empty, undefined);
    expect(p).toContain("헤드라인을 입력해 주세요.");
    expect(p).toContain("본문을 입력해 주세요.");
    expect(aboutProblems(cleanAbout(input()), undefined)).toEqual([]);
  });

  it("사진이 있으면 대체 텍스트가 있어야 한다", () => {
    const withPhoto = cleanAbout(input({ photoMediaId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }));
    expect(aboutProblems(withPhoto, "")).toHaveLength(1);
    expect(aboutProblems(withPhoto, "  ")).toHaveLength(1);
    expect(aboutProblems(withPhoto, "바다에서 웃는 모습")).toEqual([]);
  });
});

describe("readAboutContent·기본 문구", () => {
  it("잘못 저장된 값은 null 이다", () => {
    expect(readAboutContent(null)).toBeNull();
    expect(readAboutContent({ headline: "가".repeat(200), body: doc })).toBeNull();
    expect(readAboutContent({ headline: "가", body: doc, signature: "", photoMediaId: "" })).not.toBeNull();
  });

  it("기본 문구는 점검을 통과한다", () => {
    expect(aboutProblems(defaultAboutContent(), undefined)).toEqual([]);
  });
});
