"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { FilterChipGroup, type FilterOption } from "@/components/ui/FilterChip";
import { paginate, parsePage } from "@/lib/paginate";
import styles from "./FilteredList.module.css";

export interface TravelListItem {
  id: string;
  region: string;
  level: string;
  node: ReactNode;
}

interface TravelListProps {
  regions: FilterOption[];
  levels: FilterOption[];
  items: TravelListItem[];
  listClassName?: string;
  pageSize: number;
  /** 조건에 맞는 글이 없을 때의 안내 문구. 뒤에 "필터 초기화" 버튼이 붙는다 (TRAVEL-09) */
  noMatch: string;
  /** 안내 문구의 클래스 */
  noMatchClassName?: string;
}

const ALL = "all";

/**
 * 지역·난이도 필터(TRAVEL-03·04)와 페이지 이동(TRAVEL-07). 선택은 URL(?region=, ?level=, ?page=)에 남고 두 필터는 함께 쓸 수 있다.
 * 지역이 하나뿐이거나 난이도를 쓴 글이 없으면 그 필터는 숨긴다. 모르는 값이 주소에 있으면 "전체"로 본다.
 */
export function TravelList({ regions, levels, items, listClassName, pageSize, noMatch, noMatchClassName }: TravelListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const pick = (name: string, options: FilterOption[]) => {
    const raw = search.get(name) ?? ALL;
    return options.some((o) => o.value === raw) ? raw : ALL;
  };
  const region = pick("region", regions);
  const level = pick("level", levels);

  function replace(params: URLSearchParams) {
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }
  function change(name: string, next: string) {
    const params = new URLSearchParams(search.toString());
    if (next === ALL) params.delete(name);
    else params.set(name, next);
    params.delete("page"); // 필터를 바꾸면 첫 페이지로
    replace(params);
  }
  function goToPage(next: number) {
    const params = new URLSearchParams(search.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    replace(params);
  }
  const reset = () => replace(new URLSearchParams());

  const filtered = items.filter((i) => (region === ALL || i.region === region) && (level === ALL || i.level === level));
  const info = paginate(filtered.length, parsePage(search.get("page")), pageSize);
  const shown = filtered.slice(info.start, info.end);
  const withAll = (options: FilterOption[]) => [{ value: ALL, label: "전체" }, ...options];

  return (
    <>
      {regions.length > 1 ? <FilterChipGroup label="지역" options={withAll(regions)} value={region} onChange={(v) => change("region", v)} surface="light" /> : null}
      {levels.length > 0 ? <FilterChipGroup label="난이도" options={withAll(levels)} value={level} onChange={(v) => change("level", v)} surface="light" /> : null}
      {shown.length === 0 ? (
        <div role="status">
          <p className={noMatchClassName}>
            {noMatch}{" "}
            <button type="button" onClick={reset} className={styles.reset}>
              필터 초기화
            </button>
          </p>
        </div>
      ) : (
        <ul className={listClassName} style={{ listStyle: "none", padding: 0 }}>
          {shown.map((i) => (
            <li key={i.id}>{i.node}</li>
          ))}
        </ul>
      )}
      {info.pages > 1 ? (
        <nav className={styles.pager} aria-label="페이지 이동">
          <button type="button" disabled={info.page <= 1} onClick={() => goToPage(info.page - 1)} data-surface="light">
            이전
          </button>
          {Array.from({ length: info.pages }, (_, n) => n + 1).map((n) => (
            <button key={n} type="button" aria-current={n === info.page ? "page" : undefined} aria-label={`${n}페이지`} onClick={() => goToPage(n)} data-surface="light">
              {n}
            </button>
          ))}
          <button type="button" disabled={info.page >= info.pages} onClick={() => goToPage(info.page + 1)} data-surface="light">
            다음
          </button>
        </nav>
      ) : null}
    </>
  );
}
