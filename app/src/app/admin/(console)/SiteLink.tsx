import { Icon } from "@/components/ui/Icon";
import styles from "../admin.module.css";

/**
 * 어드민 화면 오른쪽 위의 "사이트 보기". 누르면 공개 사이트 첫 화면이 새 탭에서 열린다 (어드민은 그대로 둔다).
 * 주소는 같은 사이트의 `/` 이므로 로컬·Preview·운영 어디서나 그 환경의 사이트가 열린다(주소를 따로 설정하지 않는다).
 * 새 탭으로 열리는 사실은 이름(aria-label)으로 알린다. `noopener noreferrer` 로 열린 사이트가 어드민 창을 건드리지 못하게 한다.
 */
export function SiteLink() {
  return (
    <div className={styles.topbar}>
      <a href="/" target="_blank" rel="noopener noreferrer" className={styles.siteLink} aria-label="사이트 보기 (새 탭)">
        사이트 보기
        <Icon name="external-link" size={16} />
      </a>
    </div>
  );
}
