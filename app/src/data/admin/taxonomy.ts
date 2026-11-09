/**
 * 태그·카테고리 관리 (ADMIN-DESIGN §26). 태그(스토리 등)와 장비 카테고리는 글마다 직접 적는 값이라 오타·중복이 생기기 쉽다.
 * 여기서 쓰이는 이름을 모아 보고, **이름 바꾸기(이미 있는 이름이면 합치기)**와 태그 지우기를 한꺼번에 한다.
 * - 삭제된(휴지통) 글은 건드리지 않는다. 공개 내용(tags/fields 칸)과 수정 중인 내용(draft 칸)을 함께 고친다.
 * - 고친 글은 version 을 올려, 그 글을 열어 둔 편집 화면이 저장할 때 충돌로 알아채게 한다.
 * - 글마다 조건부로 갱신하므로 그 사이 다른 곳에서 고쳐진 글은 건너뛰고 건수로 알린다.
 * - 활동 기록에는 이름을 남기지 않는다(종류·건수만).
 */
import { and, eq, isNull } from "drizzle-orm";
import { EQUIPMENT_LIMITS } from "@/content/equipmentFields";
import { contents } from "@/db/schema";
import type { AdminSession } from "@/lib/auth/types";
import { AppError } from "@/lib/errors";
import { recordAudit } from "./audit";
import type { AdminDb } from "./db";

export const TAG_MAX = 20;

export interface TaxonomyEntry {
  name: string;
  /** 이 이름을 쓰는 글 수 (공개 내용이나 수정 중인 내용 어느 쪽이든) */
  count: number;
}

export interface TaxonomyResult {
  /** 바뀐 글 수 */
  changed: number;
  /** 그 사이 다른 곳에서 고쳐져 건너뛴 글 수 */
  skipped: number;
}

const norm = (v: string): string => v.replace(/\s+/g, " ").trim();

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function draftOf(draft: unknown): Record<string, unknown> | null {
  return typeof draft === "object" && draft !== null && !Array.isArray(draft) ? (draft as Record<string, unknown>) : null;
}

