/**
 * 화면이 Films(영상)를 읽는 입구 (서버 전용, AGENTS §6). 스토리·투어·장비(data/stories.ts 등)와 같은 규칙이다.
 * DATABASE_URL 이 있으면 DB 의 공개 작품(태그 캐시 최대 5분, 어드민 변경 때 즉시 갱신), 없으면 가상 작품 하나 —
 * 로컬 개발·자동 시험 전용이고 배포 환경(VERCEL)에서는 절대 쓰지 않는다. 목록 읽기가 실패하면 빈 목록(캐시하지 않음), 상세는 오류.
 */
import "server-only";
import { unstable_cache } from "next/cache";
import { STORIES_MAX_AGE_SECONDS, VIDEOS_TAG } from "@/content/cacheTags";
import { bodyFromPlainText } from "@/content/body";
import { getDb } from "@/db/client";
import type { AdminDb } from "@/data/admin/db";
import { logger } from "@/lib/logger";
import { featuredOf, neighborsOf, queryLiveFilm, queryLiveFilms, tagsOf, type FilmDetail, type FilmItem } from "./filmQueries";

export type { FilmDetail, FilmItem } from "./filmQueries";

function db(): AdminDb | null {
  const url = process.env.DATABASE_URL?.trim();
  return url ? (getDb(url) as unknown as AdminDb) : null;
}

/** 가상 작품은 배포 환경이 아닐 때만 쓴다 */
const shouldUseFixtures = () => !process.env.DATABASE_URL?.trim() && !process.env.VERCEL;

const cachedList = unstable_cache(async () => queryLiveFilms(db() as AdminDb), ["films-live-list"], { tags: [VIDEOS_TAG], revalidate: STORIES_MAX_AGE_SECONDS });
const cachedDetail = unstable_cache(async (slug: string) => queryLiveFilm(db() as AdminDb, slug), ["films-live-detail"], { tags: [VIDEOS_TAG], revalidate: STORIES_MAX_AGE_SECONDS });

/** 로컬 개발·시험용 가상 작품. 글은 모두 자리표시이고 영상 주소도 실제 영상이 아니다 */
const FIXTURE: FilmDetail = {
  slug: "sample-film",
  title: "작품 제목이 들어갑니다",
  summary: "영상 설명 한 줄이 이 자리에 보입니다. (자리표시)",
  publishedAt: "2026-11-01",
  publishedAtIso: "2026-11-01T00:00:00+09:00",
  tags: ["샘플"],
  duration: "1:00",
  hasCaptions: true,
  cutLabel: "ROUGH CUT",
  featured: true,
  videoUrl: "https://www.youtube.com/watch?v=AAAAAAAAAAA",
  poster: { src: "", alt: "샘플 포스터", width: 1280, height: 720 },
  notes: { sceneIntent: "장면 의도가 이 자리에 보입니다. (자리표시)", promptNotes: "", editNotes: "편집 판단이 이 자리에 보입니다. (자리표시)" },
  doc: bodyFromPlainText("영상 소개가 이 자리에 보입니다. (자리표시)"),
  media: [],
  seoTitle: "",
  seoDescription: "",
};

/** 공개된 작품 (최신 공개 순) */
export async function listFilms(): Promise<FilmItem[]> {
  if (shouldUseFixtures()) return [FIXTURE];
  if (!db()) return [];
  try {
    return await cachedList();
  } catch (error) {
    logger.error("films.list_failed", { errorType: error instanceof Error ? error.name : typeof error });
    return [];
  }
}

/** 공개된 작품 하나(상세용). 없거나 공개 전이면 null */
export async function getFilm(slug: string): Promise<FilmDetail | null> {
  if (shouldUseFixtures()) return slug === FIXTURE.slug ? FIXTURE : null;
  if (!db()) return null;
  // 목록에 없는 주소는 상세 캐시를 만들지 않는다 (임의 주소로 캐시가 쌓이지 않게)
  if (!(await listFilms()).some((f) => f.slug === slug)) return null;
  return cachedDetail(slug);
}

export async function getFeaturedFilm(): Promise<FilmItem | null> {
  return featuredOf(await listFilms());
}

export async function getFilmNeighbors(slug: string) {
  return neighborsOf(await listFilms(), slug);
}

export async function listFilmTags(): Promise<string[]> {
  return tagsOf(await listFilms());
}
