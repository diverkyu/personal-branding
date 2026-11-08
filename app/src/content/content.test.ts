import { describe, expect, it } from "vitest";
import { bodyFromPlainText, isBodyEmpty, plainEditableText, plainTextFromBody, safeHttpsUrl, sanitizeBody, BODY_LIMITS } from "./body";
import { STATUSES, allowedTransitions, canTransition, isLive, parseKstLocal, publishChecks, requiresReview, toKstLocal, validatePublishAt, type ContentStatus } from "./publish";
import { isContentType, slugFromTitle, validateSlug } from "./types";

const text0 = (t: string, marks?: unknown[]) => ({ type: "text", text: t, ...(marks ? { marks } : {}) });
const text = text0;
const doc = (...content: unknown[]) => ({ type: "doc", content });
const para = (...c: unknown[]) => ({ type: "paragraph", content: c });
const UUID = "123e4567-e89b-42d3-a456-426614174000";

describe("본문 검사기 (허용 목록)", () => {
  it("허용된 모든 요소를 통과시키고 같은 모양으로 돌려준다", () => {
    const input = doc(
      { type: "heading", attrs: { level: 2 }, content: [text("제목")] },
      para(text("굵게", [{ type: "bold" }]), { type: "hardBreak" }, text("링크", [{ type: "link", attrs: { href: "https://example.com/a?b=1" } }, { type: "italic" }])),
      { type: "bulletList", content: [{ type: "listItem", content: [para(text("하나"))] }] },
      { type: "orderedList", content: [{ type: "listItem", content: [para(text("첫째"))] }] },
      { type: "blockquote", content: [para(text("인용"))] },
      { type: "horizontalRule" },
      { type: "image", attrs: { mediaId: UUID } },
      { type: "video", attrs: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } },
    );
    const r = sanitizeBody(input);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.doc.content).toHaveLength(8);
  });

  it("모르는 속성은 버리고, 모르는 노드·서식은 거부한다", () => {
    const withExtra = sanitizeBody(doc({ type: "paragraph", attrs: { textAlign: "center", onclick: "x()" }, content: [{ type: "text", text: "a", style: "color:red", onmouseover: "x()" }] }));
    expect(withExtra).toEqual({ ok: true, doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }] } });
    for (const bad of [
      doc({ type: "script", content: [] }),
      doc({ type: "html", attrs: { html: "<b>x</b>" } }),
      doc({ type: "codeBlock", content: [text("x")] }),
      doc(para(text("x", [{ type: "underline" }]))),
      doc(para({ type: "image", attrs: { mediaId: UUID } })),
      { type: "paragraph", content: [] },
      "<p>raw</p>",
      null,
      [],
    ]) {
      expect(sanitizeBody(bad).ok, JSON.stringify(bad)).toBe(false);
    }
  });

  it("링크는 https 만: javascript·data·http·사용자 정보·상대 경로를 거부한다", () => {
    for (const href of ["javascript:alert(1)", "data:text/html,<script>", "http://example.com", "https://user:pw@example.com", "//evil.com", "/relative", "https://localhost", "https://" + "a".repeat(600) + ".com", 5, null]) {
      expect(sanitizeBody(doc(para(text("x", [{ type: "link", attrs: { href } }])))).ok, String(href)).toBe(false);
      expect(safeHttpsUrl(href), String(href)).toBeNull();
    }
    expect(safeHttpsUrl("https://example.com/path?q=1#h")).toBe("https://example.com/path?q=1#h");
  });

  it("이미지는 미디어 id 만, 영상은 허용 도메인만, 제목은 2·3단계만 허용한다", () => {
    expect(sanitizeBody(doc({ type: "image", attrs: { src: "https://evil.example/x.png" } })).ok).toBe(false);
    expect(sanitizeBody(doc({ type: "image", attrs: { mediaId: "../../etc/passwd" } })).ok).toBe(false);
    expect(sanitizeBody(doc({ type: "video", attrs: { url: "https://evil.example/video" } })).ok).toBe(false);
    expect(sanitizeBody(doc({ type: "video", attrs: { url: "javascript:alert(1)" } })).ok).toBe(false);
    expect(sanitizeBody(doc({ type: "heading", attrs: { level: 1 }, content: [text("x")] })).ok).toBe(false);
    expect(sanitizeBody(doc({ type: "heading", attrs: { level: 4 }, content: [text("x")] })).ok).toBe(false);
    expect(sanitizeBody(doc({ type: "heading", attrs: { level: 3 }, content: [text("x")] })).ok).toBe(true);
  });

  it("크기·깊이·글자 수 상한을 둔다", () => {
    const many = doc(...Array.from({ length: BODY_LIMITS.maxNodes }, () => para(text("x"))));
    expect(sanitizeBody(many)).toMatchObject({ ok: false });
    let nested: unknown = para(text("깊다"));
    for (let i = 0; i < BODY_LIMITS.maxDepth + 1; i++) nested = { type: "blockquote", content: [nested] };
    expect(sanitizeBody(doc(nested))).toMatchObject({ ok: false });
    expect(sanitizeBody(doc(para(text("가".repeat(BODY_LIMITS.maxText + 1)))))).toMatchObject({ ok: false });
    expect(sanitizeBody(doc({ type: "bulletList", content: [] }))).toMatchObject({ ok: false });
  });

  it("글자만 뽑고, 빈 본문을 알아보고, 입력 글자를 문단으로 바꾼다", () => {
    const r = sanitizeBody(doc({ type: "heading", attrs: { level: 2 }, content: [text("제목")] }, para(text("첫 줄"), { type: "hardBreak" }, text("둘째 줄")), { type: "bulletList", content: [{ type: "listItem", content: [para(text("항목"))] }] }));
    if (!r.ok) throw new Error("expected ok");
    expect(plainTextFromBody(r.doc)).toBe("제목\n\n첫 줄\n둘째 줄\n\n항목");
    expect(isBodyEmpty(r.doc)).toBe(false);
    expect(isBodyEmpty({ type: "doc", content: [] })).toBe(true);
    expect(isBodyEmpty({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "   " }] }] })).toBe(true);
    expect(isBodyEmpty({ type: "doc", content: [{ type: "image", attrs: { mediaId: UUID } }] })).toBe(false);
    const fromText = bodyFromPlainText("첫 문단\n줄바꿈\n\n\n둘째 문단");
    expect(fromText.content).toHaveLength(2);
    expect(sanitizeBody(fromText).ok).toBe(true);
    expect(plainTextFromBody(fromText)).toBe("첫 문단\n줄바꿈\n\n둘째 문단");
  });
});

