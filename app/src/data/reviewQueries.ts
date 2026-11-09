/**
 * 공개 화면용 후기 조회 (ADMIN-DESIGN §24). 캐시·환경 분기 없이 DB 질의만 한다 → 시험하기 쉽다.
 *
 * - 공개 기준: 삭제되지 않았고, 공개(public)이며, **동의 확인이 된** 후기만. (DB 제약이 이미 막지만 읽는 쪽에서도 한 번 더 건다)
 * - 비공개 후기·동의 메모·출처·수정 이력은 이 모듈이 읽지 않는다 (SECURITY: 비공개 후기와 작성자 정보는 응답에 없다).
 * - 원문은 가공하지 않고 그대로 돌려준다.
 */
import { and, desc, eq, isNull } from "drizzle-orm";
import type { AdminDb } from "@/data/admin/db";
import { reviews } from "@/db/schema";
import type { Review } from "@/types/content";

export interface PublicReview extends Review {
  featuredOrder: number;
}

/** 공개된 후기 전부 (작성일 역순) */
export async function queryPublicReviews(db: AdminDb): Promise<PublicReview[]> {
  const rows = await db
    .select({
      id: reviews.id,
      body: reviews.body,
      authorLabel: reviews.authorLabel,
      writtenOn: reviews.writtenOn,
      tourSlug: reviews.tourSlug,
      isFeatured: reviews.isFeatured,
      featuredOrder: reviews.featuredOrder,
    })
    .from(reviews)
    .where(and(isNull(reviews.deletedAt), eq(reviews.status, "public"), eq(reviews.consentConfirmed, true)))
    .orderBy(desc(reviews.writtenOn), desc(reviews.createdAt));
  return rows.map((r) => ({ id: r.id, text: r.body, author: r.authorLabel, writtenAt: r.writtenOn, tourSlug: r.tourSlug ?? undefined, featured: r.isFeatured, featuredOrder: r.featuredOrder }));
}

/** 대표 후기: 대표 순서가 작은 것 → 작성일이 최근인 것 */
export function featuredOf(list: PublicReview[], limit: number): PublicReview[] {
  return list
    .filter((r) => r.featured)
    .sort((a, b) => a.featuredOrder - b.featuredOrder || b.writtenAt.localeCompare(a.writtenAt))
    .slice(0, limit);
}

/** 투어 상세용 (INT-07): 그 투어에 연결된 공개 후기 최대 4건, 없으면 대표 후기 3건 */
export function forTourOf(list: PublicReview[], tourSlug: string): PublicReview[] {
  const linked = list.filter((r) => r.tourSlug === tourSlug).slice(0, 4);
  return linked.length > 0 ? linked : featuredOf(list, 3);
}
