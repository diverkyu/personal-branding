/**
 * 공개 화면용 장비 조회 (ADMIN-DESIGN §23). 캐시·환경 분기 없이 DB 질의만 한다 → 시험하기 쉽다.
 *
 * - 공개 기준은 스토리·투어와 같다: 삭제되지 않았고, 발행됨이거나 예약 시각이 지난 예약.
 * - 공개 내용은 본문 칸(body·fields·summary)이다. 수정 중인 내용(draft 칸)은 읽지 않는다.
 * - 카테고리·한 줄 추천 이유가 비었거나 항목이 깨진 장비는 숨긴다(발행 점검이 막지만 저장소가 손상돼도 화면이 깨지지 않게).
 * - 순서: 노출 순서(작을수록 앞) → 공개 시각이 최근인 순.
 */
import { and, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { AdminDb } from "@/data/admin/db";
import { collectMediaIds, sanitizeBody } from "@/content/body";
import type { BodyDoc } from "@/content/body";
import type { BodyMedia } from "@/content/ContentBody";
import { readEquipmentFields, type EquipmentFields } from "@/content/equipmentFields";
import { contents, media } from "@/db/schema";
import type { Equipment, GalleryImage } from "@/types/content";
import { thumbVariantFor } from "./storyQueries";

export interface EquipmentItem extends Equipment {
  sortOrder: number;
  /** 공개 시각(ISO). 정렬용 */
  liveAtIso: string;
  /** 대표 이미지 */
  cover?: { src: string; alt: string };
  /** 추천 이유 상세 본문. 상세에서만 채운다 (가상 데이터는 reasonDetail 단락을 쓴다) */
  doc?: BodyDoc;
  media?: BodyMedia[];
  seoTitle?: string;
  seoDescription?: string;
}

function liveEquipment(now: Date) {
  return and(
    eq(contents.type, "equipment"),
    isNull(contents.deletedAt),
    or(eq(contents.status, "published"), and(eq(contents.status, "scheduled"), lte(contents.publishAt, now))),
  );
}

const liveAt = sql<Date>`coalesce(${contents.publishedAt}, ${contents.publishAt})`;
const at = (v: Date | string) => (v instanceof Date ? v : new Date(v));

function isShown(f: EquipmentFields, reason: string): boolean {
  return Boolean(f.category && reason);
}

function toItem(row: { slug: string; title: string; summary: string; liveAt: Date | string }, f: EquipmentFields): EquipmentItem {
  return {
    slug: row.slug,
    name: row.title,
    category: f.category,
    brand: f.brand || undefined,
    reason: row.summary,
    features: f.features.length > 0 ? f.features : undefined,
    priceNote: f.priceNote || undefined,
    checkedAt: f.checkedAt || undefined,
    action: f.action,
    externalUrl: f.action === "external" && f.externalUrl ? f.externalUrl : undefined,
    buttonLabel: f.buttonLabel || undefined,
    affiliate: f.action === "external" ? f.affiliate : undefined,
    thumbVariant: thumbVariantFor(row.slug),
    sortOrder: f.sortOrder,
    liveAtIso: at(row.liveAt).toISOString(),
  };
}

/** 노출 순서 → 공개 시각이 최근인 순 */
export function sortEquipment<T extends { sortOrder: number; liveAtIso: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || b.liveAtIso.localeCompare(a.liveAtIso));
}

/** 공개된 장비 전부(목록용, 본문 없음) */
export async function queryLiveEquipment(db: AdminDb, now: Date = new Date()): Promise<EquipmentItem[]> {
  const rows = await db.select({ slug: contents.slug, title: contents.title, summary: contents.summary, fields: contents.fields, liveAt }).from(contents).where(liveEquipment(now));
  const parsed = rows.map((r) => ({ row: r, f: readEquipmentFields(r.fields) })).filter(({ row, f }) => isShown(f, row.summary));
  const thumbIds = [...new Set(parsed.map((p) => p.f.thumbMediaId).filter((id): id is string => Boolean(id)))];
  const mediaRows = thumbIds.length > 0 ? await db.select().from(media).where(and(inArray(media.id, thumbIds), isNull(media.deletedAt))) : [];
  const byId = new Map(mediaRows.map((m) => [m.id, m]));
  const items = parsed.map(({ row, f }) => {
    const item = toItem(row, f);
    const m = f.thumbMediaId ? byId.get(f.thumbMediaId) : undefined;
    return m ? { ...item, cover: { src: m.url, alt: m.alt ?? "" } } : item;
  });
  return sortEquipment(items);
}

export async function queryLiveEquipmentItem(db: AdminDb, slug: string, now: Date = new Date()): Promise<EquipmentItem | null> {
  const [row] = await db
    .select({ slug: contents.slug, title: contents.title, summary: contents.summary, fields: contents.fields, body: contents.body, seoTitle: contents.seoTitle, seoDescription: contents.seoDescription, liveAt })
    .from(contents)
    .where(and(liveEquipment(now), eq(contents.slug, slug)))
    .limit(1);
  if (!row) return null;
  const f = readEquipmentFields(row.fields);
  if (!isShown(f, row.summary)) return null;
  const body = sanitizeBody(row.body);
  if (!body.ok) return null;

  const ids = [...new Set([...collectMediaIds(body.doc), ...(f.thumbMediaId ? [f.thumbMediaId] : []), ...f.images])];
  const mediaRows = ids.length > 0 ? await db.select().from(media).where(and(inArray(media.id, ids), isNull(media.deletedAt))) : [];
  const byId = new Map(mediaRows.map((m) => [m.id, m]));
  const thumb = f.thumbMediaId ? byId.get(f.thumbMediaId) : undefined;
  const images: GalleryImage[] = f.images.flatMap((id) => {
    const m = byId.get(id);
    return m ? [{ alt: m.alt ?? "", src: m.url, variant: thumbVariantFor(id) }] : [];
  });
  return {
    ...toItem(row, f),
    images: images.length > 0 ? images : undefined,
    cover: thumb ? { src: thumb.url, alt: thumb.alt ?? "" } : undefined,
    doc: body.doc,
    media: mediaRows.map((m) => ({ id: m.id, url: m.url, alt: m.alt ?? "", width: m.width, height: m.height })),
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
  };
}

/** 카테고리: 목록 순서대로 처음 나온 순서 */
export function categoriesOf(list: Pick<Equipment, "category">[]): string[] {
  return [...new Set(list.map((e) => e.category))];
}