describe("서식 없는 본문 판별", () => {
  it("글자만 있는 본문은 편집용 글자로, 서식이 있으면 null 로 돌려준다 (왕복해도 같다)", () => {
    const plain = bodyFromPlainText("첫 문단\n줄바꿈\n\n둘째 문단");
    const text = plainEditableText(plain);
    expect(text).toBe("첫 문단\n줄바꿈\n\n둘째 문단");
    expect(bodyFromPlainText(text!)).toEqual(plain);
    expect(plainEditableText({ type: "doc", content: [] })).toBe("");
    const withMark = sanitizeBody(doc(para(text0("굵게", [{ type: "bold" }]))));
    if (!withMark.ok) throw new Error("expected ok");
    expect(plainEditableText(withMark.doc)).toBeNull();
    const withHeading = sanitizeBody(doc({ type: "heading", attrs: { level: 2 }, content: [text0("제목")] }));
    if (!withHeading.ok) throw new Error("expected ok");
    expect(plainEditableText(withHeading.doc)).toBeNull();
  });
});

describe("발행 상태 전이", () => {
  const T: Record<ContentStatus, ContentStatus[]> = {
    draft: ["review", "scheduled", "published", "archived"],
    review: ["draft", "scheduled", "published", "archived"],
    scheduled: ["draft", "published"],
    published: ["draft", "archived"],
    archived: ["draft"],
  };

  it("허용 표와 정확히 일치한다 (그 밖의 전이는 모두 거부)", () => {
    for (const from of STATUSES) {
      expect([...allowedTransitions(from)].sort()).toEqual([...T[from]].sort());
      for (const to of STATUSES) expect(canTransition(from, to), `${from}->${to}`).toBe(T[from].includes(to));
    }
    expect(canTransition("archived", "published")).toBe(false);
    expect(canTransition("published", "scheduled")).toBe(false);
  });

  it("예약 시각이 지난 예약 항목은 작업이 돌기 전에도 공개로 본다", () => {
    const now = new Date("2026-11-15T00:00:00Z");
    expect(isLive("published", null, now)).toBe(true);
    expect(isLive("scheduled", new Date("2026-11-14T23:59:59Z"), now)).toBe(true);
    expect(isLive("scheduled", new Date("2026-11-15T00:00:01Z"), now)).toBe(false);
    expect(isLive("scheduled", null, now)).toBe(false);
    for (const s of ["draft", "review", "archived"] as const) expect(isLive(s, new Date("2000-01-01"), now)).toBe(false);
  });

  it("발행 점검: 제목·본문·요약 길이, 자동 생성 글은 검토를 거쳐야 한다", () => {
    const ok = { title: "제목", slug: "a", bodyEmpty: false, summary: "", origin: "manual" as const, reviewed: false };
    expect(publishChecks(ok)).toEqual([]);
    expect(publishChecks({ ...ok, title: "  " })).toHaveLength(1);
    expect(publishChecks({ ...ok, bodyEmpty: true })).toHaveLength(1);
    expect(publishChecks({ ...ok, summary: "가".repeat(161) })).toHaveLength(1);
    expect(publishChecks({ ...ok, origin: "automated" })).toHaveLength(1);
    expect(publishChecks({ ...ok, origin: "automated", reviewed: true })).toEqual([]);
    expect(publishChecks({ ...ok, origin: "ai_assisted" })).toEqual([]);
    expect(requiresReview("automated")).toBe(true);
    expect(requiresReview("manual")).toBe(false);
  });

  it("예약 시각: 과거·1년 초과·잘못된 값을 거부하고 한국 시간 입력을 해석한다", () => {
    const now = new Date("2026-11-08T00:00:00Z");
    expect(validatePublishAt(new Date("2026-11-08T00:00:00Z"), now)).not.toBeNull();
    expect(validatePublishAt(new Date("2026-11-07T00:00:00Z"), now)).not.toBeNull();
    expect(validatePublishAt(new Date("2028-01-01T00:00:00Z"), now)).not.toBeNull();
    expect(validatePublishAt(new Date("invalid"), now)).not.toBeNull();
    expect(validatePublishAt(new Date("2026-11-15T00:00:00Z"), now)).toBeNull();
    expect(parseKstLocal("2026-11-15T09:00")?.toISOString()).toBe("2026-11-15T00:00:00.000Z");
    expect(parseKstLocal("2026-11-15 09:00")).toBeNull();
    expect(parseKstLocal("2026-13-40T09:00")).toBeNull();
    expect(toKstLocal(new Date("2026-11-15T00:00:00Z"))).toBe("2026-11-15T09:00");
  });
});

