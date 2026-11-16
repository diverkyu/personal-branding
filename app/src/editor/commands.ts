import type { Editor } from "@tiptap/core";

/**
 * 이미지·영상 같은 블록을 **지금 선택한 곳의 바로 뒤**에 넣는다. 선택한 글자나 이미 선택된 이미지·영상을 덮어쓰지 않는다
 * (그냥 insertContent 를 쓰면 선택된 것이 교체된다). 넣은 뒤에도 이어서 쓸 수 있게 빈 문단을 하나 둔다.
 * 문단 한가운데에 넣으면 문단이 둘로 나뉘고 그 사이에 들어간다.
 */
export function insertBlockAfterSelection(editor: Editor, node: Record<string, unknown>): void {
  editor
    .chain()
    .focus()
    .insertContentAt(editor.state.selection.to, [node, { type: "paragraph" }])
    .run();
}

/** 커서가 표 안에 있으면 그 표의 줄·칸 수를, 아니면 null (표 도구 막대와 상한 안내에 쓴다) */
export function tableShape(editor: Editor): { rows: number; cols: number } | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === "table") return { rows: node.childCount, cols: node.firstChild?.childCount ?? 0 };
  }
  return null;
}
