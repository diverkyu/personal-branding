import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReadinessItem } from "@/lib/readiness";
import { ReadinessCard } from "./ReadinessCard";

const todo: ReadinessItem = { id: "privacy", label: "개인정보 처리방침", status: "todo", detail: "아직 준비 중 화면입니다.", href: "/admin/legal", where: "admin" };
const ok: ReadinessItem = { id: "cron", label: "예약 발행", status: "ok", detail: "동작합니다.", where: "vercel" };
const info: ReadinessItem = { id: "domain", label: "사이트 주소", status: "info", detail: "임시 주소입니다.", where: "domain" };

describe("ReadinessCard", () => {
  it("해야 할 일이 있으면 펼쳐 두고 개수를 글자로 알린다", () => {
    const out = renderToStaticMarkup(<ReadinessCard items={[todo, ok, info]} />);
    expect(out).toMatch(/<details[^>]*open/);
    expect(out).toContain("해야 할 일 1개");
    expect(out).toContain("개인정보 처리방침");
    expect(out).toContain('href="/admin/legal"');
  });

  it("상태는 색이 아니라 글자(해야 할 일·완료·참고)로 나온다", () => {
    const out = renderToStaticMarkup(<ReadinessCard items={[todo, ok, info]} />);
    for (const t of ["해야 할 일", "완료", "참고"]) expect(out).toContain(t);
  });

  it("모두 끝나면 접혀 있고 '모두 확인됨'이 보이며, 링크 없는 항목에는 열기 링크가 없다", () => {
    const out = renderToStaticMarkup(<ReadinessCard items={[ok, info]} />);
    expect(out).not.toMatch(/<details[^>]*open/);
    expect(out).toContain("모두 확인됨");
    expect(out).not.toContain("열기");
  });
});
