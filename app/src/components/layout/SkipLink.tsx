import styles from "./SkipLink.module.css";

/** GL-H5. 포커스를 받을 때만 보이고, 누르면 본문(#main)으로 이동한다. 문서의 첫 포커스 대상이어야 한다. */
export function SkipLink() {
  return (
    <a className={styles.skip} href="#main">
      본문으로 건너뛰기
    </a>
  );
}
