/**
 * 어드민의 사이트 설정·동의 문구 변경 함수. 모든 함수는 `admin: AdminSession`을 받고 변경은 활동 기록에 남는다.
 * 설정은 전체가 검증을 통과해야 저장한다(일부만 저장되지 않음). 같은 키를 다른 곳에서 먼저 저장했으면 덮어쓰지 않고 충돌로 알린다.
 */
import { and, desc, eq } from "drizzle-orm";
import { consentVersions, siteSettings, type ConsentVersionRow, type SiteSettingRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import type { AdminSession } from "@/lib/auth/types";
import { CONSENT_KINDS, validateConsentBody, type ConsentKind } from "@/settings/consent";
import { SETTINGS_BY_KEY, validateSetting } from "@/settings/registry";
import { recordAudit } from "./audit";
import type { AdminDb } from "./db";

export interface SettingInput {
  key: string;
  value: string;
  /** 화면이 불러올 때의 version. 처음 저장하는 키는 0 */
  version: number;
}

export type SaveSettingsResult =
  | { ok: true; changed: number }
  | { ok: false; errors: Record<string, string>; conflict?: boolean };

export async function listStoredSettings(db: AdminDb, admin: AdminSession): Promise<Record<string, SiteSettingRow>> {
  void admin;
  const rows = await db.select().from(siteSettings);
  return Object.fromEntries(rows.map((r) => [r.key, r]));
}

export async function saveSettings(db: AdminDb, admin: AdminSession, inputs: SettingInput[], options: { confirmBrandCore: boolean }): Promise<SaveSettingsResult> {
  const stored = await listStoredSettings(db, admin);
  const errors: Record<string, string> = {};
  const pending: { key: string; value: string; version: number; had: boolean }[] = [];

  for (const input of inputs) {
    const def = SETTINGS_BY_KEY[input.key];
    if (!def) throw new AppError("validation", "알 수 없는 설정입니다.");
    const checked = validateSetting(def, input.value);
    if (!checked.ok) {
      errors[input.key] = checked.error;
      continue;
    }
    const current = stored[input.key];
    const currentValue = current?.value ?? "";
    if (checked.value === currentValue) continue; // 바뀐 것이 없다
    if (!current && checked.value === def.default) continue; // 저장된 값이 없을 때 기본값과 같은 입력은 바뀐 것이 아니다
    if (def.brandCore && !options.confirmBrandCore) {
      errors[input.key] = "브랜드 핵심 문구를 바꾸려면 확인 상자를 선택해 주세요.";
      continue;
    }
    pending.push({ key: input.key, value: checked.value, version: input.version, had: Boolean(current) });
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const conflicts: Record<string, string> = {};
  let changed = 0;
  for (const item of pending) {
    const current = stored[item.key];
    // 화면을 불러온 뒤 다른 곳에서 먼저 저장했는지 확인한다
    if ((current?.version ?? 0) !== item.version) {
      conflicts[item.key] = "다른 곳에서 먼저 저장했습니다. 새로고침한 뒤 다시 확인해 주세요.";
      continue;
    }
    if (item.value === "") {
      const removed = await db.delete(siteSettings).where(and(eq(siteSettings.key, item.key), eq(siteSettings.version, item.version))).returning({ key: siteSettings.key });
      if (removed.length === 0) {
        conflicts[item.key] = "다른 곳에서 먼저 저장했습니다. 새로고침한 뒤 다시 확인해 주세요.";
        continue;
      }
    } else if (item.had) {
      const updated = await db
        .update(siteSettings)
        .set({ value: item.value, version: item.version + 1, updatedAt: new Date(), updatedBy: admin.userId })
        .where(and(eq(siteSettings.key, item.key), eq(siteSettings.version, item.version)))
        .returning({ key: siteSettings.key });
      if (updated.length === 0) {
        conflicts[item.key] = "다른 곳에서 먼저 저장했습니다. 새로고침한 뒤 다시 확인해 주세요.";
        continue;
      }
    } else {
      const inserted = await db.insert(siteSettings).values({ key: item.key, value: item.value, version: 1, updatedBy: admin.userId }).onConflictDoNothing().returning({ key: siteSettings.key });
      if (inserted.length === 0) {
        conflicts[item.key] = "다른 곳에서 먼저 저장했습니다. 새로고침한 뒤 다시 확인해 주세요.";
        continue;
      }
    }
    changed += 1;
    // 설정 값은 기록하지 않는다 (연락처 같은 값이 섞일 수 있다). 무엇을 바꿨는지만 남긴다
    await recordAudit(db, admin, { action: "settings.update", targetType: "setting", targetId: item.key, meta: { reset: item.value === "" } });
  }
  if (Object.keys(conflicts).length > 0) return { ok: false, errors: conflicts, conflict: true };
  return { ok: true, changed };
}

export async function listConsentVersions(db: AdminDb, admin: AdminSession, kind: ConsentKind): Promise<ConsentVersionRow[]> {
  void admin;
  if (!CONSENT_KINDS.includes(kind)) return [];
  return db.select().from(consentVersions).where(eq(consentVersions.kind, kind)).orderBy(desc(consentVersions.version));
}

/** 새 버전을 게시한다. 이전 버전은 그대로 남는다(수정·삭제 없음). 이미 게시된 신청의 동의 기록은 옛 버전을 가리킨다 */
export async function publishConsentVersion(db: AdminDb, admin: AdminSession, kind: ConsentKind, body: string): Promise<{ version: number }> {
  if (!CONSENT_KINDS.includes(kind)) throw new AppError("validation", "알 수 없는 종류입니다.");
  const checked = validateConsentBody(kind, body);
  if (!checked.ok) throw new AppError("validation", checked.error);
  const [latest] = await db.select({ version: consentVersions.version, body: consentVersions.body }).from(consentVersions).where(eq(consentVersions.kind, kind)).orderBy(desc(consentVersions.version)).limit(1);
  if (latest && latest.body === checked.value) throw new AppError("validation", "현재 버전과 같은 내용입니다.");
  const version = (latest?.version ?? 0) + 1;
  try {
    await db.insert(consentVersions).values({ kind, version, body: checked.value, createdBy: admin.userId });
  } catch {
    // 동시에 같은 버전을 게시한 경우(고유 제약)
    throw new AppError("validation", "다른 곳에서 먼저 게시했습니다. 새로고침한 뒤 다시 시도해 주세요.");
  }
  await recordAudit(db, admin, { action: "consent.publish", targetType: "consent", targetId: kind, meta: { version, length: checked.value.length } });
  return { version };
}
