import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { PUBLIC_CONTENT_TAGS } from "@/content/cacheTags";
import { adminDb } from "@/data/admin/dbServer";
import { runDuePublishJobs } from "@/data/publishJobs";
import { logger } from "@/lib/logger";

/**
 * 예약 발행 실행 입구 (Vercel Cron 이 부른다). CRON_SECRET 이 없으면 404 로 닫혀 있고,
 * 있으면 `Authorization: Bearer <CRON_SECRET>` 헤더가 맞을 때만 실행한다 (Vercel 이 이 헤더를 자동으로 붙인다).
 * 어드민 세션과 무관하다. 응답에는 건수만 담는다.
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 16) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) return new Response(null, { status: 404, headers });
  if (!authorized(request)) return new Response(null, { status: 401, headers });
  try {
    const summary = await runDuePublishJobs(adminDb());
    // 새로 발행된 글이 있으면 정적으로 만든 공개 페이지를 갱신한다
    if (summary.published > 0) {
      for (const tag of PUBLIC_CONTENT_TAGS) revalidateTag(tag, { expire: 0 });
      revalidatePath("/", "layout");
    }
    logger.info("cron.publish", { outcome: "success", ...summary });
    return Response.json(summary, { headers });
  } catch (error) {
    logger.error("cron.publish", { outcome: "failed", errorType: error instanceof Error ? error.name : typeof error });
    return new Response(null, { status: 500, headers });
  }
}
