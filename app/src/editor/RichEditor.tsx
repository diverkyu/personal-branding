"use client";

import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, useEditorState, type NodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadEditorImageAction } from "@/app/admin/mediaActions";
import { safeHttpsUrl } from "@/content/body";
import { downscaleIfLarge } from "@/media/clientDownscale";
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
function makeViews(lookup: (id: string) => PickerMedia | undefined) {
  function ImageView({ node, selected }: NodeViewProps) {
    const media = lookup(String(node.attrs.mediaId));
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
  // 편집기 안에서 바로 올린 이미지: 편집기를 다시 만들지 않고도 그림이 보이도록 바뀌지 않는 Map 에 담아 둔다
  const [uploadedById] = useState(() => new Map<string, PickerMedia>());
  const [uploaded, setUploaded] = useState<PickerMedia[]>([]);
  const extensions = useMemo(() => {
    const base = buildExtensions().filter((e) => e.name !== "image" && e.name !== "video");
    const views = makeViews((id) => mediaById.get(id) ?? uploadedById.get(id));
    return [...base, views.image, views.video];
  }, [mediaById, uploadedById]);
  const [json, setJson] = useState(() => JSON.stringify(initial));
  const [panel, setPanel] = useState<Panel>(null);
  const [linkValue, setLinkValue] = useState("");
  const [videoValue, setVideoValue] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
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

  /** 고른 파일을 서버에 올리고(큰 사진은 브라우저에서 먼저 줄인다) 그 자리에서 본문에 넣는다 */
  const uploadAndInsert = async () => {
    const file = fileInput.current?.files?.[0];
    if (!file) {
      setMessage("올릴 이미지를 먼저 골라 주세요.");
      return;
    }
    setUploading(true);
    setMessage("");
    setNotice("");
    try {
      const form = new FormData();
      form.set("file", await downscaleIfLarge(file));
      form.set("alt", uploadAlt.trim());
      const result = await uploadEditorImageAction(form);
      if (!result.ok || !result.media) {
        setMessage(result.error ?? "올리지 못했습니다. 잠시 뒤에 다시 시도해 주세요.");
        return;
      }
      uploadedById.set(result.media.id, result.media);
      setUploaded((prev) => [result.media as PickerMedia, ...prev]);
      insertBlockAfterSelection(editor, { type: "image", attrs: { mediaId: result.media.id } });
      if (fileInput.current) fileInput.current.value = "";
      setUploadAlt("");
      setPanel(null);
      setNotice(result.media.alt ? "이미지를 올리고 본문에 넣었습니다." : "이미지를 올리고 본문에 넣었습니다. 대체 텍스트가 비어 있어 발행 전에 어드민 > 미디어에서 입력해 주세요.");
    } catch {
      setMessage("올리지 못했습니다. 잠시 뒤에 다시 시도해 주세요.");
    } finally {
      setUploading(false);
    }
  };

  const allMedia = [...uploaded, ...media];

  const applyVideo = () => {
    const source = parseVideoUrl(videoValue.trim());
    if (!source) {
      setMessage("영상은 YouTube·Vimeo·Instagram 주소만 넣을 수 있습니다.");
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
            영상 주소 (YouTube·Vimeo·Instagram)
          </label>
          <input id="editor-video" type="url" value={videoValue} onChange={(e) => setVideoValue(e.target.value)} className={styles.input} placeholder="https://www.youtube.com/watch?v=..." />
          <button type="button" className={styles.apply} onClick={applyVideo}>
            넣기
          </button>
        </div>
      ) : null}

      {panel === "image" ? (
        <div className={styles.panel} role="group" aria-label="이미지 넣기">
          <p className={styles.panelLabel}>새 이미지 올리기 (JPEG, PNG, WebP, AVIF · 4MB 이하, 큰 사진은 자동으로 줄입니다)</p>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" aria-label="올릴 이미지 파일" className={styles.input} disabled={uploading} />
          <label htmlFor="editor-image-alt" className={styles.panelLabel}>
            대체 텍스트 (그림을 보지 못하는 사람에게 읽어 주는 설명 · 비워 두면 나중에 입력할 수 있지만 발행 전에 필요합니다)
          </label>
          <input
            id="editor-image-alt"
            type="text"
            value={uploadAlt}
            maxLength={200}
            onChange={(e) => setUploadAlt(e.target.value)}
            onKeyDown={(e) => {
              // 이 입력칸에서 Enter 는 글 저장이 아니라 올리기다
              if (e.key === "Enter") {
                e.preventDefault();
                void uploadAndInsert();
              }
            }}
            className={styles.input}
            placeholder="예: 수면 아래에서 올려다본 햇빛"
            disabled={uploading}
          />
          <div className={styles.panelRow}>
            <button type="button" className={styles.apply} onClick={() => void uploadAndInsert()} disabled={uploading}>
              {uploading ? "올리는 중…" : "올리고 넣기"}
            </button>
          </div>
          <p className={styles.panelLabel}>또는 이미 올린 이미지에서 고르기</p>
          {allMedia.length === 0 ? (
            <p className={styles.hint}>아직 올린 이미지가 없습니다.</p>
          ) : (
            <ul className={styles.pickGrid}>
              {allMedia.map((m) => (
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
      {notice ? (
        <p role="status" className={styles.hint}>
          {notice}
        </p>
      ) : null}

      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={json} />
    </div>
  );
}
