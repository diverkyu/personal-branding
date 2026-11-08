/**
 * 공개 화면이 설정·동의 문구를 읽는 입구 (서버 전용). 규칙:
 * - DB 가 설정돼 있지 않거나 읽기에 실패하면 기본값을 돌려준다 → 공개 화면은 어떤 경우에도 깨지지 않는다.
 * - 결과는 Next.js 데이터 캐시에 태그로 저장하고, 어드민이 저장하면 updateTag 로 바로 갱신한다.
 */
import "server-only";
import { unstable_cache } from "next/cache";
import { getDb } from "@/db/client";
import type { AdminDb } from "@/data/admin/db";
import { logger } from "@/lib/logger";
import { BUILTIN_VERSION, DEFAULT_CONSENT_TEXT, type CurrentConsent } from "./consent";
import { defaultSettings, type ResolvedSettings } from "./registry";
import { loadCurrentConsent, loadCurrentPrivacy, loadSettings } from "./store";

export const SETTINGS_TAG = "site-settings";
export const CONSENT_TAG = "consent-versions";
/** 태그 갱신이 어떤 이유로 닿지 않아도 이 시간 뒤에는 새 값을 읽는다 */
const MAX_AGE_SECONDS = 3600;

function db(): AdminDb | null {
  const url = process.env.DATABASE_URL?.trim();
  return url ? (getDb(url) as unknown as AdminDb) : null;
}

async function safely<T>(name: string, fallback: T, run: (d: AdminDb) => Promise<T>): Promise<T> {
  const d = db();
  if (!d) return fallback;
  try {
    return await run(d);
  } catch (error) {
    // 공개 화면을 막지 않는다. 원인은 오류 종류만 남긴다
    logger.warn("settings.read_failed", { source: name, errorType: error instanceof Error ? error.name : typeof error });
    return fallback;
  }
}

export const getSiteSettings = unstable_cache(
  async (): Promise<ResolvedSettings> => safely("settings", defaultSettings(), loadSettings),
  ["site-settings"],
  { tags: [SETTINGS_TAG], revalidate: MAX_AGE_SECONDS },
);

export const getConsent = unstable_cache(
  async (kind: "reservation" | "notice"): Promise<CurrentConsent> =>
    safely("consent", { version: BUILTIN_VERSION, text: DEFAULT_CONSENT_TEXT[kind] }, (d) => loadCurrentConsent(d, kind)),
  ["current-consent"],
  { tags: [CONSENT_TAG], revalidate: MAX_AGE_SECONDS },
);

export const getPrivacyPolicy = unstable_cache(
  async (): Promise<{ version: number; body: string; effectiveFrom: string } | null> =>
    safely("privacy", null, async (d) => {
      const p = await loadCurrentPrivacy(d);
      return p ? { version: p.version, body: p.body, effectiveFrom: p.effectiveFrom.toISOString() } : null;
    }),
  ["current-privacy"],
  { tags: [CONSENT_TAG], revalidate: MAX_AGE_SECONDS },
);
