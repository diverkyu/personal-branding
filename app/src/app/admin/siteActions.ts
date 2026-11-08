"use server";

import { revalidatePath, updateTag } from "next/cache";
import { adminDb } from "@/data/admin/dbServer";
import { publishConsentVersion, saveSettings, type SettingInput } from "@/data/admin/settings";
import { AppError, errorKindOf } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { CONSENT_KINDS, type ConsentKind } from "@/settings/consent";
import { CONSENT_TAG, SETTINGS_TAG } from "@/settings/read";
import { SETTINGS, SETTING_GROUPS, type SettingGroup } from "@/settings/registry";

/**
 * 사이트 설정·동의 문구 서버 액션. 호출할 때마다 requireAdmin() 을 다시 거친다.
 * 저장하면 공개 화면의 캐시를 바로 갱신한다 (updateTag).
 */
export interface SettingsState {
  ok?: boolean;
  changed?: number;
  errors?: Record<string, string>;
  error?: string;
  /** 오류 뒤에도 입력한 값이 사라지지 않게 돌려준다 */
  values?: Record<string, string>;
}

function text(formData: FormData, key: string, max: number): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.slice(0, max) : "";
}

export async function saveSettingsGroupAction(group: string, _: SettingsState, formData: FormData): Promise<SettingsState> {
  const admin = await requireAdmin();
  if (!SETTING_GROUPS.some((g) => g.id === group)) return { error: "알 수 없는 설정 묶음입니다." };
  const inputs: SettingInput[] = SETTINGS.filter((s) => s.group === (group as SettingGroup)).map((s) => ({
    key: s.key,
    value: text(formData, `v_${s.key}`, 2000),
    version: Number.parseInt(text(formData, `ver_${s.key}`, 10), 10) || 0,
  }));
  try {
    const result = await saveSettings(adminDb(), admin, inputs, { confirmBrandCore: text(formData, "confirmBrand", 4) === "on" });
    if (!result.ok) return { errors: result.errors, values: Object.fromEntries(inputs.map((i) => [i.key, i.value])), error: result.conflict ? "다른 곳에서 먼저 저장한 항목이 있습니다." : undefined };
    if (result.changed > 0) {
      updateTag(SETTINGS_TAG);
      // 정적으로 만들어 둔 공개 페이지(머리글·푸터·제목에 설정이 들어감)도 바로 다시 만들게 한다
      revalidatePath("/", "layout");
    }
    logger.info("admin.settings.save", { outcome: "success", changed: result.changed });
    return { ok: true, changed: result.changed };
  } catch (error) {
    logger.warn("admin.settings.save", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: error instanceof AppError && error.kind === "validation" ? error.message : "저장하지 못했습니다. 잠시 뒤에 다시 시도해 주세요." };
  }
}

export interface ConsentState {
  ok?: boolean;
  version?: number;
  error?: string;
  /** 오류 뒤에도 입력한 본문이 사라지지 않게 돌려준다 */
  body?: string;
}

export async function publishConsentAction(kind: string, _: ConsentState, formData: FormData): Promise<ConsentState> {
  const admin = await requireAdmin();
  if (!CONSENT_KINDS.includes(kind as ConsentKind)) return { error: "알 수 없는 종류입니다." };
  if (text(formData, "confirm", 4) !== "on") return { error: "새 버전을 게시하려면 확인 상자를 선택해 주세요.", body: text(formData, "body", 21000) };
  try {
    const { version } = await publishConsentVersion(adminDb(), admin, kind as ConsentKind, text(formData, "body", 21000));
    updateTag(CONSENT_TAG);
    revalidatePath("/", "layout");
    logger.info("admin.consent.publish", { outcome: "success", kind, version });
    return { ok: true, version };
  } catch (error) {
    logger.warn("admin.consent.publish", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: error instanceof AppError && error.kind === "validation" ? error.message : "게시하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.", body: text(formData, "body", 21000) };
  }
}
