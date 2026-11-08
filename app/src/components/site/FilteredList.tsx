"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { FilterChipGroup, type FilterOption } from "@/components/ui/FilterChip";
import type { Surface } from "@/components/ui/types";

export interface FilteredItem {
  id: string;
  /** 이 항목이 속한 필터 값 (예: 태그, 카테고리). 여러 값이면 배열 */
  values: string[];
  node: ReactNode;
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
}

const ALL = "all";

/** 칩으로 목록을 거르고 선택을 URL 에 남긴다 (STORY-02, EQ-02, TOUR-02). 선택지가 없으면 칩을 숨긴다. */
export function FilteredList({ label, param, options, items, surface = "dark", listClassName, empty }: FilteredListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const raw = search.get(param) ?? ALL;
  const value = options.some((o) => o.value === raw) ? raw : ALL;

  function change(next: string) {
    const params = new URLSearchParams(search.toString());
    if (next === ALL) params.delete(param);
    else params.set(param, next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const shown = value === ALL ? items : items.filter((i) => i.values.includes(value));

  return (
    <>
      {options.length > 0 ? <FilterChipGroup label={label} options={[{ value: ALL, label: "전체" }, ...options]} value={value} onChange={change} surface={surface} /> : null}
      {shown.length === 0 ? (
        <div role="status">{empty}</div>
      ) : (
        <ul className={listClassName} style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {shown.map((i) => (
            <li key={i.id}>{i.node}</li>
          ))}
        </ul>
      )}
    </>
  );
}
