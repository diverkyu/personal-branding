/**
 * 공개 화면용 Films(영상) 조회 (ADMIN-DESIGN §28, SCREEN-SPEC §5.14·5.15). 캐시·환경 분기 없이 DB 질의만 한다 → 시험하기 쉽다.
 *
 * - 공개 기준은 스토리·투어·장비와 같다: 삭제되지 않았고, 발행됨이거나 예약 시각이 지난 예약.
 * - 공개 내용은 본문 칸(body·fields·summary)이다. 수정 중인 내용(draft 칸)은 읽지 않는다.
 * - 영상 주소가 허용 도메인이 아니거나, 포스터가 없거나(삭제 포함) 대체 텍스트가 없는 작품은 숨긴다
 *   (발행 점검이 막지만 저장소가 손상돼도 화면이 깨지지 않게, 대체 텍스트 없는 이미지를 공개하지 않게).
 * - 제작 노트는 글자 그대로 읽는다(가공 없음). 영상 소개(본문)는 읽을 때 다시 검사하고, 통과하지 못하면 소개만 뺀다(작품은 보인다).
 * - 대표 작품 = "대표 작품" 체크한 것 중 가장 최근 공개, 없으면 가장 최근 공개작 (결정 12).
 */
import { and, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { AdminDb } from "@/data/admin/db";
import { collectMediaIds, isBodyEmpty, sanitizeBody, type BodyDoc } from "@/content/body";
import type { BodyMedia } from "@/content/ContentBody";
import { NOTE_KEYS, readVideoFields, type NoteKey, type VideoFields } from "@/content/videoFields";
import { contents, media } from "@/db/schema";
import { parseVideoUrl } from "@/lib/video";
import { kstDate } from "./storyQueries";

export interface FilmPoster {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface FilmItem {
  slug: string;
  title: string;
  /** 영상 설명 (요약). 없을 수 있다 */
  summary: string;
  /** 공개된 날짜 (한국 시간 기준 YYYY-MM-DD) */
  publishedAt: string;
  /** 공개된 시각 (ISO). 구조화 데이터·정렬용 */
  publishedAtIso: string;
  tags: string[];
  /** 길이 ("3:25"). 없을 수 있다 */
  duration: string;
  hasCaptions: boolean;
  cutLabel: string;
  featured: boolean;
  /** 시청 주소 (정규화). 재생기가 허용 도메인 임베드로 바꾼다 */
  videoUrl: string;
  poster: FilmPoster;
  /** 제작 노트 3칸. 비운 칸은 빈 문자열 */
  notes: Record<NoteKey, string>;
}

export interface FilmDetail extends FilmItem {
  /** 영상 소개 (본문). 비어 있거나 검사를 통과하지 못하면 null */
  doc: BodyDoc | null;
  media: BodyMedia[];
  seoTitle: string;
  seoDescription: string;
}

function liveFilms(now: Date) {
  return and(
    eq(contents.type, "video"),
    isNull(contents.deletedAt),
    or(eq(contents.status, "published"), and(eq(contents.status, "scheduled"), lte(contents.publishAt, now))),
  );
}

const liveAt = sql<Date>`coalesce(${contents.publishedAt}, ${contents.publishAt})`;
const at = (v: Date | string) => (v instanceof Date ? v : new Date(v));

type Row = { slug: string; title: string; summary: string; tags: string[]; fields: unknown; liveAt: Date | string };

function toItem(row: Row, f: VideoFields, poster: FilmPoster): FilmItem {
  const date = at(row.liveAt);
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    publishedAt: kstDate(date),
    publishedAtIso: date.toISOString(),
    tags: row.tags,
    duration: f.duration,
    hasCaptions: f.hasCaptions,
    cutLabel: f.cutLabel,
    featured: f.featured,
    videoUrl: f.videoUrl,
    poster,
    notes: Object.fromEntries(NOTE_KEYS.map((k) => [k, f[k]])) as Record<NoteKey, string>,
  };
}

/** 허용 도메인 영상 주소가 있는 작품만 */
const playable = (f: VideoFields): boolean => Boolean(f.videoUrl && parseVideoUrl(f.videoUrl));

async function postersOf(db: AdminDb, ids: string[]) {
  const rows = ids.length > 0 ? await db.select().from(media).where(and(inArray(media.id, ids), isNull(media.deletedAt))) : [];
  return new Map(rows.map((m) => [m.id, m]));
}

const posterOf = (m: { url: string; alt: string | null; width: number; height: number } | undefined): FilmPoster | null =>
  m && (m.alt ?? "").trim() ? { src: m.url, alt: (m.alt ?? "").trim(), width: m.width, height: m.height } : null;

/** 공개된 작품 전부 (최신 공개 순, 영상 소개 없음) */
export async function queryLiveFilms(db: AdminDb, now: Date = new Date()): Promise<FilmItem[]> {
  const rows = await db
    .select({ slug: contents.slug, title: contents.title, summary: contents.summary, tags: contents.tags, fields: contents.fields, liveAt })
    .from(contents)
    .where(liveFilms(now))
    .orderBy(sql`${liveAt} desc`, sql`${contents.createdAt} desc`);
  const parsed = rows.map((row) => ({ row, f: readVideoFields(row.fields) })).filter(({ f }) => playable(f) && f.posterMediaId);
  const byId = await postersOf(db, [...new Set(parsed.map((p) => p.f.posterMediaId as string))]);
  const items: FilmItem[] = [];
  for (const { row, f } of parsed) {
    const poster = posterOf(byId.get(f.posterMediaId as string));
    if (poster) items.push(toItem(row, f, poster));
  }
  return items;
}

export async function queryLiveFilm(db: AdminDb, slug: string, now: Date = new Date()): Promise<FilmDetail | null> {
  const [row] = await db
    .select({ slug: contents.slug, title: contents.title, summary: contents.summary, tags: contents.tags, fields: contents.fields, body: contents.body, seoTitle: contents.seoTitle, seoDescription: contents.seoDescription, liveAt })
    .from(contents)
    .where(and(liveFilms(now), eq(contents.slug, slug)))
    .limit(1);
  if (!row) return null;
  const f = readVideoFields(row.fields);
  if (!playable(f) || !f.posterMediaId) return null;
  const body = sanitizeBody(row.body);
  const doc = body.ok && !isBodyEmpty(body.doc) ? body.doc : null;
  const bodyIds = doc ? collectMediaIds(doc) : [];
  const ids = [...new Set([f.posterMediaId, ...bodyIds])];
  const byId = await postersOf(db, ids);
  const poster = posterOf(byId.get(f.posterMediaId));
  if (!poster) return null;
  return {
    ...toItem(row, f, poster),
    doc,
    media: bodyIds.flatMap((id) => {
      const m = byId.get(id);
      return m ? [{ id: m.id, url: m.url, alt: m.alt ?? "", width: m.width, height: m.height }] : [];
    }),
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
  };
}

/** 대표 작품: 대표 체크한 것 중 가장 최근, 없으면 가장 최근 공개작. 목록은 최신 공개 순이어야 한다 */
export function featuredOf<T extends { featured: boolean }>(list: T[]): T | null {
  return list.find((f) => f.featured) ?? list[0] ?? null;
}

/** 이전(더 오래된)·다음(더 새로운) 작품. 목록은 최신 공개 순 */
export function neighborsOf<T extends { slug: string }>(list: T[], slug: string): { newer: T | null; older: T | null } {
  const i = list.findIndex((f) => f.slug === slug);
  if (i < 0) return { newer: null, older: null };
  return { newer: i > 0 ? (list[i - 1] ?? null) : null, older: list[i + 1] ?? null };
}

/** 공개 작품에 쓰인 태그 (많이 쓰인 순, 같으면 가나다) */
export function tagsOf(list: Pick<FilmItem, "tags">[]): string[] {
  const count = new Map<string, number>();
  for (const f of list) for (const t of new Set(f.tags)) count.set(t, (count.get(t) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko")).map(([t]) => t);
}
