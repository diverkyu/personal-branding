"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminDb } from "@/data/admin/dbServer";
import { discardAboutDraft, publishAbout, saveAboutDraft, unpublishAbout } from "@/data/admin/about";
import { AppError, errorKindOf } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { refreshPublic } from "./refreshPublic";

/**
 * About 서버 액션. 호출할 때마다 requireAdmin() 을 다시 거친다. 오류 문구는 입력 검증 오류만 그대로 보여 주고 나머지는 일반 안내로 바꾼다.
 * 저장은 같은 화면에 안내를 보이고, 공개 반영·버리기·공개 중단은 화면을 다시 불러오며 안내(쿼리)로 알린다(버튼이 사라지는 작업이라서).
 */
export interface AboutState {
  ok?: boolean;
  error?: string;
  message?: string;
}

function text(formData: FormData, key: string, max: number): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.slice(0, max) : "";
}

function messageOf(error: unknown): string {
  if (error instanceof AppError && (error.kind === "validation" || error.kind === "not_found")) return error.message;
  return "처리하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.";
}

function versionOf(formData: FormData): number {
  const n = Number.parseInt(text(formData, "version", 10), 10);
  return Number.isFinite(n) && n >= 0 ? n : -1;
}

export async function saveAboutAction(_: AboutState, formData: FormData): Promise<AboutState> {
  const admin = await requireAdmin();
  try {
    let body: unknown;
    try {
      body = JSON.parse(text(formData, "bodyJson", 900_000));
    } catch {
      throw new AppError("validation", "본문을 읽을 수 없습니다. 새로고침한 뒤 다시 시도해 주세요.");
    }
    await saveAboutDraft(adminDb(), admin, versionOf(formData), {
      headline: text(formData, "headline", 400),
      body,
      signature: text(formData, "signature", 400),
      photoMediaId: text(formData, "photo", 64),
    });
    revalidatePath("/admin/about");
    return { ok: true, message: "저장했습니다. 공개 화면은 “공개 반영”을 눌러야 바뀝니다." };
  } catch (error) {
    logger.warn("admin.about.save", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: messageOf(error) };
  }
}

function back(params: Record<string, string>): never {
  redirect(`/admin/about?${new URLSearchParams(params).toString()}`);
}

export async function publishAboutAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  try {
    await publishAbout(adminDb(), admin, versionOf(formData));
  } catch (error) {
    logger.warn("admin.about.publish", { outcome: "failed", errorKind: errorKindOf(error) });
    back({ error: messageOf(error) });
  }
  revalidatePath("/admin/about");
  refreshPublic();
  back({ done: "published" });
}

export async function discardAboutAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  try {
    await discardAboutDraft(adminDb(), admin, versionOf(formData));
  } catch (error) {
    logger.warn("admin.about.discard", { outcome: "failed", errorKind: errorKindOf(error) });
    back({ error: messageOf(error) });
  }
  revalidatePath("/admin/about");
  back({ done: "discarded" });
}

export async function unpublishAboutAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  try {
    await unpublishAbout(adminDb(), admin, versionOf(formData));
  } catch (error) {
    logger.warn("admin.about.unpublish", { outcome: "failed", errorKind: errorKindOf(error) });
    back({ error: messageOf(error) });
  }
  revalidatePath("/admin/about");
  refreshPublic();
  back({ done: "unpublished" });
}
