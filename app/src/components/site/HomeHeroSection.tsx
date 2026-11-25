import type { HeroImage } from "@/data/homeHeroQuery";
import { Button } from "@/components/ui/Button";
import { splitSlogan, type ResolvedSettings } from "@/settings/registry";
import styles from "@/app/page.module.css";
import { HeroVisual } from "./HeroVisual";

/** 홈 히어로 (HOME-01~07). 홈과 어드민 미리보기가 같은 모양을 쓰도록 나눠 두었다 */
export function HomeHeroSection({ settings, image }: { settings: ResolvedSettings; image: HeroImage | null }) {
  const slogan = splitSlogan(settings["home.slogan"] ?? "");
  const headline = (settings["home.headline"] ?? "").split("\n");
  const lead = (settings["home.lead"] ?? "").split("\n");
  const lines = (items: string[]) => items.map((line, i) => (
    <span key={i}>
      {i > 0 ? <br /> : null}
      {line}
    </span>
  ));
  return (
    <section className={styles.hero} aria-label="소개">
      <div className={styles.heroInner}>
        <div className={styles.copy}>
          <p className={styles.label}>FREEDIVING INSTRUCTOR &amp; AI CREATOR</p>
          <h1 className={styles.title}>
            {slogan.line1}
            {slogan.accent ? (
              <>
                <br />
                {slogan.line2Lead} <em className={styles.accent}>{slogan.accent}</em>
              </>
            ) : null}
          </h1>
          <p className={styles.headline}>{lines(headline)}</p>
          <p className={styles.lead}>{lines(lead)}</p>
          <Button href="/story" size="L">
            나의 세계 둘러보기
          </Button>
          <p className={styles.explore} aria-hidden="true">
            <span>LEE DONG KYU · 이동규</span>
          </p>
        </div>
        <div className={styles.art}>
          <HeroVisual image={image} />
        </div>
      </div>
    </section>
  );
}
