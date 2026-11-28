"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { adminDb } from "@/data/admin/dbServer";
import { saveJournal, deleteJournal, saveField } from "@/data/seo/store";
import { syncSeo } from "@/data/seo/sync";
import { resolveSiteUrl } from "@/config/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { JournalInput } from "@/seo/model";
export interface SeoFormState { error?: string; message?: string }
const text = (f: FormData, key: string) => typeof f.get(key) === "string" ? f.get(key) as string : "";

export async function journalAction(_: SeoFormState, form: FormData): Promise<SeoFormState> {
  const admin = await requireAdmin();
  try {
    const id = text(form, "id"), version = Number(text(form, "version"));
    if (text(form, "operation") === "delete") await deleteJournal(adminDb(), admin, id, version, form.get("confirm") === "on");
    else {
      const input = Object.fromEntries(["title", "engine", "url", "observedOn", "sourceUrl", "note", "periodStart", "periodEnd", "clicks", "impressions"].map(k => [k, text(form, k)])) as unknown as JournalInput;
      await saveJournal(adminDb(), admin, input, resolveSiteUrl(process.env).url.origin, id || undefined, version, text(form, "status"));
    }
    revalidatePath("/admin/seo/[section]", "page");
    return { message: "점검 일지를 저장했습니다." };
  } catch (e) {
    logger.warn("seo.journal", { outcome: "failed", errorKind: e instanceof AppError ? e.kind : "external" });
    return { error: e instanceof AppError ? e.message : "저장하지 못했습니다. DB 연결과 마이그레이션을 확인해 주세요." };
  }
}
export async function fieldAction(_: SeoFormState, form: FormData): Promise<SeoFormState> {
  const admin = await requireAdmin();
  try {
    await saveField(adminDb(), admin, text(form, "url"), text(form, "field"), resolveSiteUrl(process.env).url.origin);
    revalidatePath("/admin/seo/[section]", "page");
    return { message: "콘텐츠 분야를 저장했습니다." };
  } catch (e) {
    logger.warn("seo.field", { outcome: "failed" });
    return { error: e instanceof AppError ? e.message : "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }
}
export async function syncAction(): Promise<SeoFormState> {
  await requireAdmin();
  try {
    const result = await syncSeo(adminDb());
    revalidatePath("/admin/seo/[section]", "page");
    const labels: Record<string, string> = { success: "동기화 완료", not_connected: "미연동", skipped: "오늘 동기화 완료·실행 중 또는 재시도 대기", expired: "실행 기한 만료" };
    return { message: Object.entries(result).map(([engine, outcome]) => `${engine}: ${labels[outcome] ?? "실패 — 아래 오류 상태를 확인해 주세요"}`).join(" / ") };
  } catch {
    logger.warn("seo.sync.manual", { outcome: "failed" });
    return { error: "동기화하지 못했습니다. DB 연결과 마이그레이션을 확인해 주세요." };
  }
}
