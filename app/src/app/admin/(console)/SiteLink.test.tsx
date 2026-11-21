// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { SiteLink } from "./SiteLink";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
});

describe("어드민의 사이트 보기 링크", () => {
  it("사이트 첫 화면(/)을 새 탭으로 열고, 보조기기에 새 탭임을 알리며, 어드민 창을 건드리지 못하게 한다", () => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root!.render(<SiteLink />));
    const a = host.querySelector("a")!;
    expect(a.getAttribute("href")).toBe("/");
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toBe("noopener noreferrer");
    expect(a.getAttribute("aria-label")).toBe("사이트 보기 (새 탭)");
    expect(a.textContent).toContain("사이트 보기"); // 보이는 글자가 이름에 들어 있다
  });
});
