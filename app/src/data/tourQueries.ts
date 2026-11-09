/**
 * 공개 화면용 투어 조회 (ADMIN-DESIGN §22). 캐시·환경 분기 없이 DB 질의만 한다 → 시험하기 쉽다.
 *
 * - 공개 기준은 스토리와 같다: 삭제되지 않았고, 발행됨이거나 예약 시각이 지난 예약.
 * - 공개 내용은 본문 칸(body·fields)이다. 수정 중인 내용(draft 칸)은 읽지 않는다.
 * - 상태는 저장하지 않고 계산한다: 종료일이 오늘(한국 시간)보다 앞서면 "종료", 아니면 모집 상태.
 * - 일정·장소가 비어 있거나 깨진 투어는 숨긴다(발행 점검이 막지만 저장소가 손상돼도 화면이 깨지지 않게).
 */
import { and, desc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { AdminDb } from "@/data/admin/db";
import { collectMediaIds, plainTextFromBody, sanitizeBody } from "@/content/body";
import type { BodyDoc } from "@/content/body";
import type { BodyMedia } from "@/content/ContentBody";
import { readTourFields, tourStatusOf, type TourFields } from "@/content/tourFields";
import { contents, media } from "@/db/schema";
import type { Tour } from "@/types/content";
import { kstDate, thumbVariantFor } from "./storyQueries";

export interface TourItem extends Tour {
  /** 본문 문서. 상세에서만 채운다 (가상 데이터는 description 단락을 쓴다) */
  doc?: BodyDoc;
  media?: BodyMedia[];
  seoTitle?: string;
  seoDescription?: string;
  /** 상세 위의 큰 이미지(갤러리 첫 장) */
  cover?: { src: string; alt: string };
}

const SUMMARY_FALLBACK_CHARS = 160;

function liveTours(now: Date) {
  return and(
    eq(contents.type, "tour"),
    isNull(contents.deletedAt),
    or(eq(contents.status, "published"), and(eq(contents.status, "scheduled"), lte(contents.publishAt, now))),
  );
}

function isShown(f: TourFields): boolean {
  return Boolean(f.startDate && f.endDate && f.place);
}

function extrasOf(f: TourFields): string[] | undefined {
  const out: string[] = [];
  if (f.gallery.length > 0) out.push(`갤러리 ${f.gallery.length}장`);
  if (f.videos.length > 0) out.push("스케치 영상");
  return out.length > 0 ? out : undefined;
}

function toItem(row: { slug: string; title: string; summary: string; fields: unknown }, today: string, summary: string): Tour {
  const f = readTourFields(row.fields);
  return {
    slug: row.slug,
    title: row.title,
    status: tourStatusOf(f, today),
    startDate: f.startDate,
    endDate: f.endDate,
    place: f.place,
    capacity: f.capacity ?? undefined,
    summary,
    description: [],
    feeNote: f.feeNote || undefined,
    videos: f.videos.length > 0 ? f.videos : undefined,
    extras: extrasOf(f),
    thumbVariant: thumbVariantFor(row.slug),
  };
}

/** 공개된 투어 전부(목록용, 본문 없음). 정렬은 부르는 쪽이 한다 */
export async function queryLiveTours(db: AdminDb, now: Date = new Date()): Promise<TourItem[]> {
  const rows = await db
    .select({
      slug: contents.slug,
      title: contents.title,
      summary: contents.summary,
      fields: contents.fields,
      body: sql<unknown>`case when ${contents.summary} = '' then ${contents.body} else null end`,
    })
    .from(contents)
    .where(liveTours(now))
    .orderBy(desc(contents.createdAt));
  const today = kstDate(now);
  const items: TourItem[] = [];
  for (const r of rows) {
    if (!isShown(readTourFields(r.fields))) continue;
    let summary = r.summary;
    if (!summary) {
      const body = sanitizeBody(r.body);
      if (!body.ok) continue;
      summary = plainTextFromBody(body.doc).slice(0, SUMMARY_FALLBACK_CHARS);
    }
    items.push(toItem(r, today, summary));
  }
  return items;
}

export async function queryLiveTour(db: AdminDb, slug: string, now: Date = new Date()): Promise<TourItem | null> {
  const [row] = await db
    .select({
      slug: contents.slug,
      title: contents.title,
      summary: contents.summary,
      fields: contents.fields,
      body: contents.body,
      seoTitle: contents.seoTitle,
      seoDescription: contents.seoDescription,
    })
    .from(contents)
    .where(and(liveTours(now), eq(contents.slug, slug)))
    .limit(1);
  if (!row) return null;
  const f = readTourFields(row.fields);
  if (!isShown(f)) return null;
  const body = sanitizeBody(row.body);
  if (!body.ok) return null;

  const ids = [...new Set([...collectMediaIds(body.doc), ...f.gallery.map((g) => g.mediaId)])];
  const mediaRows = ids.length > 0 ? await db.select().from(media).where(and(inArray(media.id, ids), isNull(media.deletedAt))) : [];
  const byId = new Map(mediaRows.map((m) => [m.id, m]));
  const gallery = f.gallery.flatMap((g) => {
    const m = byId.get(g.mediaId);
    return m ? [{ alt: m.alt ?? "", caption: g.caption || undefined, src: m.url, variant: thumbVariantFor(g.mediaId) }] : [];
  });
  const base = toItem(row, kstDate(now), row.summary || plainTextFromBody(body.doc).slice(0, SUMMARY_FALLBACK_CHARS));
  const first = gallery[0];
  return {
    ...base,
    gallery: gallery.length > 0 ? gallery : undefined,
    extras: extrasOf({ ...f, gallery: f.gallery.filter((g) => byId.has(g.mediaId)) }),
    doc: body.doc,
    media: mediaRows.map((m) => ({ id: m.id, url: m.url, alt: m.alt ?? "", width: m.width, height: m.height })),
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    cover: first?.src ? { src: first.src, alt: first.alt } : undefined,
  };
}

/** 진행 예정(종료가 아닌 것) — 시작일이 가까운 순 */
export function upcomingOf(list: Tour[]): Tour[] {
  return list.filter((t) => t.status !== "ended").sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** 모집 중 또는 모집 예정 */
export function openOf(list: Tour[]): Tour[] {
  return upcomingOf(list).filter((t) => t.status === "recruiting" || t.status === "upcoming");
}

/** 종료된 투어 — 종료일이 최근인 순 */
export function pastOf(list: Tour[]): Tour[] {
  return list.filter((t) => t.status === "ended").sort((a, b) => b.endDate.localeCompare(a.endDate));
}
