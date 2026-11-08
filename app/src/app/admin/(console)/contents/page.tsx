import Link from "next/link";
import { CONTENT_TYPES } from "@/content/types";
import { ORIGIN_LABELS, STATUSES, STATUS_LABELS, type ContentStatus } from "@/content/publish";
import { listContents, parseContentQuery } from "@/data/admin/contents";
import { adminDb } from "@/data/admin/dbServer";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTimeKst } from "@/lib/format";
import styles from "../../admin.module.css";
import { NewContentForm } from "./ContentForms";

export const metadata = { title: "전체 콘텐츠 · KYU 어드민" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function href(params: { status?: string; q?: string; page?: number }): string {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return `/admin/contents${s ? `?${s}` : ""}`;
}

export default async function ContentsPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const query = parseContentQuery(params);
  const { items, total, page, pageSize, counts } = await listContents(adminDb(), admin, query);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const all = STATUSES.reduce((n, s) => n + counts[s], 0);
  return (
    <>
      <h1 className={styles.h1}>전체 콘텐츠</h1>
      {params.deleted ? (
        <p role="status" className={styles.alert} style={{ marginBottom: 16 }}>
          삭제했습니다.
        </p>
      ) : null}

      <section className={styles.panel} style={{ marginBottom: 16 }} aria-label="새 글 만들기">
        <NewContentForm />
      </section>

      <nav className={styles.row} aria-label="상태로 거르기" style={{ margin: "8px 0" }}>
        <Link href={href({ q: query.q })} className={styles.statusTag} aria-current={!query.status ? "true" : undefined} style={!query.status ? { fontWeight: 700, borderColor: "var(--kyu-navy)" } : undefined}>
          전체 {all}
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={href({ status: s, q: query.q })} className={styles.statusTag} aria-current={query.status === s ? "true" : undefined} style={query.status === s ? { fontWeight: 700, borderColor: "var(--kyu-navy)" } : undefined}>
            {STATUS_LABELS[s]} {counts[s]}
          </Link>
        ))}
      </nav>

      <form method="get" className={styles.row} role="search" aria-label="제목 검색" style={{ margin: "8px 0 16px" }}>
        {query.status ? <input type="hidden" name="status" value={query.status} /> : null}
        <input type="search" name="q" defaultValue={query.q ?? ""} maxLength={60} placeholder="제목·주소 이름 검색" aria-label="제목·주소 이름 검색" className={styles.select} style={{ maxWidth: 320 }} />
        <button type="submit" className={styles.smallButton}>
          검색
        </button>
      </form>

      {items.length === 0 ? (
        <div className={styles.panel}>
          <p className={styles.note} style={{ margin: 0 }}>
            {query.status || query.q ? "조건에 맞는 콘텐츠가 없습니다." : "아직 콘텐츠가 없습니다. 위에서 첫 스토리를 만들어 보세요."}
          </p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">제목</th>
              <th scope="col">유형</th>
              <th scope="col">상태</th>
              <th scope="col">제작</th>
              <th scope="col">일정</th>
              <th scope="col">수정일</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td data-label="제목">
                  <Link href={`/admin/contents/${item.id}`} className={styles.rowLink}>
                    {item.title}
                  </Link>
                  {item.hasDraft ? <span className={styles.statusTag} style={{ marginLeft: 8 }}>수정 중</span> : null}
                </td>
                <td data-label="유형">{CONTENT_TYPES[item.type]?.label ?? item.type}</td>
                <td data-label="상태">
                  <span className={styles.statusTag}>{STATUS_LABELS[item.status as ContentStatus]}</span>
                </td>
                <td data-label="제작">{ORIGIN_LABELS[item.origin]}</td>
                <td data-label="일정">{item.status === "scheduled" && item.publishAt ? `${formatDateTimeKst(item.publishAt)} 예약` : item.publishedAt ? `${formatDateTimeKst(item.publishedAt).slice(0, 10)} 발행` : "-"}</td>
                <td data-label="수정일">{formatDateTimeKst(item.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {pages > 1 ? (
        <nav className={styles.row} aria-label="쪽 이동" style={{ marginTop: 16 }}>
          {page > 1 ? (
            <Link href={href({ status: query.status, q: query.q, page: page - 1 })} className={styles.smallButton}>
              이전
            </Link>
          ) : null}
          {page < pages ? (
            <Link href={href({ status: query.status, q: query.q, page: page + 1 })} className={styles.smallButton}>
              다음
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
