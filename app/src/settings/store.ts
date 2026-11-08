/**
 * 공개 화면이 쓰는 설정·동의 문구 읽기 (DB). 어드민 변경 함수는 data/admin 에 있다.
 * 읽기 실패나 값 없음은 기본값으로 대체해 공개 화면이 깨지지 않게 한다 — 호출하는 쪽이 로그를 남긴다.
 */
import { desc, eq, and } from "drizzle-orm";
import { consentVersions, siteSettings } from "@/db/schema";
import type { AdminDb } from "@/data/admin/db";
import { BUILTIN_VERSION, DEFAULT_CONSENT_TEXT, parseVersionLabel, versionLabel, type CurrentConsent } from "./consent";
import { resolveSettings, type ResolvedSettings } from "./registry";

export async function loadSettings(db: AdminDb): Promise<ResolvedSettings> {
  const rows = await db.select({ key: siteSettings.key, value: siteSettings.value }).from(siteSettings);
  return resolveSettings(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}

/** 현재(가장 큰 버전) 문구. 게시된 버전이 없으면 기본 문구와 옛 버전 표기 */
export async function loadCurrentConsent(db: AdminDb, kind: "reservation" | "notice"): Promise<CurrentConsent> {
  const [row] = await db.select().from(consentVersions).where(eq(consentVersions.kind, kind)).orderBy(desc(consentVersions.version)).limit(1);
  return row ? { version: versionLabel(kind, row.version), text: row.body } : { version: BUILTIN_VERSION, text: DEFAULT_CONSENT_TEXT[kind] };
}

export async function loadCurrentPrivacy(db: AdminDb): Promise<{ version: number; body: string; effectiveFrom: Date } | null> {
  const [row] = await db.select().from(consentVersions).where(eq(consentVersions.kind, "privacy")).orderBy(desc(consentVersions.version)).limit(1);
  return row ? { version: row.version, body: row.body, effectiveFrom: row.effectiveFrom } : null;
}

/**
 * 신청자가 본 동의 문구의 버전을 확인한다. 폼이 보낸 표기가 실제로 있는 버전(또는 옛 표기)이면 그대로 기록하고,
 * 아니면(조작·오래된 값) 현재 버전으로 기록한다.
 */
export async function resolveConsentVersion(db: AdminDb, kind: "reservation" | "notice", claimed: string | undefined): Promise<string> {
  const current = await loadCurrentConsent(db, kind);
  if (!claimed || claimed === current.version) return current.version;
  if (claimed === BUILTIN_VERSION) return claimed;
  const parsed = parseVersionLabel(claimed);
  if (!parsed || parsed.kind !== kind) return current.version;
  const [row] = await db
    .select({ id: consentVersions.id })
    .from(consentVersions)
    .where(and(eq(consentVersions.kind, kind), eq(consentVersions.version, parsed.version)))
    .limit(1);
  return row ? claimed : current.version;
}
