// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { TagField, splitTags } from "./TagField";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const input = (h: HTMLElement) => h.querySelector('input[name="tags"]') as HTMLInputElement;
const chips = (h: HTMLElement) => [...h.querySelectorAll("li button")] as HTMLButtonElement[];
const chip = (h: HTMLElement, name: string) => chips(h).find((b) => b.textContent === name)!;

function typeInto(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("태그 쉼표 나누기", () => {
  it("공백을 정리하고 빈 것·중복을 없앤다 (전각 쉼표도 쉼표로 본다)", () => {
    expect(splitTags(" 바다 ,기록,, 바다，  새  태그 ")).toEqual(["바다", "기록", "새 태그"]);
    expect(splitTags("")).toEqual([]);
  });
});

describe("태그 입력 (이미 있는 태그 고르기)", () => {
  it("처음 값을 그대로 보이고, 현재 태그는 눌린 상태의 칩으로 보인다", () => {
    const h = mount(<TagField id="t" name="tags" label="태그" defaultValue="바다, 기록" suggestions={["바다", "기록", "여행"]} />);
    expect(input(h).value).toBe("바다, 기록");
    expect(chips(h).map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "true", "false"]);
    expect(h.textContent).toContain("2/5개");
  });

  it("칩을 누르면 입력에 들어가고, 다시 누르면 빠진다. 직접 쓴 새 태그는 그대로 남는다", () => {
    const h = mount(<TagField id="t" name="tags" label="태그" defaultValue="내가쓴새태그" suggestions={["바다", "여행"]} />);
    act(() => chip(h, "여행").click());
    expect(input(h).value).toBe("내가쓴새태그, 여행");
    expect(chip(h, "여행").getAttribute("aria-pressed")).toBe("true");
    act(() => chip(h, "여행").click());
    expect(input(h).value).toBe("내가쓴새태그");
    expect(chip(h, "여행").getAttribute("aria-pressed")).toBe("false");
  });

  it("직접 입력하면 칩 상태와 개수가 따라가고, 5개를 넘으면 안내한다", () => {
    const h = mount(<TagField id="t" name="tags" label="태그" defaultValue="" suggestions={["바다"]} />);
    typeInto(input(h), "바다, a, b, c, d, e");
    expect(chip(h, "바다").getAttribute("aria-pressed")).toBe("true");
    expect(h.textContent).toContain("6/5개");
    expect(h.textContent).toContain("5개까지");
  });

  it("칩은 폼을 보내지 않는 버튼이고, 후보가 없으면 칩 영역이 없다. 라벨과 안내가 입력에 연결된다", () => {
    const h = mount(<TagField id="t" name="tags" label="태그 (쉼표로 구분)" defaultValue="" suggestions={[]} />);
    expect(h.querySelector("ul")).toBeNull();
    expect(h.querySelector('label[for="t"]')?.textContent).toContain("태그");
    expect(input(h).getAttribute("aria-describedby")).toBe("t-hint");
    const h2 = mount(<TagField id="u" name="tags" label="태그" defaultValue="" suggestions={["바다"]} />);
    expect(chips(h2)[0]!.type).toBe("button");
  });
});
