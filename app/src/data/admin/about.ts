/**
 * About(규강 소개) 관리 (ADMIN-DESIGN §26). 행은 하나뿐이다.
 * - 저장은 항상 "수정 중인 내용(draft 칸)"에 쌓이고, **공개 반영**을 눌러야 공개 내용이 바뀐다 — 실제 이력·자격은 규강이 확인한 내용만 공개해야 하기 때문이다.
 * - 공개 반영 전에 헤드라인·본문·사진 대체 텍스트를 점검한다.
 * - 활동 기록에는 내용을 남기지 않는다(버전·공개 여부만).
 */
import { and, eq, inArray, isNull } from "drizzle-orm";
import { aboutMediaIds, aboutProblems, cleanAbout, defaultAboutContent, readAboutContent, type AboutContent, type AboutInput } from "@/about/fields";
import { about, media, type AboutRow } from "@/db/schema";
import type { AdminSession } from "@/lib/auth/types";
import { AppError } from "@/lib/errors";
import { recordAudit } from "./audit";
import type { AdminDb } from "./db";

const ID = "main";
const CONFLICT = "다른 곳에서 먼저 저장했습니다. 새로고침한 뒤 내용을 확인하고 다시 저장해 주세요.";

export interface AboutView {
  row: AboutRow | null;
  /** 지금 공개 중인 내용 (공개 중이 아니면 null) */
  published: AboutContent | null;
  /** 수정 중인 내용이 있는지 */
  hasDraft: boolean;
  /** 편집 화면이 시작할 내용: 수정 중인 것 → 공개 중인 것 → 기본 문구 */
  editable: AboutContent;
  /** 편집 화면의 점검(공개 반영하면 막힐 문제) */
  problems: string[];
  /** 프로필 사진의 대체 텍스트 */
  photoAlt: string;
  version: number;
}

async function photoAltOf(db: AdminDb, id: string | null): Promise<string | undefined> {
  if (!id) return undefined;
  const [row] = await db.select({ alt: media.alt }).from(media).where(and(eq(media.id, id), isNull(media.deletedAt))).limit(1);
  return row?.alt ?? "";
}

async function assertMedia(db: AdminDb, content: AboutContent): Promise<void> {
  const ids = aboutMediaIds(content);
  if (ids.length === 0) return;
  const found = await db.select({ id: media.id }).from(media).where(and(inArray(media.id, ids), isNull(media.deletedAt)));
  if (found.length !== ids.length) throw new AppError("validation", "삭제되었거나 없는 이미지가 있습니다. 이미지를 빼고 다시 저장해 주세요.");
}

export async function getAbout(db: AdminDb, admin: AdminSession): Promise<AboutView> {
  void admin;
  const [row] = await db.select().from(about).where(eq(about.id, ID)).limit(1);
  const published = row && row.status === "published" ? readAboutContent(row) : null;
  const draft = row?.draft ? readAboutContent(row.draft) : null;
  const editable = draft ?? published ?? defaultAboutContent();
  const alt = await photoAltOf(db, editable.photoMediaId);
  return { row: row ?? null, published, hasDraft: Boolean(draft), editable, problems: aboutProblems(editable, alt), photoAlt: alt ?? "", version: row?.version ?? 0 };
}

/** 수정 중인 내용으로 저장한다. 처음 저장이면 version 은 0 이다 */
export async function saveAboutDraft(db: AdminDb, admin: AdminSession, version: number, input: AboutInput): Promise<{ version: number }> {
  const clean = cleanAbout(input);
  await assertMedia(db, clean);
  const draft = { headline: clean.headline, body: clean.body, signature: clean.signature, photoMediaId: clean.photoMediaId } as unknown as Record<string, unknown>;
  const now = new Date();
  if (version === 0) {
    const inserted = await db.insert(about).values({ id: ID, draft, version: 1, updatedBy: admin.userId, updatedAt: now }).onConflictDoNothing().returning({ version: about.version });
    if (inserted.length === 0) throw new AppError("validation", CONFLICT);
    await recordAudit(db, admin, { action: "about.save", targetType: "about", targetId: ID, meta: { version: 1 } });
    return { version: 1 };
  }
  const updated = await db
    .update(about)
    .set({ draft, version: version + 1, updatedBy: admin.userId, updatedAt: now })
    .where(and(eq(about.id, ID), eq(about.version, version)))
    .returning({ version: about.version });
  if (updated.length === 0) throw new AppError("validation", CONFLICT);
  await recordAudit(db, admin, { action: "about.save", targetType: "about", targetId: ID, meta: { version: version + 1 } });
  return { version: version + 1 };
}

