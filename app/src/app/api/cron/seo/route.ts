import { timingSafeEqual } from "node:crypto";
import { adminDb } from "@/data/admin/dbServer";
import { syncSeo } from "@/data/seo/sync";
import { logger } from "@/lib/logger";
export const maxDuration = 300;
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 16) return new Response(null, { status: 404, headers });
  const a = Buffer.from(request.headers.get("authorization") ?? ""), b = Buffer.from(`Bearer ${secret}`);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response(null, { status: 401, headers });
  try {
    const result = await syncSeo(adminDb());
    const failed = Object.values(result).some(v => !["success", "not_connected", "skipped"].includes(v));
    return Response.json(result, { status: failed ? 502 : 200, headers });
  } catch {
    logger.error("cron.seo", { outcome: "failed" });
    return new Response(null, { status: 500, headers });
  }
}
