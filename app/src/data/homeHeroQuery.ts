/**
 * 공개 홈 히어로 이미지 조회 (ADMIN-DESIGN §47). 캐시·환경 분기 없이 DB 질의만 한다 → 시험하기 쉽다.
 * - 공개 중인 이미지만 읽는다. 수정 중인 내용은 읽지 않는다.
 * - 이미지가 삭제되었거나 대체 텍스트가 없으면 null → 화면은 기본 일러스트를 보여 준다.
 */
import { and, eq, isNull } from "drizzle-orm";
import type { AdminDb } from "@/data/admin/db";
import { media, siteSettings } from "@/db/schema";
import { HERO_SETTING_KEY, readHeroState } from "@/home/heroImage";

export interface HeroImage {
  url: string;
  alt: string;
  width: number;
  height: number;
}

export async function queryPublicHeroImage(db: AdminDb): Promise<HeroImage | null> {
  const [row] = await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, HERO_SETTING_KEY)).limit(1);
  const id = readHeroState(row?.value).published;
  if (!id) return null;
  const [m] = await db.select().from(media).where(and(eq(media.id, id), isNull(media.deletedAt))).limit(1);
  const alt = (m?.alt ?? "").trim();
  return m && alt ? { url: m.url, alt, width: m.width, height: m.height } : null;
}
