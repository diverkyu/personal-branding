/**
 * 공개 화면용 여행 추천 조회 (ADMIN-DESIGN §27, SCREEN-SPEC §5.16·5.17). 캐시·환경 분기 없이 DB 질의만 한다 → 시험하기 쉽다.
 *
 * - 공개 기준은 스토리·투어·장비·Films 와 같다: 삭제되지 않았고, 발행됨이거나 예약 시각이 지난 예약.
 * - 공개 내용은 본문 칸(body·fields·summary)이다. 수정 중인 내용(draft 칸)은 읽지 않는다.
 * - 지역·장소가 비어 있는 글은 숨긴다(발행 점검이 막지만 저장소가 손상돼도 화면이 깨지지 않게).
 * - 본문은 읽을 때 다시 검사하고, 통과하지 못하면 본문만 뺀다(글은 보인다).
 */
import { and, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { AdminDb } from "@/data/admin/db";
import { collectMediaIds, isBodyEmpty, sanitizeBody, type BodyDoc } from "@/content/body";
import type { BodyMedia } from "@/content/ContentBody";
import { LEVEL_LABELS, readTravelFields, type TravelFields, type TravelLevel } from "@/content/travelFields";
import { contents, media } from "@/db/schema";
import { kstDate } from "./storyQueries";

export interface TravelItem {
  slug: string;
  title: string;
  /** 한 줄 소개 (요약). 없을 수 있다 */
  summary: string;
  region: string;
  place: string;
  season: string;
  level: TravelLevel;
  budget: string;
  /** 정보 확인일 (YYYY-MM-DD). 없을 수 있다 */
  checkedAt: string;
  /** 공개된 날짜 (한국 시간 기준 YYYY-MM-DD) */
  publishedAt: string;
  publishedAtIso: string;
}

export interface TravelDetail extends TravelItem {
  doc: BodyDoc | null;
  media: BodyMedia[];
  seoTitle: string;
  seoDescription: string;
}

function liveTravel(now: Date) {
  return and(
    eq(contents.type, "travel"),
    isNull(contents.deletedAt),
    or(eq(contents.status, "published"), and(eq(contents.status, "scheduled"), lte(contents.publishAt, now))),
  );
}

const liveAt = sql<Date>`coalesce(${contents.publishedAt}, ${contents.publishAt})`;
const at = (v: Date | string) => (v instanceof Date ? v : new Date(v));

type Row = { slug: string; title: string; summary: string; fields: unknown; liveAt: Date | string };

const shown = (f: TravelFields) => Boolean(f.region && f.place);

function toItem(row: Row, f: TravelFields): TravelItem {
  const date = at(row.liveAt);
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    region: f.region,
    place: f.place,
    season: f.season,
    level: f.level,
    budget: f.budget,
    checkedAt: f.checkedAt,
    publishedAt: kstDate(date),
    publishedAtIso: date.toISOString(),
  };
}

/** 공개된 여행 추천 전부 (최신 공개 순, 본문 없음) */
export async function queryLiveTravel(db: AdminDb, now: Date = new Date()): Promise<TravelItem[]> {
  const rows = await db
    .select({ slug: contents.slug, title: contents.title, summary: contents.summary, fields: contents.fields, liveAt })
    .from(contents)
    .where(liveTravel(now))
    .orderBy(sql`${liveAt} desc`, sql`${contents.createdAt} desc`);
  return rows.map((row) => ({ row, f: readTravelFields(row.fields) })).filter(({ f }) => shown(f)).map(({ row, f }) => toItem(row, f));
}

export async function queryLiveTravelItem(db: AdminDb, slug: string, now: Date = new Date()): Promise<TravelDetail | null> {
  const [row] = await db
    .select({ slug: contents.slug, title: contents.title, summary: contents.summary, fields: contents.fields, body: contents.body, seoTitle: contents.seoTitle, seoDescription: contents.seoDescription, liveAt })
    .from(contents)
    .where(and(liveTravel(now), eq(contents.slug, slug)))
    .limit(1);
  if (!row) return null;
  const f = readTravelFields(row.fields);
  if (!shown(f)) return null;
  const body = sanitizeBody(row.body);
  const doc = body.ok && !isBodyEmpty(body.doc) ? body.doc : null;
  const ids = doc ? collectMediaIds(doc) : [];
  const found = ids.length > 0 ? await db.select().from(media).where(and(inArray(media.id, ids), isNull(media.deletedAt))) : [];
  return {
    ...toItem(row, f),
    doc,
    media: found.map((m) => ({ id: m.id, url: m.url, alt: m.alt ?? "", width: m.width, height: m.height })),
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
  };
}

/** 공개 글에 쓰인 지역 (많이 쓰인 순, 같으면 가나다) */
export function regionsOf(list: Pick<TravelItem, "region">[]): string[] {
  const count = new Map<string, number>();
  for (const t of list) count.set(t.region, (count.get(t.region) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko")).map(([r]) => r);
}

/** 공개 글에 쓰인 난이도 (입문 → 중급 → 상급 순). 쓴 글이 없으면 빈 목록 */
export function levelsOf(list: Pick<TravelItem, "level">[]): { value: TravelLevel; label: string }[] {
  const used = new Set(list.map((t) => t.level));
  return (["beginner", "intermediate", "advanced"] as const).filter((v) => used.has(v)).map((v) => ({ value: v, label: LEVEL_LABELS[v] }));
}

/** 이전(더 오래된)·다음(더 새로운) 글. 목록은 최신 공개 순 */
export function neighborsOf<T extends { slug: string }>(list: T[], slug: string): { newer: T | null; older: T | null } {
  const i = list.findIndex((t) => t.slug === slug);
  if (i < 0) return { newer: null, older: null };
  return { newer: i > 0 ? (list[i - 1] ?? null) : null, older: list[i + 1] ?? null };
}

/**
 * 정보 확인일이 `months` 개월보다 오래됐는지 (결정 T-5). 확인일이 없거나 잘못되면 null(판단할 수 없음).
 * 날짜 비교만 하므로 시각·시간대에 영향받지 않는다 (확인일 + months 개월 < 오늘 이면 오래됨).
 */
export function isStaleCheck(checkedAt: string, today: string, months: number): boolean | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(checkedAt);
  if (!m) return null;
  const limit = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + months, Number(m[3])));
  const now = new Date(`${today}T00:00:00Z`);
  if (Number.isNaN(limit.getTime()) || Number.isNaN(now.getTime())) return null;
  return limit.getTime() < now.getTime();
}
