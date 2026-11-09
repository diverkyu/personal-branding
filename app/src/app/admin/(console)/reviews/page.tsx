import Link from "next/link";
import { listTourOptions } from "@/data/admin/contents";
import { adminDb } from "@/data/admin/dbServer";
import { listReviews, parseReviewQuery } from "@/data/admin/reviews";
import { requireAdmin } from "@/lib/auth/session";
import { REVIEW_STATUS_LABELS, REVIEW_STATUSES, type ReviewStatus } from "@/reviews/fields";
import styles from "../../admin.module.css";

export const metadata = { title: "수강 후기 · KYU 어드민" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function href(params: { status?: string; tour?: string; q?: string; page?: number }): string {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.tour) sp.set("tour", params.tour);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return `/admin/reviews${s ? `?${s}` : ""}`;
}

export default async function ReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const query = parseReviewQuery(params);
  const db = adminDb();
  const { items, total, page, pageSize, counts } = await listReviews(db, admin, query);
  const tourTitles = new Map((await listTourOptions(db, admin)).map((t) => [t.slug, t.title]));
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const all = counts.private + counts.public;
  const active = { fontWeight: 700, borderColor: "var(--kyu-navy)" } as const;
  return (
    <>
      <h1 className={styles.h1}>수강 후기</h1>
      {params.deleted ? (
        <p role="status" className={styles.alert} style={{ marginBottom: 16 }}>
          후기를 삭제했습니다.
        </p>
      ) : null}
      <p className={styles.note}>
        수강생의 글이 담긴 화면입니다. 후기는 <strong>공개 동의를 확인해야</strong> 공개할 수 있고, 원문은 고치지 않고 그대로 보여 줍니다. 평점은 쓰지 않습니다.
      </p>
      <p style={{ margin: "0 0 16px" }}>
        <Link href="/admin/reviews/new" className={styles.smallButton}>
          새 후기 만들기
        </Link>
      </p>

      <nav className={styles.row} aria-label="공개 상태로 거르기" style={{ margin: "8px 0" }}>
        <Link href={href({ tour: query.tour, q: query.q })} className={styles.statusTag} aria-current={!query.status ? "true" : undefined} style={!query.status ? active : undefined}>
          전체 {all}
        </Link>
        {REVIEW_STATUSES.map((s) => (
          <Link key={s} href={href({ status: s, tour: query.tour, q: query.q })} className={styles.statusTag} aria-current={query.status === s ? "true" : undefined} style={query.status === s ? active : undefined}>
            {REVIEW_STATUS_LABELS[s]} {counts[s]}
          </Link>
        ))}
      </nav>

      <form method="get" className={styles.row} role="search" aria-label="후기 검색" style={{ margin: "8px 0 16px" }}>
        {query.status ? <input type="hidden" name="status" value={query.status} /> : null}
        <input type="search" name="q" defaultValue={query.q ?? ""} maxLength={60} placeholder="원문·수강생 표기 검색" aria-label="원문·수강생 표기 검색" className={styles.select} style={{ maxWidth: 320 }} />
        <select name="tour" defaultValue={query.tour ?? ""} aria-label="투어로 거르기" className={styles.select} style={{ maxWidth: 260 }}>
          <option value="">모든 투어</option>
          {[...tourTitles].map(([slug, title]) => (
            <option key={slug} value={slug}>
              {title}
            </option>
          ))}
        </select>
        <button type="submit" className={styles.smallButton}>
          검색
        </button>
      </form>

      {items.length === 0 ? (
        <div className={styles.panel}>
          <p className={styles.note} style={{ margin: 0 }}>
            {query.status || query.q || query.tour ? "조건에 맞는 후기가 없습니다." : "아직 후기가 없습니다. 위에서 첫 후기를 만들어 보세요."}
          </p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">원문</th>
              <th scope="col">수강생</th>
              <th scope="col">작성일</th>
              <th scope="col">상태</th>
              <th scope="col">동의</th>
              <th scope="col">대표</th>
              <th scope="col">투어</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td data-label="원문">
                  <Link href={`/admin/reviews/${r.id}`} className={styles.rowLink}>
                    {r.preview}
                  </Link>
                </td>
                <td data-label="수강생">{r.authorLabel}</td>
                <td data-label="작성일">{r.writtenOn}</td>
                <td data-label="상태">
                  <span className={styles.statusTag}>{REVIEW_STATUS_LABELS[r.status as ReviewStatus]}</span>
                </td>
                <td data-label="동의">{r.consentConfirmed ? "확인" : "미확인"}</td>
                <td data-label="대표">{r.featured ? "대표" : "-"}</td>
                <td data-label="투어">{r.tourSlug ? (tourTitles.get(r.tourSlug) ?? r.tourSlug) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {pages > 1 ? (
        <nav className={styles.row} aria-label="쪽 이동" style={{ marginTop: 16 }}>
          {page > 1 ? (
            <Link href={href({ status: query.status, tour: query.tour, q: query.q, page: page - 1 })} className={styles.smallButton}>
              이전
            </Link>
          ) : null}
          {page < pages ? (
            <Link href={href({ status: query.status, tour: query.tour, q: query.q, page: page + 1 })} className={styles.smallButton}>
              다음
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
