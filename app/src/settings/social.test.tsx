import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContactSection } from "@/components/site/ContactSection";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SETTINGS_BY_KEY, defaultSettings, resolveSettings, validateSetting } from "./registry";
import { contactPropsOf, socialLinksOf } from "./social";

const insta = SETTINGS_BY_KEY["social.instagram"]!;
const yt = SETTINGS_BY_KEY["social.youtube"]!;

describe("SNS 주소 검사", () => {
  it("비우면 통과(로고 숨김), https 주소는 정리해서 받는다", () => {
    expect(validateSetting(insta, "  ")).toEqual({ ok: true, value: "" });
    expect(validateSetting(insta, "https://www.instagram.com/kyu.test")).toEqual({ ok: true, value: "https://www.instagram.com/kyu.test" });
    expect(validateSetting(insta, "instagram.com/kyu.test")).toEqual({ ok: true, value: "https://instagram.com/kyu.test" });
    expect(validateSetting(yt, "https://www.youtube.com/@kyu-test")).toEqual({ ok: true, value: "https://www.youtube.com/@kyu-test" });
    expect(validateSetting(yt, "https://youtu.be/abc123")).toEqual({ ok: true, value: "https://youtu.be/abc123" });
  });

  it("다른 사이트·http·javascript·계정 정보·주소 없는 첫 화면은 거부한다", () => {
    expect(validateSetting(insta, "https://www.youtube.com/@x")).toMatchObject({ ok: false, error: expect.stringContaining("instagram.com") });
    expect(validateSetting(yt, "https://evil.example/youtube.com")).toMatchObject({ ok: false });
    expect(validateSetting(insta, "http://www.instagram.com/x")).toMatchObject({ ok: false, error: expect.stringContaining("https") });
    expect(validateSetting(insta, "javascript:alert(1)")).toMatchObject({ ok: false });
    expect(validateSetting(insta, "https://user:pw@www.instagram.com/x")).toMatchObject({ ok: false });
    expect(validateSetting(insta, "https://www.instagram.com/")).toMatchObject({ ok: false, error: expect.stringContaining("계정") });
    expect(validateSetting(insta, "https://www.instagram.com.evil.example/x")).toMatchObject({ ok: false });
  });

  it("저장된 값이 규칙에 맞지 않으면 쓰지 않는다", () => {
    expect(resolveSettings({ "social.instagram": "https://evil.example/x" })["social.instagram"]).toBe("");
  });
});

describe("연락처 묶음", () => {
  it("주소가 있는 SNS 만 인스타그램 → 유튜브 순서로", () => {
    expect(socialLinksOf(defaultSettings())).toEqual([]);
    const s = resolveSettings({ "social.youtube": "https://www.youtube.com/@kyu-test", "social.instagram": "https://www.instagram.com/kyu.test" });
    expect(socialLinksOf(s).map((l) => l.kind)).toEqual(["instagram", "youtube"]);
  });

  it("어드민의 연락 이메일을 그대로 쓴다", () => {
    const s = resolveSettings({ "contact.email": "kyu@test.example" });
    expect(contactPropsOf(s).email).toBe("kyu@test.example");
  });

  it("Contact 영역과 푸터에 새 탭으로 여는 로고 링크가 나온다 (없으면 목록도 없다)", () => {
    const social = socialLinksOf(resolveSettings({ "social.instagram": "https://www.instagram.com/kyu.test" }));
    const contact = renderToStaticMarkup(<ContactSection {...contactPropsOf(defaultSettings())} social={social} />);
    expect(contact).toContain('href="https://www.instagram.com/kyu.test"');
    expect(contact).toContain('aria-label="인스타그램 (새 탭)"');
    expect(contact).toContain('target="_blank"');
    expect(contact).toContain('rel="noopener noreferrer"');
    expect(contact).not.toContain("유튜브");
    expect(renderToStaticMarkup(<SiteFooter year={2026} social={social} />)).toContain('aria-label="인스타그램 (새 탭)"');
    expect(renderToStaticMarkup(<ContactSection />)).not.toContain('aria-label="SNS"');
  });
});
