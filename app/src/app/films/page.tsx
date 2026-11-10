import type { Metadata } from "next";
import { Suspense } from "react";
import { FilmCard } from "@/components/site/FilmCard";
import { FilmPlayer } from "@/components/site/FilmPlayer";
import { FilmsCallout } from "@/components/site/FilmsCallout";
import { FilteredList, type FilteredItem } from "@/components/site/FilteredList";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { contactConfig } from "@/config/site";
import { filmsConfig } from "@/config/films";
import { NOTE_KEYS } from "@/content/videoFields";
import { featuredOf, tagsOf } from "@/data/filmQueries";
import { listFilms } from "@/data/films";
import { formatDate } from "@/lib/format";
import { getSiteSettings } from "@/settings/read";
import pages from "../pages.module.css";
import styles from "./films.module.css";

/** 한 페이지에 보이는 작품 수 (대표 작품 제외, 결정 17) */
const FILMS_PAGE_SIZE = 9;

export const metadata: Metadata = { title: "Films" };

/** 발행·취소·삭제 때 바로 갱신되고, 예약 시각은 최대 5분 안에 반영된다 */
export const revalidate = 300;

/**
 * FILMS 목록 (SCREEN-SPEC §5.14). 대표 작품은 크게, 나머지는 카드로. 태그 필터는 URL(?tag=)에 남는다.
 * 작품이 아직 없으면 "곧 첫 작품을 공개합니다" 안내(FILMS-10).
 */
export default async function FilmsPage() {
  const films = await listFilms();
  const featured = featuredOf(films);
  const others = films.filter((f) => f !== featured);
  const settings = await getSiteSettings();
  const email = settings["contact.email"] ?? contactConfig.email;
  const items: FilteredItem[] = others.map((f) => ({
    id: f.slug,
    values: f.tags,
    node: <FilmCard href={`/films/${f.slug}`} title={f.title} summary={f.summary || undefined} dateLabel={formatDate(f.publishedAt)} duration={f.duration || undefined} hasCaptions={f.hasCaptions} poster={f.poster} headingLevel={3} />,
  }));
  const hasNotes = featured ? NOTE_KEYS.some((k) => featured.notes[k] !== "") : false;

  return (
    <>
      <Section tone="dark" sub>
        <SectionHeader
          label={filmsConfig.label}
          as="h1"
          size="h1"
          title={
            <>
              {filmsConfig.title[0]}
              <br />
              {filmsConfig.title[1]}
            </>
          }
          description={filmsConfig.subtitle}
        />
        {featured ? (
          <div className={styles.featured}>
            <FilmPlayer videoUrl={featured.videoUrl} title={featured.title} poster={featured.poster} badge={featured.cutLabel || undefined} />
            <div className={styles.featuredBody}>
              <div className={styles.featuredText}>
                <p className={styles.meta}>{["대표 작품", formatDate(featured.publishedAt), featured.duration, featured.hasCaptions ? "자막 있음" : ""].filter(Boolean).join(" · ")}</p>
                <h2 className={styles.featuredTitle}>{featured.title}</h2>
                {featured.summary ? <p className={styles.summary}>{featured.summary}</p> : null}
              </div>
              <div className={styles.actions}>
                {hasNotes ? (
                  <Button href={`/films/${featured.slug}#making-of`} variant="primary" size="M">
                    제작 노트 보기
                  </Button>
                ) : null}
                <Button href={`/films/${featured.slug}`} variant={hasNotes ? "outline" : "primary"} size="M">
                  작품 상세
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className={pages.empty}>{filmsConfig.empty}</p>
        )}
      </Section>

      {others.length > 0 ? (
        <Section tone="light" sub>
          <h2 className={styles.others}>다른 작품</h2>
          <Suspense fallback={null}>
            <FilteredList
              label="작품 태그"
              param="tag"
              options={tagsOf(others).map((t) => ({ value: t, label: t }))}
              items={items}
              surface="light"
              listClassName={styles.grid}
              pagination={{ mode: "pages", size: FILMS_PAGE_SIZE }}
              empty={<p className={pages.emptyLight}>이 태그의 작품이 없습니다.</p>}
            />
          </Suspense>
        </Section>
      ) : null}

      <FilmsCallout email={email} />
    </>
  );
}
