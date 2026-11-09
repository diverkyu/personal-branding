/**
 * 공개 화면용 스토리 조회 (ADMIN-DESIGN §14, AD-5c). 캐시·환경 분기 없이 DB 질의만 한다 → 시험하기 쉽다.
 *
 * 규칙:
 * - 공개되는 글 = 삭제되지 않았고, 발행됨(published)이거나 예약 시각이 지난 예약(scheduled).
 *   (예약 시각이 지난 글은 크론이 아직 돌지 않았어도 공개로 본다 — isLive 와 같은 기준)
 * - 공개 내용은 항상 본문 칸(body)이다. 발행된 글을 고치는 중인 내용(draft 칸)은 읽지 않는다.
 * - 저장된 본문은 읽을 때 한 번 더 검사한다(sanitizeBody). 통과하지 못하면 본문 없이 보여 주지 않고 글 전체를 숨긴다.
 */
import { and, desc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { AdminDb } from "@/data/admin/db";
import { collectMediaIds, plainTextFromBody, sanitizeBody, type BodyDoc } from "@/content/body";
import type { BodyMedia } from "@/content/ContentBody";
import { contents, media } from "@/db/schema";
import type { ThumbVariant } from "@/components/ui/Thumb";

export interface StoryListItem {
  slug: string;
  title: string;
  /** 요약. 비어 있으면 본문 앞부분 */
  summary: string;
  /** 공개된 날짜 (한국 시간 기준 YYYY-MM-DD) */
  publishedAt: string;
  /** 공개된 시각 (ISO). 구조화 데이터·사이트맵용 */
  publishedAtIso: string;
  tags: string[];
  thumbVariant: ThumbVariant;
}

export interface StoryDetail extends StoryListItem {
  doc: BodyDoc;
  media: BodyMedia[];
  questions: string[];
  /** 검색 제목·설명 (비어 있으면 제목·요약을 쓴다) */
  seoTitle: string;
  seoDescription: string;
}

const VARIANTS: readonly ThumbVariant[] = ["sea-a", "sea-b", "sea-c", "sea-d"];

/** 글마다 항상 같은 장식 색을 고른다 (대표 이미지가 생기기 전까지 카드 배경) */
export function thumbVariantFor(slug: string): ThumbVariant {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return VARIANTS[h % VARIANTS.length] as ThumbVariant;
}

/** 한국 시간 기준 날짜(YYYY-MM-DD) */
export function kstDate(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** 공개 시각: 실제로 공개된 시각, 없으면 예약 시각 */
const liveAt = sql<Date>`coalesce(${contents.publishedAt}, ${contents.publishAt})`;

function liveStories(now: Date) {
  return and(
    eq(contents.type, "story"),
    isNull(contents.deletedAt),
    or(eq(contents.status, "published"), and(eq(contents.status, "scheduled"), lte(contents.publishAt, now))),
  );
}

function at(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

const SUMMARY_FALLBACK_CHARS = 160;

export async function queryLiveStories(db: AdminDb, now: Date = new Date()): Promise<StoryListItem[]> {
  const rows = await db
    .select({
      slug: contents.slug,
      title: contents.title,
      summary: contents.summary,
      tags: contents.tags,
      liveAt,
      // 요약이 비어 있는 글만 본문을 읽는다
      body: sql<unknown>`case when ${contents.summary} = '' then ${contents.body} else null end`,
    })
    .from(contents)
    .where(liveStories(now))
    .orderBy(desc(liveAt), desc(contents.createdAt));

  const items: StoryListItem[] = [];
  for (const r of rows) {
    let summary = r.summary;
    if (!summary) {
      const body = sanitizeBody(r.body);
      if (!body.ok) continue;
      summary = plainTextFromBody(body.doc).slice(0, SUMMARY_FALLBACK_CHARS);
    }
    const when = at(r.liveAt);
    items.push({ slug: r.slug, title: r.title, summary, publishedAt: kstDate(when), publishedAtIso: when.toISOString(), tags: r.tags, thumbVariant: thumbVariantFor(r.slug) });
  }
  return items;
}

export async function queryLiveStory(db: AdminDb, slug: string, now: Date = new Date()): Promise<StoryDetail | null> {
  const [row] = await db
    .select({
      slug: contents.slug,
      title: contents.title,
      summary: contents.summary,
      tags: contents.tags,
      answers: contents.answers,
      seoTitle: contents.seoTitle,
      seoDescription: contents.seoDescription,
      body: contents.body,
      liveAt,
    })
    .from(contents)
    .where(and(liveStories(now), eq(contents.slug, slug)))
    .limit(1);
  if (!row) return null;

  const body = sanitizeBody(row.body);
  if (!body.ok) return null;

  const ids = collectMediaIds(body.doc);
  const mediaRows = ids.length > 0 ? await db.select().from(media).where(and(inArray(media.id, ids), isNull(media.deletedAt))) : [];
  const when = at(row.liveAt);
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary || plainTextFromBody(body.doc).slice(0, SUMMARY_FALLBACK_CHARS),
    publishedAt: kstDate(when),
    publishedAtIso: when.toISOString(),
    tags: row.tags,
    thumbVariant: thumbVariantFor(row.slug),
    doc: body.doc,
    media: mediaRows.map((m) => ({ id: m.id, url: m.url, alt: m.alt ?? "", width: m.width, height: m.height })),
    questions: row.answers,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
  };
}

/** 이전(더 오래된)·다음(더 새로운) 글. 목록은 최신 순이다 */
export function neighborsOf(list: StoryListItem[], slug: string): { newer?: StoryListItem; older?: StoryListItem } {
  const i = list.findIndex((s) => s.slug === slug);
  if (i < 0) return {};
  return { newer: list[i - 1], older: list[i + 1] };
}

export function tagsOf(list: StoryListItem[]): string[] {
  return [...new Set(list.flatMap((s) => s.tags))];
}
