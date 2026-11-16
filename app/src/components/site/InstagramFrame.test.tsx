// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { InstagramFrame } from "./InstagramFrame";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let host: HTMLDivElement | undefined;

beforeAll(() => {
  // jsdom 은 iframe 의 contentWindow 를 만들지만 origin 이 다르다 — 시험에서는 source 를 직접 지정해 보낸다
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
});

function mount() {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(<InstagramFrame src="https://www.instagram.com/reel/DfyQydRMWBw/embed/" title="작품" />));
  const frame = host.querySelector("iframe") as HTMLIFrameElement;
  return { frame, host };
}

function post(frame: HTMLIFrameElement, data: unknown, origin = "https://www.instagram.com", source: Window | null = frame.contentWindow) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data, origin, source }));
  });
}

describe("InstagramFrame", () => {
  it("공식 임베드 주소와 팝업을 허용한 sandbox 로 열리고, 불러오는 동안 안내 문구가 보인다", () => {
    const { frame, host } = mount();
    expect(frame.getAttribute("src")).toBe("https://www.instagram.com/reel/DfyQydRMWBw/embed/");
    expect(frame.getAttribute("sandbox")).toContain("allow-popups");
    expect(frame.getAttribute("sandbox")).not.toContain("allow-top-navigation");
    expect(host.textContent).toContain("불러오는 중");
  });

  it("Instagram 이 이 iframe 에서 보낸 크기 알림(MEASURE)으로 높이를 맞추고, 실제 높이가 오면 안내 문구를 지운다 (JSON 문자열·객체 모두)", () => {
    const { frame, host } = mount();
    post(frame, JSON.stringify({ type: "MEASURE", details: { height: 120 } }));
    expect(host.textContent).toContain("불러오는 중"); // 처음의 작은 높이는 내용이 올라온 것이 아니다
    post(frame, JSON.stringify({ type: "MOUNTED", details: {} }));
    expect(host.textContent).toContain("불러오는 중"); // MOUNTED 는 그리기 전에 먼저 온다
    post(frame, JSON.stringify({ type: "MEASURE", details: { height: 665 } }));
    expect(frame.style.height).toBe("665px");
    expect(host.textContent).not.toContain("불러오는 중");
    post(frame, { type: "MEASURE", details: { height: 700 } });
    expect(frame.style.height).toBe("700px");
  });

  it("높이는 범위 안으로 제한하고, 숫자가 아니거나 깨진 알림은 무시한다", () => {
    const { frame } = mount();
    post(frame, { type: "MEASURE", details: { height: 99999 } });
    expect(frame.style.height).toBe("1400px");
    post(frame, { type: "MEASURE", details: { height: 10 } });
    expect(frame.style.height).toBe("320px");
    post(frame, { type: "MEASURE", details: { height: "800" } });
    post(frame, "not json");
    post(frame, null);
    expect(frame.style.height).toBe("320px");
  });

  it("끝내 내용이 오지 않아도 15초 뒤에는 안내 문구를 걷는다", () => {
    vi.useFakeTimers();
    try {
      const { host } = mount();
      expect(host.textContent).toContain("불러오는 중");
      act(() => {
        vi.advanceTimersByTime(15_000);
      });
      expect(host.textContent).not.toContain("불러오는 중");
    } finally {
      vi.useRealTimers();
    }
  });

  it("다른 출처이거나 다른 창에서 온 알림은 무시한다", () => {
    const { frame } = mount();
    post(frame, { type: "MEASURE", details: { height: 900 } }, "https://evil.example");
    post(frame, { type: "MEASURE", details: { height: 900 } }, "https://www.instagram.com", window);
    expect(frame.style.height).toBe("640px");
  });
});
