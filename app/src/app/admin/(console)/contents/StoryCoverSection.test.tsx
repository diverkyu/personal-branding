// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { PickerMedia } from "@/editor/RichEditor";
import { StoryCoverSection } from "./StoryCoverSection";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const m = (id: string, alt: string): PickerMedia => ({ id, url: `/media-dev/${id}.webp`, alt, width: 800, height: 600 });
const A = m("a", "바다 사진");
const B = m("b", "");

let root: Root | undefined;
let host: HTMLDivElement | undefined;
function mount(node: React.ReactElement) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(node));
  return host;
}
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
});

const value = (h: HTMLElement) => (h.querySelector('input[name="f_cover"]') as HTMLInputElement).value;
const buttons = (h: HTMLElement) => [...h.querySelectorAll("button")];

describe("스토리 대표 이미지 선택", () => {
  it("본문에 이미지가 없으면 안내만 보이고 값은 비어 있다", () => {
    const h = mount(<StoryCoverSection images={[]} initial="" />);
    expect(h.textContent).toContain("본문에 이미지를 넣으면");
    expect(buttons(h)).toHaveLength(0);
    expect(value(h)).toBe("");
  });

  it("고르지 않았으면 첫 이미지가 대표로 선택되어 보이고 그 값이 저장된다", () => {
    const h = mount(<StoryCoverSection images={[A, B]} initial="" />);
    expect(buttons(h).map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "false"]);
    expect(value(h)).toBe("a");
  });

  it("눌러서 대표를 바꾸면 표시와 값이 함께 바뀐다", () => {
    const h = mount(<StoryCoverSection images={[A, B]} initial="a" />);
    act(() => buttons(h)[1]!.click());
    expect(buttons(h).map((b) => b.getAttribute("aria-pressed"))).toEqual(["false", "true"]);
    expect(value(h)).toBe("b");
  });

  it("대표로 정해 둔 이미지가 본문에서 빠지면 첫 이미지로 돌아간다", () => {
    const h = mount(<StoryCoverSection images={[A]} initial="b" />);
    expect(value(h)).toBe("a");
  });

  it("대체 텍스트가 없는 이미지는 버튼 이름에 그 사실이 드러난다", () => {
    const h = mount(<StoryCoverSection images={[A, B]} initial="a" />);
    expect(buttons(h)[0]!.getAttribute("aria-label")).toContain("바다 사진");
    expect(buttons(h)[1]!.getAttribute("aria-label")).toContain("대체 텍스트 없는");
  });
});
