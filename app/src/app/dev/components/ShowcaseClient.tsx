"use client";

import { useState } from "react";
import { FilterChipGroup } from "@/components/ui/FilterChip";

const OPTIONS = [
  { value: "all", label: "전체" },
  { value: "suit", label: "슈트" },
  { value: "fin", label: "핀" },
  { value: "mask", label: "마스크" },
];

/** 필터 칩의 선택 동작을 보여 주는 클라이언트 조각 */
export function FilterDemo({ surface }: { surface: "dark" | "light" }) {
  const [value, setValue] = useState("all");
  return (
    <div>
      <FilterChipGroup label={`장비 카테고리 (${surface})`} options={OPTIONS} value={value} onChange={setValue} surface={surface} />
      <p role="status" data-testid={`filter-status-${surface}`} style={{ marginTop: 12, fontSize: 12 }}>
        선택: {OPTIONS.find((option) => option.value === value)?.label}
      </p>
    </div>
  );
}
