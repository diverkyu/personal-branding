/**
 * 편집기(Tiptap) 확장 목록. 서버의 본문 검사기(content/body.ts)가 허용하는 것과 **같은 범위만** 켠다:
 * 문단·제목(2·3)·굵게·기울임·https 링크·목록·인용·구분선·줄바꿈·이미지(미디어 id)·영상(허용 도메인).
 * 코드·취소선·밑줄·제목 1단계 등은 끈다. 편집기의 제한은 편의일 뿐이고 보안 경계는 서버 검사기다.
 */
import { Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { safeHttpsUrl } from "@/content/body";
import { parseVideoUrl } from "@/lib/video";

/** 본문에 넣은 이미지. 파일 주소가 아니라 미디어 라이브러리의 id 만 저장한다 */
export const MediaImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      mediaId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-media-id"),
        renderHTML: (attrs) => (attrs.mediaId ? { "data-media-id": attrs.mediaId } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: "figure[data-media-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes({ "data-type": "image", class: "kyu-embed" }, HTMLAttributes), "이미지"];
  },
});

/** 본문에 넣은 영상 링크(YouTube·Vimeo). 누르기 전에는 외부에 아무것도 요청하지 않는다(공개 화면) */
export const VideoEmbed = Node.create({
  name: "video",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      url: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-url"),
        renderHTML: (attrs) => (attrs.url ? { "data-url": attrs.url } : {}),
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "figure[data-url]",
        // 허용 도메인이 아닌 주소는 붙여넣어도 영상으로 받지 않는다
        getAttrs: (el) => (typeof el === "string" ? false : parseVideoUrl(el.getAttribute("data-url") ?? "") ? null : false),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes({ "data-type": "video", class: "kyu-embed" }, HTMLAttributes), "영상"];
  },
});

export function buildExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      code: false,
      codeBlock: false,
      strike: false,
      underline: false,
      link: {
        openOnClick: false,
        autolink: false,
        linkOnPaste: false,
        protocols: ["https"],
        defaultProtocol: "https",
        // https 외 주소(javascript:, data:, http: 등)는 링크로 받지 않는다
        isAllowedUri: (url) => safeHttpsUrl(url) !== null,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      },
    }),
    MediaImage,
    VideoEmbed,
  ];
}
