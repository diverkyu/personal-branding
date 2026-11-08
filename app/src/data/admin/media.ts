/**
 * 어드민의 미디어 라이브러리 데이터 함수 (ADMIN-DESIGN §9). 모든 함수는 `admin: AdminSession`을 받고,
 * 업로드·대체 텍스트 수정·삭제는 활동 기록에 남는다 (파일명·대체 텍스트 내용은 기록하지 않는다).
 */
import { and, count, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { contents, media, type MediaRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import type { AdminSession } from "@/lib/auth/types";
import { recordAudit } from "./audit";
import type { AdminDb } from "./db";
import { isUuid } from "./inquiryQuery";

export const MEDIA_PAGE_SIZE = 24;
export const ALT_MAX = 200;

export interface NewMedia {
  storage: "blob" | "local";
  storageKey: string;
  url: string;
  bytes: number;
  width: number;
  height: number;
  alt?: string;
}

export function validateAlt(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.replace(/\s+/g, " ").trim();
  if (value.length > ALT_MAX) return { ok: false, error: `대체 텍스트는 ${ALT_MAX}자 이하여야 합니다.` };
  return { ok: true, value };
}

export async function listMedia(db: AdminDb, admin: AdminSession, page: number): Promise<{ items: MediaRow[]; total: number; page: number; pageSize: number; missingAlt: number }> {
  void admin;
  const safePage = Math.max(1, Math.min(Math.floor(page) || 1, 1000));
  const live = isNull(media.deletedAt);
  const [totalRow] = await db.select({ value: count() }).from(media).where(live);
  const rows = await db.select().from(media).where(live).orderBy(desc(media.createdAt)).limit(MEDIA_PAGE_SIZE).offset((safePage - 1) * MEDIA_PAGE_SIZE);
  const [missingRow] = await db.select({ value: count() }).from(media).where(and(live, isNull(media.alt)));
  return { items: rows, total: totalRow?.value ?? 0, page: safePage, pageSize: MEDIA_PAGE_SIZE, missingAlt: missingRow?.value ?? 0 };
}

export async function createMedia(db: AdminDb, admin: AdminSession, input: NewMedia): Promise<MediaRow> {
  const alt = validateAlt(input.alt ?? "");
  if (!alt.ok) throw new AppError("validation", alt.error);
  const [row] = await db
    .insert(media)
    .values({
      storage: input.storage,
      storageKey: input.storageKey,
      url: input.url,
      mime: "image/webp",
      bytes: input.bytes,
      width: input.width,
      height: input.height,
      alt: alt.value || null,
      createdBy: admin.userId,
    })
    .returning();
  if (!row) throw new AppError("external", "저장 결과가 비어 있습니다.");
  await recordAudit(db, admin, { action: "media.upload", targetType: "media", targetId: row.id, meta: { bytes: input.bytes, width: input.width, height: input.height } });
  return row;
}

export async function updateMediaAlt(db: AdminDb, admin: AdminSession, id: string, rawAlt: string): Promise<void> {
  if (!isUuid(id)) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  const alt = validateAlt(rawAlt);
  if (!alt.ok) throw new AppError("validation", alt.error);
  const updated = await db
    .update(media)
    .set({ alt: alt.value || null })
    .where(and(eq(media.id, id), isNull(media.deletedAt)))
    .returning({ id: media.id });
  if (updated.length === 0) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  await recordAudit(db, admin, { action: "media.alt_update", targetType: "media", targetId: id, meta: { length: alt.value.length } });
}

/**
 * 이 미디어를 쓰는 콘텐츠의 수: 삭제되지 않은 콘텐츠의 본문·수정 중인 내용·대표 이미지에서 이 이미지 id 를 찾는다.
 * 본문 JSON 은 id 를 소문자로만 저장하므로(검사기가 정리) 글자 검색으로 충분하고, id 에는 와일드카드 문자가 없다.
 * 영상·여행 추천 같은 새 유형이 이미지를 다른 곳에 두게 되면 여기에 함께 추가한다.
 */
export async function mediaUsageCount(db: AdminDb, admin: AdminSession, id: string): Promise<number> {
  void admin;
  if (!isUuid(id)) return 0;
  const pattern = `%${id.toLowerCase()}%`;
  const [row] = await db
    .select({ value: count() })
    .from(contents)
    .where(and(isNull(contents.deletedAt), or(eq(contents.coverMediaId, id), sql`${contents.body}::text like ${pattern}`, sql`${contents.draft}::text like ${pattern}`)));
  return row?.value ?? 0;
}

export interface PickerMedia {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
}

/** 편집기의 이미지 고르기 목록 (최근 60개) */
export async function listMediaForPicker(db: AdminDb, admin: AdminSession): Promise<PickerMedia[]> {
  void admin;
  const rows = await db.select().from(media).where(isNull(media.deletedAt)).orderBy(desc(media.createdAt)).limit(60);
  return rows.map((r) => ({ id: r.id, url: r.url, alt: r.alt ?? "", width: r.width, height: r.height }));
}

/** id 로 미디어를 가져온다 (본문 렌더링·점검용). 삭제된 것은 빠진다 */
export async function getMediaByIds(db: AdminDb, admin: AdminSession, ids: string[]): Promise<PickerMedia[]> {
  void admin;
  const valid = ids.filter(isUuid);
  if (valid.length === 0) return [];
  const rows = await db.select().from(media).where(and(inArray(media.id, valid), isNull(media.deletedAt)));
  return rows.map((r) => ({ id: r.id, url: r.url, alt: r.alt ?? "", width: r.width, height: r.height }));
}

/** 라이브러리에서 숨긴다(soft delete). 파일 자체의 정리는 휴지통 단계(AD-6)에서 30일 뒤 한다 */
export async function deleteMedia(db: AdminDb, admin: AdminSession, id: string): Promise<{ usage: number }> {
  if (!isUuid(id)) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  const usage = await mediaUsageCount(db, admin, id);
  if (usage > 0) throw new AppError("validation", `이 이미지는 ${usage}곳에서 쓰이고 있어 삭제할 수 없습니다.`);
  const removed = await db
    .update(media)
    .set({ deletedAt: new Date() })
    .where(and(eq(media.id, id), isNull(media.deletedAt)))
    .returning({ id: media.id });
  if (removed.length === 0) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  await recordAudit(db, admin, { action: "media.delete", targetType: "media", targetId: id });
  return { usage };
}
