// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/app/freediving/tours/[slug]/actions", () => ({ submitReservation: async () => ({ status: "idle" }), submitNotice: async () => ({ status: "idle" }) }));

import { NoticeForm, ReservationForm } from "./TourForms";

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

describe("신청 폼의 동의 문구와 처리방침 링크", () => {
  for (const [name, form, checkboxId] of [
    ["예약 문의", <ReservationForm key="r" slug="sample" consent={{ version: "v2", text: "개인정보 수집·이용에 동의합니다. (시험 문구)" }} />, "inq-consent"],
    ["소식 받기", <NoticeForm key="n" slug="sample" consent={{ version: "v2", text: "소식 안내를 위한 수집에 동의합니다. (시험 문구)" }} />, "notify-consent"],
  ] as const) {
    it(`${name}: 동의 문구 뒤에 처리방침 전문 링크가 새 탭으로 열리고, 문구와 버전은 그대로다`, () => {
      const h = mount(form);
      const label = h.querySelector(`label[for="${checkboxId}"]`)!;
      expect(label.textContent).toContain("시험 문구");
      const link = label.querySelector("a")!;
      expect(link.getAttribute("href")).toBe("/privacy");
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
      expect(link.textContent).toContain("개인정보 처리방침 전문 보기");
      expect(link.getAttribute("aria-label")).toBe("개인정보 처리방침 전문 보기 (새 탭)"); // 보조기기에 새 탭으로 열린다고 알린다 (화면 글자가 이름에 포함됨)
      expect((h.querySelector('input[name="consentVersion"]') as HTMLInputElement).value).toBe("v2");
    });
  }
});
