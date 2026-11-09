/**
 * 휴지통 (ADMIN-DESIGN §8, §25). 삭제한 콘텐츠·후기·이미지를 모아 보여 주고, 복원하거나 영구 삭제한다.
 * 삭제한 지 30일이 지난 것은 정리 작업(`data/trashCleanup.ts`)이 영구 삭제한다.
 * - 복원: 콘텐츠는 **비공개 상태(임시저장)로** 돌아온다 — 복원만으로 공개 화면에 다시 나타나지 않는다. 후기도 비공개로 돌아온다.
 * - 영구 삭제: 되돌릴 수 없다. 후기는 수정 이력까지, 콘텐츠는 예약 작업까지 함께 지운다. 이미지는 파일(저장소)까지 지운다.
 * - 활동 기록에는 제목·본문·수강생 표기를 남기지 않는다(종류·id·건수만).
 */
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { contents, media, reviewRevisions, reviews } from "@/db/schema";
import type { AdminSession } from "@/lib/auth/types";
import { AppError } from "@/lib/errors";
import type { MediaStorage } from "@/media/storage";
import { removeFile } from "@/media/removeFile";
import { isUuid } from "./inquiryQuery";
import { recordAudit } from "./audit";
import type { AdminDb } from "./db";
import { mediaUsageCount } from "./media";

export const TRASH_KEEP_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const LIST_LIMIT = 200;

export type TrashKind = "content" | "review" | "media";
export const TRASH_KINDS: readonly TrashKind[] = ["content", "review", "media"];
export const isTrashKind = (v: unknown): v is TrashKind => typeof v === "string" && (TRASH_KINDS as readonly string[]).includes(v);

export interface TrashItem {
  kind: TrashKind;
  id: string;
  /** 사람이 알아볼 이름. 콘텐츠는 제목, 후기는 원문 앞부분, 이미지는 대체 텍스트 */
  label: string;
  /** 콘텐츠 유형(story·tour·equipment)이나 이미지의 파일 종류 같은 보조 정보 */
  detail: string;
  deletedAt: Date;
  /** 이 날 이후 정리 작업이 영구 삭제한다 */
  purgeAt: Date;
}

export const purgeAtOf = (deletedAt: Date): Date => new Date(deletedAt.getTime() + TRASH_KEEP_DAYS * DAY_MS);

export async function listTrash(db: AdminDb, admin: AdminSession): Promise<TrashItem[]> {
  void admin;
  const [c, r, m] = await Promise.all([
    db.select({ id: contents.id, title: contents.title, type: contents.type, deletedAt: contents.deletedAt }).from(contents).where(isNotNull(contents.deletedAt)).orderBy(desc(contents.deletedAt)).limit(LIST_LIMIT),
    db.select({ id: reviews.id, body: reviews.body, deletedAt: reviews.deletedAt }).from(reviews).where(isNotNull(reviews.deletedAt)).orderBy(desc(reviews.deletedAt)).limit(LIST_LIMIT),
    db.select({ id: media.id, alt: media.alt, mime: media.mime, deletedAt: media.deletedAt }).from(media).where(isNotNull(media.deletedAt)).orderBy(desc(media.deletedAt)).limit(LIST_LIMIT),
  ]);
  const items: Omit<TrashItem, "purgeAt">[] = [
    ...c.map((x) => ({ kind: "content" as const, id: x.id, label: x.title || "(제목 없음)", detail: x.type, deletedAt: x.deletedAt! })),
    ...r.map((x) => ({ kind: "review" as const, id: x.id, label: x.body.replace(/\s+/g, " ").slice(0, 50), detail: "후기", deletedAt: x.deletedAt! })),
    ...m.map((x) => ({ kind: "media" as const, id: x.id, label: x.alt?.trim() || "(대체 텍스트 없음)", detail: "이미지", deletedAt: x.deletedAt! })),
  ];
  return items.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime()).map((x) => ({ ...x, purgeAt: purgeAtOf(x.deletedAt) }));
}

export async function trashCount(db: AdminDb, admin: AdminSession): Promise<number> {
  return (await listTrash(db, admin)).length;
}

function assertId(id: string): void {
  if (!isUuid(id)) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
}

