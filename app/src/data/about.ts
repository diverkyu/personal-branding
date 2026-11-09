/**
 * 화면이 About 을 읽는 입구 (서버 전용, AGENTS §6).
 * - DATABASE_URL 이 있으면 DB 의 공개 중인 About 을 읽는다(태그 캐시 5분). 공개 중인 내용이 없으면 null → 화면이 기본 문구를 쓴다.
 * - DATABASE_URL 이 없으면 null (가상 데이터가 따로 없다 — 기본 문구가 곧 가상 데이터다).
 * - 읽기가 실패하면 null 로 열어 사이트가 깨지지 않게 한다(캐시하지 않는다).
 */
import "server-only";
import { unstable_cache } from "next/cache";
import { ABOUT_TAG, STORIES_MAX_AGE_SECONDS } from "@/content/cacheTags";
import { getDb } from "@/db/client";
import type { AdminDb } from "@/data/admin/db";
import { logger } from "@/lib/logger";
import { queryPublicAbout, type PublicAbout } from "./aboutQueries";

export type { PublicAbout } from "./aboutQueries";

const cached = unstable_cache(
  async () => {
    const url = process.env.DATABASE_URL?.trim();
    return url ? queryPublicAbout(getDb(url) as unknown as AdminDb) : null;
  },
  ["about-public"],
  { tags: [ABOUT_TAG], revalidate: STORIES_MAX_AGE_SECONDS },
);

export async function getPublicAbout(): Promise<PublicAbout | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  try {
    return await cached();
  } catch (error) {
    logger.error("about.read_failed", { errorType: error instanceof Error ? error.name : typeof error });
    return null;
  }
}
