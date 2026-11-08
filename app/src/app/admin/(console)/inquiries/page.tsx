import Link from "next/link";
import { adminDb } from "@/data/admin/dbServer";
import { listInquiries } from "@/data/admin/inquiries";
import { ALL_STATUSES, KIND_LABELS, STATUS_LABELS, inquiryQueryString, parseInquiryQuery } from "@/data/admin/inquiryQuery";
import { listPastTours, listUpcomingTours } from "@/data";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTimeKst } from "@/lib/format";
import styles from "../../admin.module.css";

export const metadata = { title: "신청·문의 · KYU 어드민" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function InquiriesPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const query = parseInquiryQuery(params);
  const { items, total, page, pageSize, newCount } = await listInquiries(adminDb(), admin, query);
  const tours = [...listUpcomingTours(), ...listPastTours()];
  const tourTitle = (slug: string) => tours.find((t) => t.slug === slug)?.title ?? slug;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const link = (p: number) => `/admin/inquiries${inquiryQueryString({ ...query, page: p })}`;
  const filtered = Boolean(query.kind || query.status || query.tourSlug || query.q || query.from || query.to);

  return (
    <>
      <h1 className={styles.h1}>신청·문의</h1>
      {params.deleted ? (
        <p role="status" className={styles.alert} style={{ marginBottom: 16 }}>
          신청을 삭제했습니다.
        </p>
      ) : null}
      <p className={styles.note}>
        개인정보가 포함된 화면입니다. 화면 공유나 캡처에 주의해 주세요. 새 신청 <strong>{newCount}</strong>건.
      </p>

      <form method="get" className={styles.filters} role="search" aria-label="신청·문의 검색">
        <label className={styles.filterItem}>
          <span>유형</span>
          <select name="kind" defaultValue={query.kind ?? ""} className={styles.select}>
            <option value="">전체</option>
            {(Object.keys(KIND_LABELS) as (keyof typeof KIND_LABELS)[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterItem}>
          <span>상태</span>
          <select name="status" defaultValue={query.status ?? ""} className={styles.select}>
            <option value="">전체</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterItem}>
          <span>투어</span>
          <select name="tour" defaultValue={query.tourSlug ?? ""} className={styles.select}>
            <option value="">전체</option>
            {tours.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterItem}>
          <span>시작일</span>
          <input type="date" name="from" defaultValue={query.from ?? ""} className={styles.select} />
        </label>
        <label className={styles.filterItem}>
          <span>종료일</span>
          <input type="date" name="to" defaultValue={query.to ?? ""} className={styles.select} />
        </label>
        <label className={styles.filterItem}>
          <span>이름·이메일 검색</span>
          <input type="search" name="q" defaultValue={query.q ?? ""} maxLength={60} className={styles.select} />
        </label>
        <div className={styles.row}>
          <button type="submit" className={styles.smallButton}>
            검색
          </button>
          {filtered ? (
            <Link href="/admin/inquiries" className={styles.linkButton}>
              조건 지우기
            </Link>
          ) : null}
        </div>
      </form>

      <div className={styles.row} style={{ justifyContent: "space-between", margin: "16px 0 8px" }}>
        <p className={styles.note} style={{ margin: 0 }}>
          {total}건{pages > 1 ? ` · ${page}/${pages}쪽` : ""}
        </p>
        <a href={`/admin/inquiries/export${inquiryQueryString({ ...query, page: 1 })}`} className={styles.linkButton} download>
          CSV 내보내기 (현재 조건)
        </a>
      </div>

      {items.length === 0 ? (
        <div className={styles.panel}>
          <p className={styles.note} style={{ margin: 0 }}>
            {filtered ? "조건에 맞는 신청이 없습니다." : "아직 접수된 신청이 없습니다. 방문자가 투어 상세에서 문의하면 여기에 나타납니다."}
          </p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">접수일시</th>
              <th scope="col">유형</th>
              <th scope="col">투어</th>
              <th scope="col">이름</th>
              <th scope="col">상태</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td data-label="접수일시">{formatDateTimeKst(item.receivedAt)}</td>
                <td data-label="유형">{KIND_LABELS[item.kind]}</td>
                <td data-label="투어">{tourTitle(item.tourSlug)}</td>
                <td data-label="이름">
                  <Link href={`/admin/inquiries/${item.id}`} className={styles.rowLink}>
                    {item.name}
                  </Link>
                </td>
                <td data-label="상태">
                  <span className={styles.statusTag} data-status={item.status}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {pages > 1 ? (
        <nav className={styles.row} aria-label="쪽 이동" style={{ marginTop: 16 }}>
          {page > 1 ? (
            <Link href={link(page - 1)} className={styles.smallButton}>
              이전
            </Link>
          ) : null}
          {page < pages ? (
            <Link href={link(page + 1)} className={styles.smallButton}>
              다음
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
