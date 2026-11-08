import Image from "next/image";
import { cx } from "@/lib/cx";
import styles from "./Thumb.module.css";

/** 실제 이미지가 없을 때의 자리표시 그라디언트 (바다 색 조합) */
export type ThumbVariant = "sea-a" | "sea-b" | "sea-c" | "sea-d";

interface ThumbProps {
  /** 높이 px. 카드 종류별로 정한다: 스토리 240, 지난 투어 200, 장비 180 */
  height: number;
  /** 있으면 이미지를, 없으면 자리표시를 그린다 */
  src?: string;
  /** src 가 있을 때 필수. 의미 없는 장식이면 빈 문자열 */
  alt?: string;
  variant?: ThumbVariant;
  className?: string;
}

export function Thumb({ height, src, alt = "", variant = "sea-a", className }: ThumbProps) {
  return (
    <div className={cx(styles.thumb, className)} style={{ height }} data-variant={variant} data-placeholder={src ? undefined : ""}>
      {src ? <Image src={src} alt={alt} fill sizes="(max-width: 680px) 100vw, 33vw" className={styles.image} /> : null}
    </div>
  );
}
