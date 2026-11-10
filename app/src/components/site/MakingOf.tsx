import { Icon } from "@/components/ui/Icon";
import { NOTE_KEYS, NOTE_PUBLIC_HINTS, NOTE_LABELS, type NoteKey } from "@/content/videoFields";
import styles from "./MakingOf.module.css";

/**
 * 제작 노트 (FILMD-09, INT-17). 비운 칸은 숨기고, 세 칸이 모두 비면 영역 전체를 그리지 않는다. 첫 칸은 처음부터 펼쳐 둔다.
 * 글은 가공하지 않고 **글자로만** 그린다(줄바꿈·띄어쓰기 유지, HTML 해석 없음). 프롬프트 칸은 고정폭 글꼴이다.
 * `<details>` 라 스크립트 없이도 키보드(Enter·Space)로 접고 펼 수 있다.
 */
export function MakingOf({ notes }: { notes: Record<NoteKey, string> }) {
  const filled = NOTE_KEYS.filter((k) => notes[k] !== "");
  if (filled.length === 0) return null;
  return (
    <section id="making-of" className={styles.root} aria-labelledby="making-of-title">
      <div className={styles.head}>
        <h2 id="making-of-title" className={styles.label}>
          MAKING OF · 제작 노트
        </h2>
      </div>
      {filled.map((key, i) => (
        <details key={key} className={styles.item} open={i === 0}>
          <summary className={styles.summary}>
            <span>
              <span className={styles.name}>{NOTE_LABELS[key]}</span>
              <span className={styles.hint}>{NOTE_PUBLIC_HINTS[key]}</span>
            </span>
            <span className={styles.chev}>
              <Icon name="arrow-down" size={20} />
            </span>
          </summary>
          {key === "promptNotes" ? <pre className={styles.mono}>{notes[key]}</pre> : <p className={styles.text}>{notes[key]}</p>}
        </details>
      ))}
    </section>
  );
}
