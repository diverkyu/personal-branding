/**
 * 홈 히어로 이미지 관리 (ADMIN-DESIGN §47). 저장 규칙은 `home/heroImage.ts`.
 * - 저장은 "수정 중"에만 쌓이고, **공개 반영**을 눌러야 홈이 바뀐다(About 과 같은 방식).
 * - "기본 일러스트로 되돌리기"는 바로 공개에 반영한다 — 되돌릴 대상(기본 일러스트)이 이미 확정된 그림이라 미리볼 것이 없기 때문이다.
 * - 활동 기록에는 이미지 id·대체 텍스트를 남기지 않는다(버전·이미지 사용 여부만).
 */
import { and, eq } from "drizzle-orm";
import { siteSettings } from "@/db/schema";
import { EMPTY_HERO, HERO_SETTING_KEY, editableHero, heroProblems, readHeroState, writeHeroState, type HeroState } from "@/home/heroImage";
import type { AdminSession } from "@/lib/auth/types";
import { AppError } from "@/lib/errors";
import { recordAudit } from "./audit";
import type { AdminDb } from "./db";
import { getMediaByIds, type PickerMedia } from "./media";

const CONFLICT = "다른 곳에서 먼저 저장했습니다. 새로고침한 뒤 다시 시도해 주세요.";

export interface HeroView {
  state: HeroState;
  /** 0 이면 아직 저장한 적이 없다 */
  version: number;
  hasDraft: boolean;
  /** 편집 화면이 보여 줄 이미지 id (null = 기본 일러스트) */
  editableId: string | null;
  editable: PickerMedia | undefined;
  published: PickerMedia | undefined;
  /** 수정 중인 내용을 공개 반영하면 막힐 문제 */
  problems: string[];
}

async function load(db: AdminDb): Promise<{ state: HeroState; version: number }> {
  const [row] = await db.select({ value: siteSettings.value, version: siteSettings.version }).from(siteSettings).where(eq(siteSettings.key, HERO_SETTING_KEY)).limit(1);
  return row ? { state: readHeroState(row.value), version: row.version } : { state: EMPTY_HERO, version: 0 };
}

async function save(db: AdminDb, admin: AdminSession, version: number, state: HeroState): Promise<number> {
  const value = writeHeroState(state);
  if (version === 0) {
    const inserted = await db.insert(siteSettings).values({ key: HERO_SETTING_KEY, value, version: 1, updatedBy: admin.userId }).onConflictDoNothing().returning({ version: siteSettings.version });
    if (inserted.length === 0) throw new AppError("validation", CONFLICT);
    return 1;
  }
  const updated = await db
    .update(siteSettings)
    .set({ value, version: version + 1, updatedAt: new Date(), updatedBy: admin.userId })
    .where(and(eq(siteSettings.key, HERO_SETTING_KEY), eq(siteSettings.version, version)))
    .returning({ version: siteSettings.version });
  if (updated.length === 0) throw new AppError("validation", CONFLICT);
  return version + 1;
}

async function mediaOf(db: AdminDb, admin: AdminSession, id: string | null): Promise<PickerMedia | undefined> {
  if (!id) return undefined;
  const [m] = await getMediaByIds(db, admin, [id]);
  return m;
}

export async function getHomeHero(db: AdminDb, admin: AdminSession): Promise<HeroView> {
  const { state, version } = await load(db);
  const editableId = editableHero(state);
  const editable = await mediaOf(db, admin, editableId);
  const published = state.published === editableId ? editable : await mediaOf(db, admin, state.published);
  return { state, version, hasDraft: state.draft !== null, editableId, editable, published, problems: heroProblems(editableId, editable) };
}

/** 고른 이미지를 수정 중인 내용으로 저장한다. mediaId 가 null 이면 "기본 일러스트"를 수정 중인 것으로 저장한다 */
export async function saveHeroDraft(db: AdminDb, admin: AdminSession, version: number, mediaId: string | null): Promise<{ version: number }> {
  const current = await load(db);
  if (current.version !== version) throw new AppError("validation", CONFLICT);
  if (mediaId && !(await mediaOf(db, admin, mediaId))) throw new AppError("validation", "삭제되었거나 없는 이미지입니다. 다른 이미지를 골라 주세요.");
  // 공개 중인 것과 같은 것을 고르면 수정 중인 내용이 없는 것과 같다
  const draft = mediaId === current.state.published ? null : { mediaId };
  const next = await save(db, admin, version, { published: current.state.published, draft });
  await recordAudit(db, admin, { action: "hero.save", targetType: "home_hero", meta: { version: next, image: mediaId !== null } });
  return { version: next };
}

/** 수정 중인 내용을 홈에 반영한다 */
export async function publishHero(db: AdminDb, admin: AdminSession, version: number): Promise<{ version: number }> {
  const current = await load(db);
  if (current.version !== version) throw new AppError("validation", CONFLICT);
  if (!current.state.draft) throw new AppError("validation", "반영할 수정 내용이 없습니다. 먼저 이미지를 골라 저장해 주세요.");
  const id = current.state.draft.mediaId;
  const problems = heroProblems(id, await mediaOf(db, admin, id));
  if (problems.length > 0) throw new AppError("validation", `공개하기 전에 확인해 주세요: ${problems.join(" ")}`);
  const next = await save(db, admin, version, { published: id, draft: null });
  await recordAudit(db, admin, { action: "hero.publish", targetType: "home_hero", meta: { version: next, image: id !== null } });
  return { version: next };
}

/** 수정 중인 내용을 버린다 (홈은 그대로) */
export async function discardHeroDraft(db: AdminDb, admin: AdminSession, version: number): Promise<{ version: number }> {
  const current = await load(db);
  if (current.version !== version) throw new AppError("validation", CONFLICT);
  if (!current.state.draft) return { version };
  const next = await save(db, admin, version, { published: current.state.published, draft: null });
  await recordAudit(db, admin, { action: "hero.discard", targetType: "home_hero", meta: { version: next } });
  return { version: next };
}

/** 홈을 바로 기본 일러스트로 되돌린다. 수정 중인 내용도 함께 버린다 */
export async function resetHeroToDefault(db: AdminDb, admin: AdminSession, version: number): Promise<{ version: number }> {
  const current = await load(db);
  if (current.version !== version) throw new AppError("validation", CONFLICT);
  if (current.state.published === null && current.state.draft === null) return { version };
  const next = await save(db, admin, version, EMPTY_HERO);
  await recordAudit(db, admin, { action: "hero.reset", targetType: "home_hero", meta: { version: next } });
  return { version: next };
}