function fieldsOf(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function tally(names: Iterable<string>[]): TaxonomyEntry[] {
  const map = new Map<string, number>();
  for (const set of names) for (const n of new Set(set)) if (n) map.set(n, (map.get(n) ?? 0) + 1);
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"));
}

export async function listTags(db: AdminDb, admin: AdminSession): Promise<TaxonomyEntry[]> {
  void admin;
  const rows = await db.select({ tags: contents.tags, draft: contents.draft }).from(contents).where(isNull(contents.deletedAt));
  return tally(rows.map((r) => [...r.tags, ...strings(draftOf(r.draft)?.tags)]));
}

export async function listCategories(db: AdminDb, admin: AdminSession): Promise<TaxonomyEntry[]> {
  void admin;
  const rows = await db.select({ fields: contents.fields, draft: contents.draft }).from(contents).where(and(isNull(contents.deletedAt), eq(contents.type, "equipment")));
  return tally(
    rows.map((r) => {
      const live = fieldsOf(r.fields).category;
      const pending = fieldsOf(draftOf(r.draft)?.fields).category;
      return [typeof live === "string" ? norm(live) : "", typeof pending === "string" ? norm(pending) : ""];
    }),
  );
}

/** 태그 목록에서 from 을 to 로 바꾼다(to 가 이미 있으면 합쳐진다). to 가 null 이면 from 만 뺀다 */
function mapTags(tags: string[], from: string, to: string | null): string[] {
  const out: string[] = [];
  for (const t of tags) {
    const next = t === from ? to : t;
    if (next && !out.includes(next)) out.push(next);
  }
  return out;
}

const same = (a: string[], b: string[]): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

function assertName(raw: string, label: string, max: number): string {
  const name = norm(raw);
  if (!name) throw new AppError("validation", `바꿀 ${label} 이름을 입력해 주세요.`);
  if (name.length > max) throw new AppError("validation", `${label} 이름은 ${max}자까지 쓸 수 있습니다.`);
  return name;
}

async function changeTags(db: AdminDb, admin: AdminSession, from: string, to: string | null): Promise<TaxonomyResult> {
  const rows = await db.select({ id: contents.id, tags: contents.tags, draft: contents.draft, version: contents.version }).from(contents).where(isNull(contents.deletedAt));
  const result: TaxonomyResult = { changed: 0, skipped: 0 };
  const now = new Date();
  for (const row of rows) {
    const nextTags = mapTags(row.tags, from, to);
    const draft = draftOf(row.draft);
    const draftTags = draft ? strings(draft.tags) : null;
    const nextDraftTags = draftTags ? mapTags(draftTags, from, to) : null;
    const tagsChanged = !same(nextTags, row.tags);
    const draftChanged = draftTags !== null && nextDraftTags !== null && !same(nextDraftTags, draftTags);
    if (!tagsChanged && !draftChanged) continue;
    const updated = await db
      .update(contents)
      .set({
        ...(tagsChanged ? { tags: nextTags } : {}),
        ...(draftChanged && draft ? { draft: { ...draft, tags: nextDraftTags } } : {}),
        version: row.version + 1,
        updatedAt: now,
        updatedBy: admin.userId,
      })
      .where(and(eq(contents.id, row.id), eq(contents.version, row.version), isNull(contents.deletedAt)))
      .returning({ id: contents.id });
    if (updated.length === 1) result.changed += 1;
    else result.skipped += 1;
  }
  return result;
}

/** 태그 이름 바꾸기 / 합치기 */
export async function renameTag(db: AdminDb, admin: AdminSession, fromRaw: string, toRaw: string): Promise<TaxonomyResult> {
  const from = norm(fromRaw);
  const to = assertName(toRaw, "태그", TAG_MAX);
  if (!from) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  if (from === to) throw new AppError("validation", "이름이 그대로입니다.");
  const result = await changeTags(db, admin, from, to);
  if (result.changed + result.skipped === 0) throw new AppError("not_found", "그 태그를 쓰는 글이 없습니다.");
  await recordAudit(db, admin, { action: "taxonomy.rename", targetType: "tag", meta: { changed: result.changed, skipped: result.skipped } });
  return result;
}

/** 태그를 모든 글에서 뺀다 (글은 그대로, 태그만 빠진다) */
export async function removeTag(db: AdminDb, admin: AdminSession, fromRaw: string): Promise<TaxonomyResult> {
  const from = norm(fromRaw);
  if (!from) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  const result = await changeTags(db, admin, from, null);
  if (result.changed + result.skipped === 0) throw new AppError("not_found", "그 태그를 쓰는 글이 없습니다.");
  await recordAudit(db, admin, { action: "taxonomy.remove", targetType: "tag", meta: { changed: result.changed, skipped: result.skipped } });
  return result;
}

/** 장비 카테고리 이름 바꾸기 / 합치기. 카테고리는 발행에 필요한 항목이라 "지우기"는 없다 */
export async function renameCategory(db: AdminDb, admin: AdminSession, fromRaw: string, toRaw: string): Promise<TaxonomyResult> {
  const from = norm(fromRaw);
  const to = assertName(toRaw, "카테고리", EQUIPMENT_LIMITS.category);
  if (!from) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  if (from === to) throw new AppError("validation", "이름이 그대로입니다.");
  const rows = await db.select({ id: contents.id, fields: contents.fields, draft: contents.draft, version: contents.version }).from(contents).where(and(isNull(contents.deletedAt), eq(contents.type, "equipment")));
  const result: TaxonomyResult = { changed: 0, skipped: 0 };
  const now = new Date();
  for (const row of rows) {
    const fields = fieldsOf(row.fields);
    const draft = draftOf(row.draft);
    const draftFields = draft ? fieldsOf(draft.fields) : null;
    const liveChanged = typeof fields.category === "string" && norm(fields.category) === from;
    const draftChanged = draftFields !== null && typeof draftFields.category === "string" && norm(draftFields.category) === from;
    if (!liveChanged && !draftChanged) continue;
    const updated = await db
      .update(contents)
      .set({
        ...(liveChanged ? { fields: { ...fields, category: to } } : {}),
        ...(draftChanged && draft && draftFields ? { draft: { ...draft, fields: { ...draftFields, category: to } } } : {}),
        version: row.version + 1,
        updatedAt: now,
        updatedBy: admin.userId,
      })
      .where(and(eq(contents.id, row.id), eq(contents.version, row.version), isNull(contents.deletedAt)))
      .returning({ id: contents.id });
    if (updated.length === 1) result.changed += 1;
    else result.skipped += 1;
  }
  if (result.changed + result.skipped === 0) throw new AppError("not_found", "그 카테고리를 쓰는 장비가 없습니다.");
  await recordAudit(db, admin, { action: "taxonomy.rename", targetType: "category", meta: { changed: result.changed, skipped: result.skipped } });
  return result;
}
