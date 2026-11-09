import { timingSafeEqual } from "node:crypto";
import { adminDb } from "@/data/admin/dbServer";
import { purgeExpired } from "@/data/trashCleanup";
import { logger } from "@/lib/logger";
import { getMediaStorage } from "@/media/storage";

/**
 * 휴지통 정리 실행 입구 (Vercel Cron, 하루 한 번). 삭제한 지 30일이 지난 항목을 영구 삭제한다 (ADMIN-DESIGN §8, §25).
 * CRON_SECRET 이 없으면 404 로 닫혀 있고, 있으면 `Authorization: Bearer <CRON_SECRET>` 가 맞을 때만 실행한다.
 * 응답과 로그에는 건수만 담는다.
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
    const summary = await purgeExpired(adminDb(), await getMediaStorage());
    logger.info("cron.cleanup", { outcome: "success", ...summary });
    return Response.json(summary, { headers });
  } catch (error) {
    logger.error("cron.cleanup", { outcome: "failed", errorType: error instanceof Error ? error.name : typeof error });
    return new Response(null, { status: 500, headers });
  }
}
