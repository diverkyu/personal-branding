import Link from "next/link";
import { notFound } from "next/navigation";
import { listTourOptions } from "@/data/admin/contents";
import { adminDb } from "@/data/admin/dbServer";
import { getReview, listReviewRevisions } from "@/data/admin/reviews";
import { kstDate } from "@/data/storyQueries";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTimeKst } from "@/lib/format";
import { LABEL_KIND_LABELS, REVIEW_STATUS_LABELS, type LabelKind, type ReviewStatus } from "@/reviews/fields";
import styles from "../../../admin.module.css";
import { DeleteReviewForm, ReviewForm, ReviewStatusForms, WithdrawForm } from "../ReviewForms";

export const metadata = { title: "후기 편집 · KYU 어드민" };

const REASON_LABELS: Record<string, string> = { create: "만듦", edit: "수정", status: "공개 상태 변경", withdraw: "철회(즉시 비공개)", delete: "삭제" };

export default async function ReviewEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { withdrawn } = await searchParams;
  const db = adminDb();
  const row = await getReview(db, admin, id);
  if (!row) notFound();
  const [tours, revisions] = await Promise.all([listTourOptions(db, admin), listReviewRevisions(db, admin, id)]);
  const status = row.status as ReviewStatus;
  return (
    <>
      <p style={{ margin: "0 0 8px" }}>
        <Link href="/admin/reviews" className={styles.linkButton}>
          ← 수강 후기
        </Link>
      </p>
      <h1 className={styles.h1}>후기 편집</h1>
      {withdrawn ? (
        <p role="status" className={styles.alert} style={{ marginBottom: 16 }}>
          철회로 기록하고 즉시 비공개로 바꿨습니다. 공개 화면에서 내려갔습니다.
        </p>
      ) : null}
      <p className={styles.note}>
        <span className={styles.statusTag}>{REVIEW_STATUS_LABELS[status]}</span> · 수강생 {row.authorLabel} ({LABEL_KIND_LABELS[row.labelKind as LabelKind]}) · 동의 {row.consentConfirmed ? "확인됨" : "미확인"}
      </p>

      <div className={styles.twoCol}>
        <div className={styles.panel}>
          <ReviewForm
            mode="edit"
            reviewId={row.id}
            version={row.version}
            tours={tours}
            today={kstDate(new Date())}
            initial={{
              body: row.body,
              authorLabel: row.authorLabel,
              labelKind: row.labelKind,
              writtenOn: row.writtenOn,
              sourceKind: row.sourceKind,
              sourceNote: row.sourceNote,
              tourSlug: row.tourSlug ?? "",
              featured: row.isFeatured,
              featuredOrder: String(row.featuredOrder),
              consentConfirmed: row.consentConfirmed,
              consentNote: row.consentNote,
            }}
          />
        </div>

        <div>
          <section className={styles.panel} aria-labelledby="status-title">
            <h2 id="status-title" className={styles.h2} style={{ marginTop: 0 }}>
              공개
            </h2>
            <p className={styles.note}>{status === "public" ? "지금 공개 중입니다. 내용을 저장하면 공개 화면에 바로 반영됩니다." : row.consentConfirmed ? "공개할 준비가 되었습니다." : "공개 동의를 확인해 체크하고 저장해야 공개할 수 있습니다."}</p>
            <ReviewStatusForms id={row.id} version={row.version} status={status} />
            {status === "public" ? (
              <div style={{ marginTop: 16 }}>
                <WithdrawForm id={row.id} />
              </div>
            ) : null}
          </section>

          <section className={styles.panel} style={{ marginTop: 16 }} aria-labelledby="history-title">
            <h2 id="history-title" className={styles.h2} style={{ marginTop: 0 }}>
              수정 이력
            </h2>
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {revisions.map((rev) => {
                const snap = rev.snapshot as { body?: string; authorLabel?: string; status?: string };
                return (
                  <li key={rev.id}>
                    <details>
                      <summary>
                        {formatDateTimeKst(rev.changedAt)} · {REASON_LABELS[rev.reason] ?? rev.reason} · v{rev.version}
                      </summary>
                      <p className={styles.note} style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>
                        {snap.authorLabel} · {snap.status === "public" ? "공개" : "비공개"}
                        {"\n"}
                        {snap.body}
                      </p>
                    </details>
                  </li>
                );
              })}
            </ol>
          </section>

          <div className={styles.panel} style={{ marginTop: 16 }}>
            <DeleteReviewForm id={row.id} />
          </div>
        </div>
      </div>
    </>
  );
}
