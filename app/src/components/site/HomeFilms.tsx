import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { FilmsCopy } from "@/config/films";
import { NOTE_KEYS } from "@/content/videoFields";
import type { FilmItem } from "@/data/filmQueries";
import { formatDate } from "@/lib/format";
import styles from "./HomeFilms.module.css";

/**
 * 홈 Films 구역 (HOME-24~27). 대표 작품의 포스터를 보여 주고 상세로 보낸다. 홈에서는 재생하지 않는다 — 외부 서비스에 요청하지 않는다.
 * 공개 작품이 없으면 호출하는 쪽이 이 구역을 아예 그리지 않는다.
 */
export function HomeFilms({ film, copy }: { film: FilmItem; copy: FilmsCopy }) {
  const hasNotes = NOTE_KEYS.some((k) => film.notes[k] !== "");
  const meta = [formatDate(film.publishedAt), film.duration, film.hasCaptions ? "자막 있음" : ""].filter(Boolean).join(" · ");
  return (
    <Section tone="dark" labelledBy="home-films">
      <SectionHeader
        label="04 / FILMS"
        titleId="home-films"
        title={copy.titleLines.map((line, i) => (
          <span key={i}>
            {i > 0 ? <br /> : null}
            {line}
          </span>
        ))}
        description={copy.subtitle}
      />
      <div className={styles.grid}>
        <Link href={`/films/${film.slug}`} className={styles.media} aria-label={`${film.title} 보러 가기`}>
          {film.poster.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.poster} src={film.poster.src} alt="" loading="lazy" decoding="async" />
          ) : null}
          <span className={styles.play} aria-hidden="true">
            <Icon name="play" size={24} />
          </span>
          {film.cutLabel ? <span className={styles.badge}>{film.cutLabel}</span> : null}
        </Link>
        <div className={styles.text}>
          <p className={styles.meta}>{meta}</p>
          <h3 className={styles.title}>{film.title}</h3>
          {film.summary ? <p className={styles.summary}>{film.summary}</p> : null}
          <div className={styles.actions}>
            <Button href={hasNotes ? `/films/${film.slug}#making-of` : `/films/${film.slug}`} variant="primary" size="M">
              {hasNotes ? "작품과 제작 노트 보기" : "작품 보기"}
            </Button>
            <Button href="/films" variant="outline" size="M">
              Films 전체 보기
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}
