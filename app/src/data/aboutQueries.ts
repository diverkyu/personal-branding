/**
 * 공개 About 조회 (ADMIN-DESIGN §26). 캐시·환경 분기 없이 DB 질의만 한다 → 시험하기 쉽다.
 * - 공개 중(status=published)인 내용만 읽는다. 수정 중인 내용(draft 칸)은 읽지 않는다.
 * - 저장된 본문은 읽을 때 한 번 더 검사한다. 통과하지 못하거나 공개 중이 아니면 null → 화면은 기본 문구를 보여 준다.
 */
import { and, eq, inArray, isNull } from "drizzle-orm";
import { readAboutContent } from "@/about/fields";
import type { AdminDb } from "@/data/admin/db";
import { collectMediaIds, type BodyDoc } from "@/content/body";
import type { BodyMedia } from "@/content/ContentBody";
import { about, media } from "@/db/schema";

export interface PublicAbout {
  headline: string;
  doc: BodyDoc;
  signature: string;
  photo: { url: string; alt: string; width: number; height: number } | null;
  media: BodyMedia[];
}

export async function queryPublicAbout(db: AdminDb): Promise<PublicAbout | null> {
  const [row] = await db.select().from(about).where(and(eq(about.id, "main"), eq(about.status, "published"))).limit(1);
  if (!row) return null;
  const content = readAboutContent(row);
  if (!content || !content.headline) return null;
  const ids = [...new Set([...(content.photoMediaId ? [content.photoMediaId] : []), ...collectMediaIds(content.body)])];
  const rows = ids.length ? await db.select().from(media).where(and(inArray(media.id, ids), isNull(media.deletedAt))) : [];
  const byId = new Map(rows.map((m) => [m.id, m]));
  const photoRow = content.photoMediaId ? byId.get(content.photoMediaId) : undefined;
  // 사진은 대체 텍스트가 있을 때만 보여 준다
  const photo = photoRow && (photoRow.alt ?? "").trim() ? { url: photoRow.url, alt: photoRow.alt!.trim(), width: photoRow.width, height: photoRow.height } : null;
  const bodyMedia: BodyMedia[] = collectMediaIds(content.body)
    .map((id) => byId.get(id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .map((m) => ({ id: m.id, url: m.url, alt: m.alt ?? "", width: m.width, height: m.height }));
  return { headline: content.headline, doc: content.body, signature: content.signature, photo, media: bodyMedia };
}
