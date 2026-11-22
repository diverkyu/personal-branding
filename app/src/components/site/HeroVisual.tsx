import type { HeroImage } from "@/data/homeHeroQuery";
import { HeroArt } from "./HeroArt";
import styles from "./HeroVisual.module.css";

/**
 * 홈 히어로의 그림 자리 (HOME-07, ADMIN-DESIGN §47).
 * - 어드민에서 공개한 이미지가 없으면 기본 수중 일러스트(HeroArt, "CONCEPT VISUAL" 표시 포함)를 그린다.
 * - 이미지가 있으면 그 사진 위에 같은 문구("01 / INTO THE BLUE", "한 호흡, 무한한 가능성.")를 얹고, "CONCEPT VISUAL" 은 보이지 않는다.
 *   문구는 장식이라 읽기 도구에서 숨기고, 사진은 대체 텍스트로 설명한다(공개 반영 때 대체 텍스트가 필수).
 */
export function HeroVisual({ image }: { image: HeroImage | null }) {
  if (!image) return <HeroArt />;
  return (
    <div className={styles.frame}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 이미지는 서버가 이미 WebP 로 다시 만들었다 */}
      <img className={styles.image} src={image.url} alt={image.alt} width={image.width} height={image.height} fetchPriority="high" decoding="async" />
      <div className={styles.scrim} aria-hidden="true" />
      <p className={styles.top} aria-hidden="true">
        01 / INTO THE BLUE
      </p>
      <p className={styles.bottom} aria-hidden="true">
        <span>한 호흡, 무한한 가능성.</span>
        <svg className={styles.arrow} width="14" height="20" viewBox="0 0 14 20" fill="none" aria-hidden="true">
          <path d="M7 1v18M1 13l6 6l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </p>
    </div>
  );
}
