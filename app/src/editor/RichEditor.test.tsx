// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom 에는 화면 배치 계산이 없어 ProseMirror 의 "커서로 스크롤"이 실패한다 — 빈 값으로 대신한다
const emptyRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as unknown as DOMRectList;
const emptyRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) }) as DOMRect;
for (const proto of [Element.prototype, Range.prototype] as { getClientRects?: () => DOMRectList; getBoundingClientRect?: () => DOMRect }[]) {
  proto.getClientRects ??= emptyRects;
  proto.getBoundingClientRect ??= emptyRect;
}

const upload = vi.fn();
vi.mock("@/app/admin/mediaActions", () => ({ uploadEditorImageAction: (form: FormData) => upload(form) }));

import { RichEditor } from "./RichEditor";

const UUID = "123e4567-e89b-42d3-a456-426614174000";
let root: Root | undefined;
let host: HTMLDivElement | undefined;

beforeEach(() => {
  upload.mockReset();
});
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
});

async function mount() {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(<RichEditor initial={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "본문" }] }] }} media={[]} />);
  });
  return host;
}

const button = (host: HTMLElement, label: string) => [...host.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === label || b.textContent?.trim() === label) as HTMLButtonElement | undefined;
const bodyJson = (host: HTMLElement) => (host.querySelector('input[name="bodyJson"]') as HTMLInputElement).value;

function chooseFile(host: HTMLElement, name = "a.png") {
  const input = host.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([new Uint8Array([1, 2, 3])], name, { type: "image/png" });
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  return file;
}

function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("본문 편집기: 이미지 바로 올리기", () => {
  it("이미지 칸에 파일 올리기와 라이브러리 고르기가 함께 있다", async () => {
    const h = await mount();
    act(() => button(h, "이미지 넣기")?.click());
    expect(h.textContent).toContain("새 이미지 올리기");
    expect(h.textContent).toContain("이미 올린 이미지에서 고르기");
    expect(h.querySelector('input[type="file"]')).not.toBeNull();
  });

  it("파일과 대체 텍스트를 올리면 서버 액션을 부르고, 돌려받은 이미지가 본문에 들어간다", async () => {
    upload.mockResolvedValue({ ok: true, media: { id: UUID, url: "/media-dev/x.webp", alt: "수면 위", width: 64, height: 48 } });
    const h = await mount();
    act(() => button(h, "이미지 넣기")?.click());
    const file = chooseFile(h);
    typeInto(h.querySelector("#editor-image-alt") as HTMLInputElement, "  수면 위  ");
    await act(async () => {
      button(h, "올리고 넣기")?.click();
    });
    expect(upload).toHaveBeenCalledTimes(1);
    const form = upload.mock.calls[0]?.[0] as FormData;
    expect((form.get("file") as File).name).toBe(file.name);
    expect(form.get("alt")).toBe("수면 위");
    expect(JSON.parse(bodyJson(h))).toMatchObject({ content: expect.arrayContaining([{ type: "image", attrs: { mediaId: UUID } }]) });
    expect(h.textContent).toContain("이미지를 올리고 본문에 넣었습니다");
    expect(h.querySelector("img[src='/media-dev/x.webp']")).not.toBeNull(); // 편집기 안에 그림이 보인다
  });

  it("올리기에 실패하면 오류 문구를 보이고 본문은 그대로다", async () => {
    upload.mockResolvedValue({ ok: false, error: "이미지 저장소가 아직 연결되지 않았습니다." });
    const h = await mount();
    const before = bodyJson(h);
    act(() => button(h, "이미지 넣기")?.click());
    chooseFile(h);
    await act(async () => {
      button(h, "올리고 넣기")?.click();
    });
    expect(h.querySelector('[role="alert"]')?.textContent).toContain("저장소가 아직 연결되지 않았습니다");
    expect(bodyJson(h)).toBe(before);
  });

  it("파일을 고르지 않으면 서버를 부르지 않고 안내한다", async () => {
    const h = await mount();
    act(() => button(h, "이미지 넣기")?.click());
    await act(async () => {
      button(h, "올리고 넣기")?.click();
    });
    expect(upload).not.toHaveBeenCalled();
    expect(h.querySelector('[role="alert"]')?.textContent).toContain("먼저 골라");
  });

  it("대체 텍스트 칸에서 Enter 를 눌러도 바깥 글 저장 폼이 제출되지 않는다", async () => {
    upload.mockResolvedValue({ ok: true, media: { id: UUID, url: "/media-dev/x.webp", alt: "", width: 64, height: 48 } });
    const h = await mount();
    act(() => button(h, "이미지 넣기")?.click());
    chooseFile(h);
    const alt = h.querySelector("#editor-image-alt") as HTMLInputElement;
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    await act(async () => {
      alt.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(h.textContent).toContain("대체 텍스트가 비어 있어");
  });
});

describe("본문 편집기: 복사 상자와 표 도구", () => {
  it("도구 막대에 복사 상자와 표 버튼이 있고, 표를 넣으면 표 편집 도구 막대가 나타난다", async () => {
    const h = await mount();
    expect(button(h, "복사 상자 (프롬프트처럼 그대로 복사해 쓰는 글)")).toBeDefined();
    expect(h.querySelector('[aria-label="표 편집"]')).toBeNull();
    await act(async () => {
      button(h, "표 넣기 (3줄 × 3칸, 첫 줄은 제목 줄)")?.click();
    });
    const types = JSON.stringify(JSON.parse(bodyJson(h)));
    expect(types).toContain('"type":"table"');
    expect(types).toContain('"type":"tableHeader"');
    const bar = h.querySelector('[aria-label="표 편집"]');
    expect(bar?.textContent).toContain("표 3줄 × 3칸");
    expect(bar?.textContent).toContain("최대 40줄 × 6칸");
  });

  it("표의 칸·줄 추가는 상한에서 막히고, 표 지우기는 표를 없앤다", async () => {
    const h = await mount();
    await act(async () => {
      button(h, "표 넣기 (3줄 × 3칸, 첫 줄은 제목 줄)")?.click();
    });
    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        button(h, "칸 추가 (오른쪽)")?.click();
      });
    }
    expect(h.querySelector('[aria-label="표 편집"]')?.textContent).toContain("표 3줄 × 6칸");
    expect(button(h, "칸 추가 (오른쪽)")?.disabled).toBe(true);
    await act(async () => {
      button(h, "표 지우기")?.click();
    });
    expect(bodyJson(h)).not.toContain('"table"');
    expect(h.querySelector('[aria-label="표 편집"]')).toBeNull();
  });

  it("복사 상자 버튼은 문단을 복사 상자로 바꾸고 다시 누르면 문단으로 돌린다", async () => {
    const h = await mount();
    await act(async () => {
      button(h, "복사 상자 (프롬프트처럼 그대로 복사해 쓰는 글)")?.click();
    });
    expect(bodyJson(h)).toContain('"codeBlock"');
    await act(async () => {
      button(h, "복사 상자 (프롬프트처럼 그대로 복사해 쓰는 글)")?.click();
    });
    expect(bodyJson(h)).not.toContain('"codeBlock"');
  });
});
