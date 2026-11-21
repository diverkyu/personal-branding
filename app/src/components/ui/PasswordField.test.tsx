// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { PasswordField } from "./PasswordField";

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

const input = (h: HTMLElement) => h.querySelector("input") as HTMLInputElement;
const toggle = (h: HTMLElement) => h.querySelector("button") as HTMLButtonElement;

function typeInto(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("비밀번호 입력 (보기 버튼)", () => {
  it("처음에는 가려져 있고, 버튼은 '비밀번호 보기'이며 눌리지 않은 상태다", () => {
    const h = mount(<PasswordField id="pw" name="password" label="비밀번호" autoComplete="current-password" required surface="light" />);
    expect(input(h).type).toBe("password");
    expect(toggle(h).type).toBe("button"); // 폼을 보내지 않는다
    expect(toggle(h).getAttribute("aria-label")).toBe("비밀번호 보기");
    expect(toggle(h).getAttribute("aria-pressed")).toBe("false");
  });

  it("누르면 글자가 보이고 이름·상태가 바뀌며, 다시 누르면 가려진다. 입력한 값은 그대로다", () => {
    const h = mount(<PasswordField id="pw" name="password" label="비밀번호" />);
    typeInto(input(h), "test-입력값-123");
    act(() => toggle(h).click());
    expect(input(h).type).toBe("text");
    expect(input(h).value).toBe("test-입력값-123");
    expect(toggle(h).getAttribute("aria-label")).toBe("비밀번호 숨기기");
    expect(toggle(h).getAttribute("aria-pressed")).toBe("true");
    act(() => toggle(h).click());
    expect(input(h).type).toBe("password");
    expect(input(h).value).toBe("test-입력값-123");
  });

  it("폼을 보내면 다시 가려지고, 이름·autocomplete·필수 표시는 유지된다", () => {
    const h = mount(
      <form>
        <PasswordField id="pw" name="password" label="비밀번호" autoComplete="new-password" required />
      </form>,
    );
    act(() => toggle(h).click());
    expect(input(h).type).toBe("text");
    act(() => {
      h.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(input(h).type).toBe("password");
    expect(input(h).name).toBe("password");
    expect(input(h).getAttribute("autocomplete")).toBe("new-password");
    expect(input(h).required).toBe(true);
    expect(h.textContent).toContain("(필수)");
  });

  it("라벨과 힌트·오류가 입력과 연결된다", () => {
    const h = mount(<PasswordField id="pw" name="password" label="새 비밀번호" hint="12자 이상" error="비밀번호가 너무 짧습니다." />);
    expect(h.querySelector('label[for="pw"]')?.textContent).toContain("새 비밀번호");
    expect(input(h).getAttribute("aria-invalid")).toBe("true");
    expect(input(h).getAttribute("aria-describedby")).toBe("pw-hint pw-error");
    expect(h.querySelector("#pw-error")?.textContent).toBe("비밀번호가 너무 짧습니다.");
  });
});
