/**
 * 화면이 장비를 읽는 입구 (서버 전용, AGENTS §6). 스토리·투어(data/stories.ts, data/tours.ts)와 같은 규칙이다.
 * DATABASE_URL 이 있으면 DB 의 공개 장비(태그 캐시 최대 5분, 어드민 변경 때 즉시 갱신), 없으면 가상 데이터 —
 * 로컬 개발·자동 시험 전용이고 배포 환경(VERCEL)에서는 절대 쓰지 않는다. 목록 읽기가 실패하면 빈 목록(캐시하지 않음), 상세는 오류.
 */
import "server-only";
import { unstable_cache } from "next/cache";
import { EQUIPMENT_TAG, STORIES_MAX_AGE_SECONDS } from "@/content/cacheTags";
import { getDb } from "@/db/client";
import type { AdminDb } from "@/data/admin/db";
import { logger } from "@/lib/logger";
import type { Equipment } from "@/types/content";
import { getEquipment as getFixture, listEquipment as listFixtures, listEquipmentCategories as fixtureCategories } from "./index";
import { categoriesOf, queryLiveEquipment, queryLiveEquipmentItem, type EquipmentItem } from "./equipmentQueries";

export type { EquipmentItem } from "./equipmentQueries";

function db(): AdminDb | null {
  const url = process.env.DATABASE_URL?.trim();
  return url ? (getDb(url) as unknown as AdminDb) : null;
}

const shouldUseFixtures = () => !process.env.DATABASE_URL?.trim() && !process.env.VERCEL;

const cachedList = unstable_cache(async () => queryLiveEquipment(db() as AdminDb), ["equipment-live-list"], { tags: [EQUIPMENT_TAG], revalidate: STORIES_MAX_AGE_SECONDS });
const cachedDetail = unstable_cache(async (slug: string) => queryLiveEquipmentItem(db() as AdminDb, slug), ["equipment-live-detail"], { tags: [EQUIPMENT_TAG], revalidate: STORIES_MAX_AGE_SECONDS });

/** 공개된 장비 (노출 순서) */
export async function listEquipment(): Promise<Equipment[]> {
  if (shouldUseFixtures()) return listFixtures();
  if (!db()) return [];
  try {
    return await cachedList();
  } catch (error) {
    logger.error("equipment.list_failed", { errorType: error instanceof Error ? error.name : typeof error });
    return [];
  }
}

export async function listEquipmentCategories(): Promise<string[]> {
  return shouldUseFixtures() ? fixtureCategories() : categoriesOf(await listEquipment());
}

/** 공개된 장비 하나(상세용). 없거나 공개 전이면 null */
export async function getEquipment(slug: string): Promise<EquipmentItem | null> {
  if (shouldUseFixtures()) {
    const f = getFixture(slug);
    return f ? { ...f, sortOrder: 0, liveAtIso: "" } : null;
  }
  if (!db()) return null;
  if (!(await listEquipment()).some((e) => e.slug === slug)) return null;
  return cachedDetail(slug);
}
