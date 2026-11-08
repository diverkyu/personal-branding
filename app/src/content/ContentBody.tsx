import type { ReactNode } from "react";
import { VideoPlayer } from "@/components/site/VideoPlayer";
import type { BlockNode, BodyDoc, InlineNode, ListItem, Mark } from "./body";
import styles from "./ContentBody.module.css";

/**
 * 본문 문서(JSON)를 React 요소로 렌더링한다 (미리보기·공개 화면 공용). HTML 문자열을 만들지 않으므로
 * 글자는 항상 이스케이프되고, 링크는 검사기가 https 만 통과시킨 값이다 (ADMIN-DESIGN §6).
 */
export interface BodyMedia {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
}

function wrap(children: ReactNode, marks: Mark[] | undefined, key: string): ReactNode {
  let node = children;
  for (const m of marks ?? []) {
    if (m.type === "bold") node = <strong key={key + "b"}>{node}</strong>;
    else if (m.type === "italic") node = <em key={key + "i"}>{node}</em>;
  }
  const link = (marks ?? []).find((m) => m.type === "link");
  if (link && link.type === "link") {
    node = (
      <a key={key + "a"} href={link.attrs.href} target="_blank" rel="noopener noreferrer nofollow">
        {node}
      </a>
    );
  }
  return node;
}

function Inline({ nodes }: { nodes: InlineNode[] | undefined }) {
  return (
    <>
      {(nodes ?? []).map((n, i) => (n.type === "hardBreak" ? <br key={i} /> : <span key={i} style={{ display: "contents" }}>{wrap(n.text, n.marks, String(i))}</span>))}
    </>
  );
}

function Items({ items, media }: { items: ListItem[]; media: Map<string, BodyMedia> }) {
  return (
    <>
      {items.map((li, i) => (
        <li key={i}>
          <Blocks blocks={li.content} media={media} />
        </li>
      ))}
    </>
  );
}

function Blocks({ blocks, media }: { blocks: BlockNode[]; media: Map<string, BodyMedia> }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "paragraph":
            return (
              <p key={i}>
                <Inline nodes={b.content} />
              </p>
            );
          case "heading":
            return b.attrs.level === 2 ? (
              <h2 key={i}>
                <Inline nodes={b.content} />
              </h2>
            ) : (
              <h3 key={i}>
                <Inline nodes={b.content} />
              </h3>
            );
          case "bulletList":
            return (
              <ul key={i}>
                <Items items={b.content} media={media} />
              </ul>
            );
          case "orderedList":
            return (
              <ol key={i}>
                <Items items={b.content} media={media} />
              </ol>
            );
          case "blockquote":
            return (
              <blockquote key={i}>
                <Blocks blocks={b.content} media={media} />
              </blockquote>
            );
          case "horizontalRule":
            return <hr key={i} />;
          case "image": {
            const m = media.get(b.attrs.mediaId);
            if (!m) return null; // 삭제된 이미지는 깨진 그림 대신 건너뛴다
            return (
              <figure key={i} className={styles.figure}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.alt} width={m.width} height={m.height} loading="lazy" />
              </figure>
            );
          }
          case "video":
            return (
              <figure key={i} className={styles.figure}>
                <VideoPlayer url={b.attrs.url} title="영상" />
              </figure>
            );
        }
      })}
    </>
  );
}

export function ContentBody({ doc, media }: { doc: BodyDoc; media: Map<string, BodyMedia> }) {
  return (
    <div className={styles.body}>
      <Blocks blocks={doc.content} media={media} />
    </div>
  );
}
