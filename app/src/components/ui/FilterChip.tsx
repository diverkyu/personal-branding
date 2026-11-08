"use client";

import { cx } from "@/lib/cx";
import type { Surface } from "./types";
import styles from "./FilterChip.module.css";

interface FilterChipProps {
  label: string;
  pressed: boolean;
  onClick: () => void;
  surface?: Surface;
  className?: string;
}

/** 카테고리·상태 필터 하나. 선택 여부는 색만이 아니라 aria-pressed 로도 전달한다. */
export function FilterChip({ label, pressed, onClick, surface = "dark", className }: FilterChipProps) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={cx(styles.chip, className)} data-surface={surface}>
      {label}
    </button>
  );
}

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterChipGroupProps {
  /** 그룹의 이름 (스크린리더용). 예: "장비 카테고리" */
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  surface?: Surface;
}

export function FilterChipGroup({ label, options, value, onChange, surface = "dark" }: FilterChipGroupProps) {
  return (
    <div role="group" aria-label={label} className={styles.group}>
      {options.map((option) => (
        <FilterChip key={option.value} label={option.label} pressed={option.value === value} onClick={() => onChange(option.value)} surface={surface} />
      ))}
    </div>
  );
}
