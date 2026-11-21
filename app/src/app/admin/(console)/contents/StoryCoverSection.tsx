"use client";

import { useState } from "react";
import type { PickerMedia } from "@/editor/RichEditor";
import styles from "../../admin.module.css";

/**
 * 스토리의 대표 이미지(목록·카드의 썸네일) 고르기. 본문에 넣은 이미지가 여기에 나타나고, 하나를 눌러 대표로 정한다.
 * 고르지 않으면 본문의 첫 번째 이미지가 대표다(선택된 것으로 보이며, 저장할 때 그 이미지가 대표로 기록된다).
 * 선택은 버튼의 상태(aria-pressed)로 두고 값은 숨은 입력(f_cover)이 보낸다 — 서버 액션이 끝나고 폼이 되돌려져도 화면과 값이 어긋나지 않는다.
 * 저장·오류마다 호출하는 쪽이 key 를 바꿔 새로 만든다.
 */
export function StoryCoverSection({ images, initial }: { images: PickerMedia[]; initial: string }) {
  const [chosen, setChosen] = useState(initial);
  // 선택한 이미지가 본문에서 빠졌으면 첫 이미지로 돌아간다
  const effective = images.find((m) => m.id === chosen)?.id ?? images[0]?.id ?? "";
  return (
    <fieldset className={styles.fieldset} style={{ display: "grid", gap: 12 }}>
      <legend className={styles.fieldLabel}>대표 이미지 (목록·카드에 보이는 썸네일)</legend>
      <input type="hidden" name="f_cover" value={effective} />
      {images.length === 0 ? (
        <p className={styles.note} style={{ margin: 0 }}>
          본문에 이미지를 넣으면 여기서 대표 이미지를 고를 수 있습니다. 이미지가 없으면 목록에는 색 배경이 보입니다.
        </p>
      ) : (
        <>
          <p className={styles.note} style={{ margin: 0 }}>
            본문에 넣은 이미지 중에서 고릅니다. 고르지 않으면 첫 번째 이미지가 대표가 됩니다.
          </p>
          <ul style={{ display: "flex", flexWrap: "wrap", gap: 12, listStyle: "none", margin: 0, padding: 0 }}>
            {images.map((m) => {
              const on = m.id === effective;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={`${m.alt.trim() ? m.alt : "대체 텍스트 없는 이미지"}${on ? " (대표 이미지)" : " 을(를) 대표 이미지로 정하기"}`}
                    onClick={() => setChosen(m.id)}
                    style={{ display: "grid", gap: 6, padding: 4, background: "none", cursor: "pointer", border: on ? "3px solid var(--kyu-ink, #0b1f2a)" : "3px solid transparent", minHeight: "var(--kyu-touch)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt="" width={120} height={90} style={{ objectFit: "cover", width: 120, height: 90, display: "block" }} />
                    <span className={styles.note} style={{ margin: 0, fontWeight: on ? 700 : 400 }}>
                      {on ? "대표 이미지" : "대표로 정하기"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </fieldset>
  );
}