/** 수정 중인 내용을 공개 내용으로 반영한다 */
export async function publishAbout(db: AdminDb, admin: AdminSession, version: number): Promise<{ version: number }> {
  const [row] = await db.select().from(about).where(eq(about.id, ID)).limit(1);
  if (!row) throw new AppError("validation", "먼저 내용을 저장해 주세요.");
  if (row.version !== version) throw new AppError("validation", CONFLICT);
  const content = row.draft ? readAboutContent(row.draft) : row.status === "published" ? null : readAboutContent(row);
  if (!content) throw new AppError("validation", row.draft ? "저장된 내용을 읽을 수 없습니다. 다시 저장해 주세요." : "이미 공개 중이며 반영할 수정 내용이 없습니다.");
  await assertMedia(db, content);
  const problems = aboutProblems(content, await photoAltOf(db, content.photoMediaId));
  if (problems.length > 0) throw new AppError("validation", `공개하기 전에 확인해 주세요: ${problems.join(" ")}`);
  const now = new Date();
  const updated = await db
    .update(about)
    .set({ headline: content.headline, body: content.body as unknown as Record<string, unknown>, signature: content.signature, photoMediaId: content.photoMediaId, status: "published", draft: null, publishedAt: now, version: version + 1, updatedBy: admin.userId, updatedAt: now })
    .where(and(eq(about.id, ID), eq(about.version, version)))
    .returning({ version: about.version });
  if (updated.length === 0) throw new AppError("validation", CONFLICT);
  await recordAudit(db, admin, { action: "about.publish", targetType: "about", targetId: ID, meta: { version: version + 1 } });
  return { version: version + 1 };
}

/** 수정 중인 내용을 버린다 (공개 중인 내용은 그대로) */
export async function discardAboutDraft(db: AdminDb, admin: AdminSession, version: number): Promise<{ version: number }> {
  const updated = await db
    .update(about)
    .set({ draft: null, version: version + 1, updatedBy: admin.userId, updatedAt: new Date() })
    .where(and(eq(about.id, ID), eq(about.version, version)))
    .returning({ version: about.version });
  if (updated.length === 0) throw new AppError("validation", CONFLICT);
  await recordAudit(db, admin, { action: "about.discard", targetType: "about", targetId: ID, meta: { version: version + 1 } });
  return { version: version + 1 };
}

/** 공개를 멈춘다. /about 은 기본 문구로 돌아간다. 공개했던 내용은 수정 중인 내용으로 옮겨 두어 다시 쓸 수 있다 */
export async function unpublishAbout(db: AdminDb, admin: AdminSession, version: number): Promise<{ version: number }> {
  const [row] = await db.select().from(about).where(eq(about.id, ID)).limit(1);
  if (!row || row.status !== "published") throw new AppError("validation", "공개 중이 아닙니다.");
  if (row.version !== version) throw new AppError("validation", CONFLICT);
  const keep = row.draft ?? ({ headline: row.headline, body: row.body, signature: row.signature, photoMediaId: row.photoMediaId } as Record<string, unknown>);
  const updated = await db
    .update(about)
    .set({ status: "draft", draft: keep, version: version + 1, updatedBy: admin.userId, updatedAt: new Date() })
    .where(and(eq(about.id, ID), eq(about.version, version)))
    .returning({ version: about.version });
  if (updated.length === 0) throw new AppError("validation", CONFLICT);
  await recordAudit(db, admin, { action: "about.unpublish", targetType: "about", targetId: ID, meta: { version: version + 1 } });
  return { version: version + 1 };
}
