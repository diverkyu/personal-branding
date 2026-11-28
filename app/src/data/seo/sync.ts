import "server-only";
import type { AdminDb } from "@/data/admin/db";
import { logger } from "@/lib/logger";
import { connection, collectGoogle, collectBing, ProviderError } from "./providers";
import { claimSync, finishSync } from "./store";

export async function syncSeo(db: AdminDb, env: Record<string, string | undefined> = process.env, fetcher = fetch, now = new Date()) {
  const results: Record<string, string> = {};
  // Separate engine commits: an outage at one provider cannot discard the other's success.
  for (const engine of ["google", "bing"] as const) {
    const config = connection(engine, env);
    if (!config.configured) { results[engine] = "not_connected"; continue; }
    const lease = await claimSync(db, config.scope, engine, now);
    if (!lease) { results[engine] = "skipped"; continue; }
    try {
      const snapshot = await (engine === "google" ? collectGoogle : collectBing)(env, fetcher, now);
      results[engine] = await finishSync(db, config.scope, lease, { snapshot }) ? "success" : "expired";
    } catch (error) {
      const code = error instanceof ProviderError ? error.code : "storage";
      await finishSync(db, config.scope, lease, { error: code });
      results[engine] = code;
    }
    logger.info("seo.sync", { engine, outcome: results[engine] });
  }
  return results;
}
