"use client";

import { useState } from "react";
import { Thumb } from "@/components/ui/Thumb";
import type { GalleryImage } from "@/types/content";
import styles from "./EquipmentImages.module.css";

/** 장비 이미지 (EQ-D01). 작은 이미지를 누르면 큰 이미지가 바뀐다. 현재 선택은 aria-pressed 로 알린다. */
export function EquipmentImages({ main, images }: { main: GalleryImage; images: GalleryImage[] }) {
  const all = [main, ...images];
  const [index, setIndex] = useState(0);
  const current = all[index] ?? main;

  return (
    <div>
      <div role="img" aria-label={current.alt}>
        <Thumb height={420} src={current.src} alt={current.alt} variant={current.variant} />
      </div>
      {all.length > 1 ? (
        <ul className={styles.thumbs} aria-label="이미지 선택">
          {all.map((image, i) => (
            <li key={i}>
              <button type="button" className={styles.thumb} aria-pressed={i === index} aria-label={image.alt} onClick={() => setIndex(i)}>
                <Thumb height={72} src={image.src} alt="" variant={image.variant} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
