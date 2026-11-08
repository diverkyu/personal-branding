"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Thumb } from "@/components/ui/Thumb";
import type { GalleryImage } from "@/types/content";
import styles from "./Gallery.module.css";

/**
 * 갤러리 (TOUR-D08)와 확대 보기 (INT-08). 사진을 누르면 오버레이로 열리고 좌우로 넘긴다.
 * 열린 동안 포커스를 가두고, ESC·닫기 버튼·배경 클릭으로 닫으며, 닫으면 눌렀던 사진으로 포커스가 돌아온다.
 */
export function Gallery({ images, label }: { images: GalleryImage[]; label: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const triggers = useRef<Array<HTMLButtonElement | null>>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastOpened = useRef(0);

  const close = useCallback(() => {
    setOpen(null);
    triggers.current[lastOpened.current]?.focus();
  }, []);

  useEffect(() => {
    if (open === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button[data-close]")?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowRight") {
        setOpen((i) => (i === null ? i : (i + 1) % images.length));
      } else if (event.key === "ArrowLeft") {
        setOpen((i) => (i === null ? i : (i - 1 + images.length) % images.length));
      } else if (event.key === "Tab") {
        // 화면에 보이는 버튼만 (좁은 화면에서는 이전·다음 버튼이 숨겨진다)
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button") ?? []).filter((el) => el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, images.length, close]);

  const current = open === null ? null : images[open];

  return (
    <>
      <ul className={styles.grid} aria-label={label}>
        {images.map((image, i) => (
          <li key={i}>
            <button
              type="button"
              ref={(el) => {
                triggers.current[i] = el;
              }}
              className={styles.trigger}
              aria-label={`${image.alt} 확대`}
              onClick={() => {
                lastOpened.current = i;
                setOpen(i);
              }}
            >
              <Thumb height={160} src={image.src} alt={image.alt} variant={image.variant} />
            </button>
            {image.caption ? <p className={styles.caption}>{image.caption}</p> : null}
          </li>
        ))}
      </ul>

      {current && open !== null ? (
        <div className={styles.overlay} onClick={close}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${label} 확대 보기`} className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <button type="button" data-close className={styles.close} onClick={close}>
              <Icon name="x" size={20} />
              <span>닫기</span>
            </button>
            <div className={styles.stage}>
              <button type="button" className={styles.nav} data-dir="prev" aria-label="이전 사진" onClick={() => setOpen((open - 1 + images.length) % images.length)}>
                <Icon name="chevron-right" size={24} />
              </button>
              <div className={styles.big} role="img" aria-label={current.alt}>
                <Thumb height={420} src={current.src} alt={current.alt} variant={current.variant} />
              </div>
              <button type="button" className={styles.nav} data-dir="next" aria-label="다음 사진" onClick={() => setOpen((open + 1) % images.length)}>
                <Icon name="chevron-right" size={24} />
              </button>
            </div>
            <p className={styles.counter} aria-live="polite">
              {open + 1} / {images.length}
              {current.caption ? ` · ${current.caption}` : ""}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
