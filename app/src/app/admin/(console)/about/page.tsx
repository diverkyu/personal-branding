import Link from "next/link";
import { EMPTY_BODY } from "@/content/body";
import { getAbout } from "@/data/admin/about";
import { adminDb } from "@/data/admin/dbServer";
import { listMediaForPicker } from "@/data/admin/media";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTimeKst } from "@/lib/format";
import { discardAboutAction, publishAboutAction, unpublishAboutAction } from "../../aboutActions";
import styles from "../../admin.module.css";
import { AboutForm } from "./AboutForm";

export const metadata = { title: "About · KYU 어드민" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

const DONE: Record<string, string> = {
  published: "공개 화면에 반영했습니다.",
  discarded: "수정 내용을 버렸습니다. 공개 중인 내용은 그대로입니다.",
  unpublished: "공개를 멈췄습니다. 지금 /about 은 기본 문구를 보여 줍니다. 내용은 수정 중인 상태로 남아 있습니다.",
};

export default async function AboutAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const db = adminDb();
  const view = await getAbout(db, admin);
  const media = await listMediaForPicker(db, admin);
  const published = view.row?.status === "published";
  const error = one(params.error).slice(0, 300);
  const done = DONE[one(params.done)];
  return (
    <>
      <h1 className={styles.h1}>About</h1>
      <p className={styles.note}>
        <Link href="/about" className={styles.linkButton} target="_blank" rel="noopener noreferrer">
          공개 화면 보기 (새 탭)
        </Link>
        {" · "}
        <a href="/admin/about/preview" className={styles.linkButton} target="_blank" rel="noopener noreferrer">
          수정 중인 내용 미리보기 (새 탭)
        </a>
      </p>
      <p className={styles.note}>
        실제 이력·자격은 <strong>규강 님이 확인한 내용만</strong> 쓰세요. 저장해도 공개되지 않고, <strong>“공개 반영”</strong>을 눌러야 공개 화면이 바뀝니다. 공개된 내용이 없으면 /about 은 기본 문구를 보여 줍니다.
      </p>
      {error ? (
        <p role="alert" className={styles.alert} style={{ marginBottom: 16 }}>
          {error}
        </p>
      ) : null}
      {done ? (
        <p role="status" className={styles.alert} style={{ marginBottom: 16 }}>
          {done}
        </p>
      ) : null}
      <p className={styles.note}>
        상태: <span className={styles.statusTag}>{published ? "공개 중" : "공개 안 함 (기본 문구 표시)"}</span>
        {published && view.row?.publishedAt ? ` · ${formatDateTimeKst(view.row.publishedAt)} 공개` : ""}
        {view.hasDraft ? " · 수정 중인 내용이 있습니다" : ""}
      </p>
      <div className={styles.twoCol}>
        <div className={styles.panel}>
          <AboutForm initial={{ version: view.version, headline: view.editable.headline, bodyDoc: view.editable.body ?? EMPTY_BODY, signature: view.editable.signature, photoMediaId: view.editable.photoMediaId ?? "" }} media={media} />
        </div>
        <aside className={styles.panel} aria-label="공개 관리">
          <h2 className={styles.h2}>공개 관리</h2>
          {view.row === null ? (
            <p className={styles.note}>아직 저장한 내용이 없습니다. 왼쪽에서 내용을 쓰고 저장하면 여기서 공개할 수 있습니다.</p>
          ) : (
            <>
              {view.problems.length > 0 ? (
                <div role="status" className={styles.alert}>
                  <strong>공개 전 확인할 것</strong>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                    {view.problems.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className={styles.note}>공개 전 점검을 통과했습니다.</p>
              )}
              {view.hasDraft || !published ? (
                <form action={publishAboutAction} style={{ marginTop: 12 }}>
                  <input type="hidden" name="version" value={view.version} />
                  <button type="submit" className={styles.smallButton} disabled={view.problems.length > 0 || !view.hasDraft}>
                    공개 반영
                  </button>
                  {!view.hasDraft ? <span className={styles.note}> 먼저 저장해 주세요.</span> : null}
                </form>
              ) : null}
              {view.hasDraft && published ? (
                <form action={discardAboutAction} style={{ marginTop: 12 }}>
                  <input type="hidden" name="version" value={view.version} />
                  <button type="submit" className={styles.dangerLink}>
                    수정 내용 버리기
                  </button>
                </form>
              ) : null}
              {published ? (
                <form action={unpublishAboutAction} style={{ marginTop: 12 }}>
                  <input type="hidden" name="version" value={view.version} />
                  <button type="submit" className={styles.dangerLink}>
                    공개 멈추기 (기본 문구로 되돌림)
                  </button>
                </form>
              ) : null}
            </>
          )}
        </aside>
      </div>
    </>
  );
}
