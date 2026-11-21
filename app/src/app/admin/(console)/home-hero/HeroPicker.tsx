"use client";

import { useState } from "react";
import type { PickerMedia } from "@/editor/RichEditor";
import styles from "../../admin.module.css";

/**
 * 홈 히어로 이미지 고르기 (ADMIN-DESIGN §47). 미디어 라이브러리의 최근 이미지가 나타나고, 하나를 눌러 고른다.
 * "기본 일러스트"도 하나의 선택지다. 선택은 버튼의 상태(aria-pressed)로 두고 값은 숨은 입력(media)이 보낸다.
 */
export function HeroPicker({ images, initial }: { images: PickerMedia[]; initial: string }) {
  const [chosen, setChosen] = useState(initial);
  const options: { id: string; label: string; media?: PickerMedia }[] = [{ id: "", label: "기본 일러스트" }, ...images.map((m) => ({ id: m.id, label: m.alt.trim() || "대체 텍스트 없는 이미지", media: m }))];
  const current = images.find((m) => m.id === chosen);
  return (
    <fieldset className={styles.fieldset} style={{ display: "grid", gap: 12 }}>
      <legend className={styles.fieldLabel}>히어로 이미지</legend>
      <input type="hidden" name="media" value={chosen} />
      {initial && !images.some((m) => m.id === initial) ? (
        <p className={styles.note} style={{ margin: 0 }}>
          지금 고른 이미지는 최근 목록에 없어 여기 보이지 않습니다. 다른 것을 누르지 않으면 그대로 둡니다.
        </p>
      ) : null}
      <ul style={{ display: "flex", flexWrap: "wrap", gap: 12, listStyle: "none", margin: 0, padding: 0 }}>
        {options.map((o) => {
          const on = o.id === chosen;
          return (
            <li key={o.id || "default"}>
              <button
                type="button"
                aria-pressed={on}
                aria-label={`${o.label}${on ? " (선택됨)" : " 고르기"}`}
                onClick={() => setChosen(o.id)}
                style={{ display: "grid", gap: 6, padding: 4, background: "none", cursor: "pointer", border: on ? "3px solid var(--kyu-navy)" : "3px solid transparent", minHeight: "var(--kyu-touch)" }}
              >
                {o.media ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.media.url} alt="" width={96} height={117} style={{ objectFit: "cover", width: 96, height: 117, display: "block" }} />
                ) : (
                  <span aria-hidden="true" style={{ display: "block", width: 96, height: 117, background: "linear-gradient(var(--kyu-sea-light), var(--kyu-sea-mid), var(--kyu-sea-deep))" }} />
                )}
                <span className={styles.note} style={{ margin: 0, fontWeight: on ? 700 : 400, maxWidth: 96, overflowWrap: "anywhere" }}>
                  {on ? "선택됨" : o.media ? "고르기" : "기본 일러스트"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {current && !current.alt.trim() ? (
        <p className={styles.note} role="status" style={{ margin: 0 }}>
          이 이미지는 대체 텍스트가 없습니다. 어드민 &gt; 미디어에서 입력해야 공개 반영할 수 있습니다.
        </p>
      ) : null}
    </fieldset>
  );
}