describe("유형·주소 이름", () => {
  it("주소 이름 규칙과 예약어", () => {
    for (const ok of ["a", "my-first-story", "2026-dive", "a1-b2"]) expect(validateSlug(ok), ok).toBeNull();
    for (const bad of ["", "A", "한글", "a_b", "a--b", "-a", "a-", "a b", "../x", "admin", "api", "new", "x".repeat(81)]) expect(validateSlug(bad), bad).not.toBeNull();
  });

  it("제목에서 주소 이름을 만든다 (한글만 있으면 비어서 호출자가 대체 이름을 쓴다)", () => {
    expect(slugFromTitle("My First Dive!")).toBe("my-first-dive");
    expect(slugFromTitle("  Hello,   World  ")).toBe("hello-world");
    expect(slugFromTitle("제주 바다")).toBe("");
    expect(slugFromTitle("Dive 2026 다이빙")).toBe("dive-2026");
    expect(slugFromTitle("a".repeat(100)).length).toBeLessThanOrEqual(60);
  });

  it("알려진 유형만 허용한다", () => {
    expect(isContentType("story")).toBe(true);
    expect(isContentType("constructor")).toBe(false);
    expect(isContentType("__proto__")).toBe(false);
    expect(isContentType("video")).toBe(false);
  });
});
