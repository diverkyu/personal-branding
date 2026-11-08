import Link from "next/link";
import { notFound } from "next/navigation";
import { collectMediaIds, sanitizeBody } from "@/content/body";
import { ContentBody } from "@/content/ContentBody";
import { editableView, getContent } from "@/data/admin/contents";
import { adminDb } from "@/data/admin/dbServer";
import { getMediaByIds } from "@/data/admin/media";
import { requireAdmin } from "@/lib/auth/session";
import styles from "../../../../admin.module.css";

export const metadata = { title: "미리보기 · KYU 어드민", robots: { index: false, follow: false } };

/** 관리자만 볼 수 있는 미리보기. 수정 중인 내용이 있으면 그 내용을 보여 준다. 공개되지 않은 글도 여기서만 볼 수 있다 (SECURITY §6) */
export default async function ContentPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const db = adminDb();
  const row = await getContent(db, admin, id);
  if (!row) notFound();
  const view = editableView(row);
  const body = sanitizeBody(view.body);
  const media = body.ok ? await getMediaByIds(db, admin, collectMediaIds(body.doc)) : [];
  return (
    <>
      <p className={styles.alert} style={{ marginBottom: 16 }}>
        미리보기입니다. 공개되지 않은 화면이며, 공개 사이트에서는 사이트 디자인이 적용됩니다.{" "}
        <Link href={`/admin/contents/${row.id}`} className={styles.linkButton}>
          편집으로 돌아가기
        </Link>
      </p>
      <article className={styles.panel} style={{ maxWidth: 760 }}>
        <h1 className={styles.h1}>{view.title}</h1>
        {view.summary ? <p className={styles.note}>{view.summary}</p> : null}
        {view.tags.length > 0 ? <p className={styles.note}>{view.tags.map((t) => `#${t}`).join(" ")}</p> : null}
        {body.ok ? <ContentBody doc={body.doc} media={new Map(media.map((m) => [m.id, m]))} /> : <p className={styles.alert}>본문을 읽을 수 없습니다.</p>}
        {view.answers.length > 0 ? (
          <>
            <h2 className={styles.h2}>이 글이 답하는 질문</h2>
            <ul style={{ paddingLeft: 18, fontSize: 15 }}>
              {view.answers.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </>
        ) : null}
      </article>
    </>
  );
}
