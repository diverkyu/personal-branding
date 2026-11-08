"use client";

import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, useEditorState, type NodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { safeHttpsUrl } from "@/content/body";
import { parseVideoUrl } from "@/lib/video";
import styles from "./RichEditor.module.css";
import { insertBlockAfterSelection } from "./commands";
import { MediaImage, VideoEmbed, buildExtensions } from "./extensions";

export interface PickerMedia {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
}

/** 편집기 안에서 이미지·영상 자리에 실제 모습을 보여 준다 (저장되는 값은 id·주소뿐) */
function makeViews(mediaById: Map<string, PickerMedia>) {
  function ImageView({ node, selected }: NodeViewProps) {
    const media = mediaById.get(String(node.attrs.mediaId));
    return (
      <NodeViewWrapper className={styles.embed} data-selected={selected ? "true" : undefined} contentEditable={false}>
        {media ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.url} alt={media.alt} width={media.width} height={media.height} className={styles.embedImg} />
        ) : (
          <span className={styles.embedMissing}>이미지를 찾을 수 없습니다 (삭제되었을 수 있습니다)</span>
        )}
        {media && !media.alt ? <span className={styles.embedWarn}>대체 텍스트 없음 — 발행 전에 미디어에서 입력해 주세요</span> : null}
      </NodeViewWrapper>
    );
  }
  function VideoView({ node, selected }: NodeViewProps) {
    return (
      <NodeViewWrapper className={styles.embed} data-selected={selected ? "true" : undefined} contentEditable={false}>
        <span className={styles.embedVideo}>영상 · {String(node.attrs.url)}</span>
      </NodeViewWrapper>
    );
  }
  return {
    image: MediaImage.extend({ addNodeView: () => ReactNodeViewRenderer(ImageView) }),
    video: VideoEmbed.extend({ addNodeView: () => ReactNodeViewRenderer(VideoView) }),
  };
}

type Panel = null | "link" | "image" | "video";

/**
 * 본문 편집기. 값은 숨은 입력(name="bodyJson")에 JSON 으로 담겨 폼과 함께 서버로 간다 — 서버가 다시 검사한다.
 * 저장하지 않은 변경이 있으면 창을 닫기 전에 확인한다 (ADMIN-DESIGN §7).
 */
