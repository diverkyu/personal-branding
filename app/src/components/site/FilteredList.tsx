"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { FilterChipGroup, type FilterOption } from "@/components/ui/FilterChip";
import type { Surface } from "@/components/ui/types";
import { paginate, parsePage } from "@/lib/paginate";
import styles from "./FilteredList.module.css";

export interface FilteredItem {
  id: string;
  /** 이 항목이 속한 필터 값 (예: 태그, 카테고리). 여러 값이면 배열 */
  values: string[];
  node: ReactNode;
  /** 격자의 한 줄을 모두 차지한다 (예: 큰 카드) */
  wide?: boolean;
}

interface FilteredListProps {
  /** 칩 그룹의 이름 (스크린리더용) */
  label: string;
  /** URL 쿼리 이름. 예: "tag" → ?tag=바다 */
  param: string;
  /** "전체" 를 뺀 선택지 */
  options: FilterOption[];
  items: FilteredItem[];
  surface?: Surface;
  /** 목록 요소의 클래스 (격자 모양은 호출하는 쪽이 정한다) */
  listClassName?: string;
  empty: ReactNode;
  /**
   * 목록이 길 때. pages: 번호로 이동하고 URL(?page=)에 남긴다 (STORY-05). more: 더 보기 버튼으로 size 개씩 늘린다 (REV-05).
   * wide 항목은 개수에 세지 않고 첫 페이지에만 보인다.
   */
  pagination?: { mode: "pages" | "more"; size: number };
}

const ALL = "all";

/** 칩으로 목록을 거르고 선택을 URL 에 남긴다 (STORY-02, EQ-02, TOUR-02). 선택지가 없으면 칩을 숨긴다. */
export function FilteredList({ label, param, options, items, surface = "dark", listClassName, empty, pagination }: FilteredListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const raw = search.get(param) ?? ALL;
  const value = options.some((o) => o.value === raw) ? raw : ALL;

  function replaceQuery(params: URLSearchParams) {
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function change(next: string) {
    const params = new URLSearchParams(search.toString());
    if (next === ALL) params.delete(param);
    else params.set(param, next);
    params.delete("page"); // 필터를 바꾸면 첫 페이지로
    replaceQuery(params);
    setExtra(0);
  }

  function goToPage(next: number) {
    const params = new URLSearchParams(search.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    replaceQuery(params);
  }

  // 더 보기 모드에서 이미 펼친 개수 (필터를 바꾸면 처음으로)
  const [extra, setExtra] = useState(0);

  const filtered = value === ALL ? items : items.filter((i) => i.values.includes(value));
  const wide = filtered.filter((i) => i.wide);
  const regular = filtered.filter((i) => !i.wide);
  const info = pagination?.mode === "pages" ? paginate(regular.length, parsePage(search.get("page")), pagination.size) : null;
  const moreCount = pagination?.mode === "more" ? pagination.size + extra : null;
  const pageItems = info ? regular.slice(info.start, info.end) : moreCount !== null ? regular.slice(0, moreCount) : regular;
  const shown = [...(!info || info.page === 1 ? wide : []), ...pageItems];
  const hasMore = moreCount !== null && regular.length > moreCount;

  return (
    <>
      {options.length > 0 ? <FilterChipGroup label={label} options={[{ value: ALL, label: "전체" }, ...options]} value={value} onChange={change} surface={surface} /> : null}
      {shown.length === 0 ? (
        <div role="status">{empty}</div>
      ) : (
        <ul className={listClassName} style={{ listStyle: "none", padding: 0 }}>
          {shown.map((i) => (
            <li key={i.id} style={i.wide ? { gridColumn: "1 / -1" } : undefined}>
              {i.node}
            </li>
          ))}
        </ul>
      )}
      {info && info.pages > 1 ? (
        <nav className={styles.pager} aria-label="페이지 이동">
          <button type="button" disabled={info.page <= 1} onClick={() => goToPage(info.page - 1)} data-surface={surface}>
            이전
          </button>
          {Array.from({ length: info.pages }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" aria-current={n === info.page ? "page" : undefined} aria-label={`${n}페이지`} onClick={() => goToPage(n)} data-surface={surface}>
              {n}
            </button>
          ))}
          <button type="button" disabled={info.page >= info.pages} onClick={() => goToPage(info.page + 1)} data-surface={surface}>
            다음
          </button>
        </nav>
      ) : null}
      {hasMore && pagination ? (
        <div className={styles.more}>
          <button type="button" onClick={() => setExtra((e) => e + pagination.size)} data-surface={surface}>
            더 보기
          </button>
        </div>
      ) : null}
    </>
  );
}
