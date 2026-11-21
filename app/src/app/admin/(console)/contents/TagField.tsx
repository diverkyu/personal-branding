"use client";

import { useState } from "react";
import styles from "../../admin.module.css";

const MAX_TAGS = 5;

/** 쉼표로 구분한 입력을 이름 목록으로 (앞뒤 공백 정리, 빈 것·중복 제거) */
export function splitTags(value: string): string[] {
  return [...new Set(value.split(/[,，]/).map((v) => v.replace(/\s+/g, " ").trim()).filter(Boolean))];
}

/**
 * 태그 입력. 지금처럼 쉼표로 직접 써도 되고, 아래에 보이는 **이미 있는 태그(미리 등록한 것 포함)를 눌러서** 넣고 뺄 수도 있다.
 * 새 이름은 그냥 입력하면 된다(등록하지 않아도 저장된다). 값은 `name` 의 일반 입력칸으로 서버에 간다.
 * 저장·오류마다 호출하는 쪽이 key 를 바꿔 새로 만든다.
 */
export function TagField({ id, name, label, defaultValue, suggestions }: { id: string; name: string; label: string; defaultValue: string; suggestions: string[] }) {
  const [value, setValue] = useState(defaultValue);
  const chosen = splitTags(value);
  const toggle = (tag: string) => {
    const next = chosen.includes(tag) ? chosen.filter((t) => t !== tag) : [...chosen, tag];
    setValue(next.join(", "));
  };
  return (
    <div>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>
      <input id={id} name={name} type="text" value={value} onChange={(e) => setValue(e.target.value)} className={styles.select} style={{ width: "100%", maxWidth: "none" }} aria-describedby={`${id}-hint`} />
      <p id={`${id}-hint`} className={styles.note} style={{ margin: "6px 0 0" }}>
        {chosen.length}/{MAX_TAGS}개. 새 태그는 그냥 써 넣으면 됩니다. 아래는 이미 있는 태그입니다(눌러서 넣고 뺍니다).
        {chosen.length > MAX_TAGS ? " 태그는 5개까지 쓸 수 있습니다." : ""}
      </p>
      {suggestions.length > 0 ? (
        <ul style={{ display: "flex", flexWrap: "wrap", gap: 6, listStyle: "none", margin: "6px 0 0", padding: 0 }} aria-label="이미 있는 태그">
          {suggestions.map((tag) => {
            const on = chosen.includes(tag);
            return (
              <li key={tag}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(tag)}
                  className={styles.smallButton}
                  style={on ? { background: "var(--kyu-navy)", color: "var(--kyu-paper)" } : undefined}
                >
                  {tag}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
