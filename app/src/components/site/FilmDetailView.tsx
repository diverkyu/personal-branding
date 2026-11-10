import Link from "next/link";
import { FilmPlayer } from "@/components/site/FilmPlayer";
import { FilmsCallout } from "@/components/site/FilmsCallout";
import { MakingOf } from "@/components/site/MakingOf";
import { Section } from "@/components/ui/Section";
import { SmartLink } from "@/components/ui/SmartLink";
import { filmsCopy, type FilmsCopy } from "@/config/films";
import { ContentBody } from "@/content/ContentBody";
import { NOTE_KEYS } from "@/content/videoFields";
import type { FilmDetail, FilmItem } from "@/data/filmQueries";
import { formatDate } from "@/lib/format";
import styles from "./FilmDetailView.module.css";

/**
 * 작품 상세 본체 (SCREEN-SPEC §5.15). 공개 `/films/[slug]` 와 어드민 미리보기가 함께 쓴다.
 * 순서는 고정: 경로 → 영상 → AI 제작 표기 → 제목·정보 → 영상 소개와 제작 노트 → 이전·다음 → 특강 소식 띠.
 */
export function FilmDetailView({ film, newer, older, email, copy = filmsCopy() }: { film: FilmDetail; newer: FilmItem | null; older: FilmItem | null; email: string; copy?: FilmsCopy }) {
  const meta = [formatDate(film.publishedAt), film.duration, film.hasCaptions ? "자막 있음" : ""].filter(Boolean).join(" · ");
  const hasIntro = film.doc !== null;
  const hasNotes = NOTE_KEYS.some((k) => film.notes[k] !== "");
  return (
    <>
      <Section tone="dark" sub>
        <nav className={styles.crumbs} aria-label="현재 위치">
          <Link href="/films">Films</Link> / {film.title}
        </nav>
        <FilmPlayer videoUrl={film.videoUrl} title={film.title} poster={film.poster} badge={film.cutLabel || undefined} />
        <p className={styles.notice}>
          AI 제작 · {copy.aiNotice}
        </p>
        <p className={styles.meta}>{meta}</p>
        <div className={styles.head}>
          <h1 className={styles.title}>{film.title}</h1>
          {film.tags.length > 0 ? (
            <ul className={styles.tags} aria-label="태그">
              {film.tags.map((t) => (
                <li key={t}>
                  <SmartLink href={`/films?tag=${encodeURIComponent(t)}`}>#{t}</SmartLink>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Section>

      {hasIntro || hasNotes ? (
        <Section tone="light" sub>
          <div className={styles.cols}>
            {hasIntro && film.doc ? (
              <div className={styles.intro}>
                <h2 className={styles.sectionLabel}>ABOUT THIS FILM</h2>
                <div className={styles.prose}>
                  <ContentBody doc={film.doc} media={new Map(film.media.map((m) => [m.id, m]))} />
                </div>
              </div>
            ) : null}
            {hasNotes ? (
              <div className={styles.notes}>
                <MakingOf notes={film.notes} />
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {newer || older ? (
        <Section tone="dark" sub>
          <nav className={styles.neighbors} aria-label="이전·다음 작품">
            {older ? <SmartLink href={`/films/${older.slug}`}>← 이전 작품 · {older.title}</SmartLink> : <span />}
            {newer ? <SmartLink href={`/films/${newer.slug}`}>다음 작품 · {newer.title} →</SmartLink> : <span />}
          </nav>
        </Section>
      ) : null}

      <FilmsCallout email={email} title={copy.calloutTitle} body={copy.calloutBody} />
    </>
  );
}
