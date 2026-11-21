/**
 * 화면이 홈 히어로 이미지를 읽는 입구 (서버 전용, AGENTS §6).
 * - DATABASE_URL 이 있으면 공개 중인 이미지를 읽는다(태그 캐시 5분). 없거나 읽기에 실패하면 null → 기본 일러스트.
 */
import "server-only";
import { unstable_cache } from "next/cache";
import { HOME_HERO_TAG, STORIES_MAX_AGE_SECONDS } from "@/content/cacheTags";
import { getDb } from "@/db/client";
import type { AdminDb } from "@/data/admin/db";
import { logger } from "@/lib/logger";
import { queryPublicHeroImage, type HeroImage } from "./homeHeroQuery";

export type { HeroImage } from "./homeHeroQuery";

const cached = unstable_cache(
  async () => {
    const url = process.env.DATABASE_URL?.trim();
    return url ? queryPublicHeroImage(getDb(url) as unknown as AdminDb) : null;
  },
  ["home-hero-public"],
  { tags: [HOME_HERO_TAG], revalidate: STORIES_MAX_AGE_SECONDS },
);

export async function getPublicHeroImage(): Promise<HeroImage | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  try {
    return await cached();
  } catch (error) {
    logger.error("home_hero.read_failed", { errorType: error instanceof Error ? error.name : typeof error });
    return null;
  }
}
