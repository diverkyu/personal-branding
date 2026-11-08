import styles from "./page.module.css";

/** 1단계(기반) 확인용 임시 홈. 실제 홈은 4단계(페이지 틀)에서 만든다. */
export default function HomePage() {
  return (
    <main className={styles.main}>
      <p className={styles.label}>FREEDIVING INSTRUCTOR &amp; AI CREATOR</p>
      <h1 className={styles.title}>
        Dive deeper.
        <br />
        Create <em className={styles.accent}>beyond.</em>
      </h1>
      <p className={styles.lead}>
        바다에서는 더 깊이,
        <br />
        상상 속에서는 더 멀리.
      </p>
      <p className={styles.note}>사이트를 준비하고 있습니다.</p>
    </main>
  );
}