/** 복원. 콘텐츠·후기는 비공개로 돌아온다 */
export async function restoreItem(db: AdminDb, admin: AdminSession, kind: TrashKind, id: string, now: Date = new Date()): Promise<void> {
  assertId(id);
  if (kind === "content") {
    const [row] = await db.select().from(contents).where(and(eq(contents.id, id), isNotNull(contents.deletedAt))).limit(1);
    if (!row) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
    const [clash] = await db.select({ id: contents.id }).from(contents).where(and(eq(contents.type, row.type), eq(contents.slug, row.slug), isNull(contents.deletedAt))).limit(1);
    if (clash) throw new AppError("validation", "같은 주소 이름의 글이 이미 있어 복원할 수 없습니다. 그 글의 주소 이름을 바꾸거나 삭제한 뒤 다시 시도해 주세요.");
    // 복원만으로 공개되지 않게 임시저장으로 돌린다. 보관(archived)과 임시저장은 그대로 둔다.
    const status = row.status === "archived" ? "archived" : "draft";
    await db
      .update(contents)
      .set({ deletedAt: null, status, publishAt: null, version: row.version + 1, updatedAt: now, updatedBy: admin.userId })
      .where(and(eq(contents.id, id), isNotNull(contents.deletedAt)));
    await recordAudit(db, admin, { action: "trash.restore", targetType: "content", targetId: id, meta: { from: row.status, to: status } });
    return;
  }
  if (kind === "review") {
    const [row] = await db.select().from(reviews).where(and(eq(reviews.id, id), isNotNull(reviews.deletedAt))).limit(1);
    if (!row) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
    const [updated] = await db
      .update(reviews)
      .set({ deletedAt: null, status: "private", version: row.version + 1, updatedAt: now, updatedBy: admin.userId })
      .where(and(eq(reviews.id, id), isNotNull(reviews.deletedAt)))
      .returning();
    if (!updated) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
    const { id: _id, createdAt: _c, createdBy: _cb, deletedAt: _d, ...snapshot } = updated;
    void _id;
    void _c;
    void _cb;
    void _d;
    await db.insert(reviewRevisions).values({ reviewId: id, version: updated.version, reason: "status", snapshot: JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>, changedBy: admin.userId });
    await recordAudit(db, admin, { action: "trash.restore", targetType: "review", targetId: id });
    return;
  }
  const restored = await db.update(media).set({ deletedAt: null }).where(and(eq(media.id, id), isNotNull(media.deletedAt))).returning({ id: media.id });
  if (restored.length === 0) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  await recordAudit(db, admin, { action: "trash.restore", targetType: "media", targetId: id });
}

/** 영구 삭제 (휴지통에 있는 것만). 되돌릴 수 없다 */
export async function purgeItem(db: AdminDb, admin: AdminSession, kind: TrashKind, id: string, storage: MediaStorage | null): Promise<void> {
  assertId(id);
  if (kind === "content") {
    const removed = await db.delete(contents).where(and(eq(contents.id, id), isNotNull(contents.deletedAt))).returning({ id: contents.id });
    if (removed.length === 0) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
    await recordAudit(db, admin, { action: "trash.purge", targetType: "content", targetId: id });
    return;
  }
  if (kind === "review") {
    const [row] = await db.select({ id: reviews.id }).from(reviews).where(and(eq(reviews.id, id), isNotNull(reviews.deletedAt))).limit(1);
    if (!row) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
    await db.delete(reviewRevisions).where(eq(reviewRevisions.reviewId, id));
    await db.delete(reviews).where(and(eq(reviews.id, id), isNotNull(reviews.deletedAt)));
    await recordAudit(db, admin, { action: "trash.purge", targetType: "review", targetId: id });
    return;
  }
  const [row] = await db.select().from(media).where(and(eq(media.id, id), isNotNull(media.deletedAt))).limit(1);
  if (!row) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  const usage = await mediaUsageCount(db, admin, id);
  if (usage > 0) throw new AppError("validation", `이 이미지는 ${usage}곳에서 쓰이고 있어 영구 삭제할 수 없습니다.`);
  await removeFile(storage, row);
  await db.delete(media).where(and(eq(media.id, id), isNotNull(media.deletedAt)));
  await recordAudit(db, admin, { action: "trash.purge", targetType: "media", targetId: id });
}
