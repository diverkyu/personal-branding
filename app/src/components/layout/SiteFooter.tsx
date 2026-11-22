import Link from "next/link";
import { FOOTER_LINKS } from "@/config/nav";
import { siteConfig } from "@/config/site";
import { SocialLinks } from "@/components/site/SocialIcon";
import type { SocialLink } from "@/settings/social";
import { Logo } from "./Logo";
import { BackToTop } from "./BackToTop";
import styles from "./SiteFooter.module.css";

/** 푸터 (SCREEN-SPEC §4.2 GL-F). 연도는 렌더 시점의 현재 연도다. 정적으로 만들어진 페이지는 빌드한 해로 굳으므로 해가 바뀌면 다시 빌드한다. */
export function SiteFooter({ year = new Date().getFullYear(), owner = `${siteConfig.name} · ${siteConfig.ownerName}`, social = [] }: { year?: number; owner?: string; social?: SocialLink[] }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Logo />
          <p className={styles.copy}>
            © {year} {owner}
          </p>
        </div>
        <nav className={styles.links} aria-label="푸터 메뉴">
          <ul>
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
          <SocialLinks links={social} className={styles.social} itemClassName={styles.socialLink} />
        </nav>
        <BackToTop />
      </div>
    </footer>
  );
}