export function RichEditor({ initial, media, name = "bodyJson", resetKey, onDirty }: { initial: unknown; media: PickerMedia[]; name?: string; /** 값이 바뀌면(저장 성공 뒤 새 version) 변경 표시를 지운다 */ resetKey?: number; onDirty?: (dirty: boolean) => void }) {
  const mediaById = useMemo(() => new Map(media.map((m) => [m.id, m])), [media]);
  const extensions = useMemo(() => {
    const base = buildExtensions().filter((e) => e.name !== "image" && e.name !== "video");
    const views = makeViews(mediaById);
    return [...base, views.image, views.video];
  }, [mediaById]);
  const [json, setJson] = useState(() => JSON.stringify(initial));
  const [panel, setPanel] = useState<Panel>(null);
  const [linkValue, setLinkValue] = useState("");
  const [videoValue, setVideoValue] = useState("");
  const [message, setMessage] = useState("");
  const dirty = useRef(false);

  const editor = useEditor({
    extensions,
    content: initial as never,
    immediatelyRender: false,
    editorProps: { attributes: { class: styles.content ?? "", role: "textbox", "aria-multiline": "true", "aria-label": "본문" } },
    onUpdate({ editor: e }) {
      setJson(JSON.stringify(e.getJSON()));
      if (!dirty.current) {
        dirty.current = true;
        onDirty?.(true);
      }
    },
  });

  useEffect(() => {
    dirty.current = false;
    onDirty?.(false);
  }, [resetKey, onDirty]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const toolState = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      h2: e?.isActive("heading", { level: 2 }) ?? false,
      h3: e?.isActive("heading", { level: 3 }) ?? false,
      bullet: e?.isActive("bulletList") ?? false,
      ordered: e?.isActive("orderedList") ?? false,
      quote: e?.isActive("blockquote") ?? false,
      link: e?.isActive("link") ?? false,
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
    }),
  });

  const togglePanel = useCallback(
    (next: Exclude<Panel, null>) => {
      setMessage("");
      if (next === "link" && editor) setLinkValue(String(editor.getAttributes("link").href ?? ""));
      setPanel((p) => (p === next ? null : next));
    },
    [editor],
  );

  if (!editor) return <div className={styles.loading}>편집기를 불러오는 중입니다…</div>;
  // 편집기가 준비되기 전에는 위에서 이미 돌아갔으므로 여기서는 값이 있다
  const state = toolState ?? { bold: false, italic: false, h2: false, h3: false, bullet: false, ordered: false, quote: false, link: false, canUndo: false, canRedo: false };

  const btn = (label: string, active: boolean, onClick: () => void, extra?: { disabled?: boolean; text?: string }) => (
    <button type="button" className={styles.tool} aria-pressed={active} aria-label={label} title={label} onClick={onClick} disabled={extra?.disabled}>
      {extra?.text ?? label}
    </button>
  );

  const applyLink = () => {
    const href = safeHttpsUrl(linkValue);
    if (!href) {
      setMessage("링크는 https:// 로 시작하는 주소만 쓸 수 있습니다.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setPanel(null);
    setMessage("");
  };

  const applyVideo = () => {
    const source = parseVideoUrl(videoValue.trim());
    if (!source) {
      setMessage("영상은 YouTube·Vimeo 주소만 넣을 수 있습니다.");
      return;
    }
    insertBlockAfterSelection(editor, { type: "video", attrs: { url: videoValue.trim() } });
    setVideoValue("");
    setPanel(null);
    setMessage("");
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar} role="toolbar" aria-label="본문 서식">
        {btn("제목 (큰)", state.h2, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), { text: "제목" })}
        {btn("소제목", state.h3, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), { text: "소제목" })}
        {btn("굵게", state.bold, () => editor.chain().focus().toggleBold().run(), { text: "굵게" })}
        {btn("기울임", state.italic, () => editor.chain().focus().toggleItalic().run(), { text: "기울임" })}
        {btn("링크", state.link, () => togglePanel("link"), { text: "링크" })}
        {btn("목록", state.bullet, () => editor.chain().focus().toggleBulletList().run(), { text: "목록" })}
        {btn("번호 목록", state.ordered, () => editor.chain().focus().toggleOrderedList().run(), { text: "번호" })}
        {btn("인용", state.quote, () => editor.chain().focus().toggleBlockquote().run(), { text: "인용" })}
        {btn("구분선", false, () => editor.chain().focus().setHorizontalRule().run(), { text: "구분선" })}
        {btn("이미지 넣기", panel === "image", () => togglePanel("image"), { text: "이미지" })}
        {btn("영상 넣기", panel === "video", () => togglePanel("video"), { text: "영상" })}
        {btn("되돌리기", false, () => editor.chain().focus().undo().run(), { disabled: !state.canUndo, text: "↶" })}
        {btn("다시 하기", false, () => editor.chain().focus().redo().run(), { disabled: !state.canRedo, text: "↷" })}
      </div>

      {panel === "link" ? (
        <div className={styles.panel} role="group" aria-label="링크">
          <label htmlFor="editor-link" className={styles.panelLabel}>
            링크 주소 (https://)
          </label>
          <input id="editor-link" type="url" value={linkValue} onChange={(e) => setLinkValue(e.target.value)} className={styles.input} placeholder="https://example.com" />
          <div className={styles.panelRow}>
            <button type="button" className={styles.apply} onClick={applyLink}>
              적용
            </button>
            {state.link ? (
              <button
                type="button"
                className={styles.plain}
                onClick={() => {
                  editor.chain().focus().extendMarkRange("link").unsetLink().run();
                  setPanel(null);
                }}
              >
                링크 지우기
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {panel === "video" ? (
        <div className={styles.panel} role="group" aria-label="영상">
          <label htmlFor="editor-video" className={styles.panelLabel}>
            영상 주소 (YouTube 또는 Vimeo)
          </label>
          <input id="editor-video" type="url" value={videoValue} onChange={(e) => setVideoValue(e.target.value)} className={styles.input} placeholder="https://www.youtube.com/watch?v=..." />
          <button type="button" className={styles.apply} onClick={applyVideo}>
            넣기
          </button>
        </div>
      ) : null}

      {panel === "image" ? (
        <div className={styles.panel} role="group" aria-label="이미지 고르기">
          {media.length === 0 ? (
            <p className={styles.hint}>미디어 라이브러리에 이미지가 없습니다. 어드민 &gt; 미디어에서 먼저 올려 주세요.</p>
          ) : (
            <ul className={styles.pickGrid}>
              {media.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className={styles.pick}
                    onClick={() => {
                      insertBlockAfterSelection(editor, { type: "image", attrs: { mediaId: m.id } });
                      setPanel(null);
                    }}
                    aria-label={m.alt ? `이미지 넣기: ${m.alt}` : "이미지 넣기 (대체 텍스트 없음)"}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt="" width={m.width} height={m.height} loading="lazy" />
                    {!m.alt ? <span className={styles.pickWarn}>대체 텍스트 없음</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {message ? (
        <p role="alert" className={styles.error}>
          {message}
        </p>
      ) : null}

      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={json} />
    </div>
  );
}
