"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminDb } from "@/data/admin/dbServer";
import { discardHeroDraft, publishHero, resetHeroToDefault, saveHeroDraft } from "@/data/admin/homeHero";
import { cleanHeroMediaId } from "@/home/heroImage";
import { AppError, errorKindOf } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { refreshPublic } from "./refreshPublic";

/**
 * 홈 히어로 이미지 서버 액션 (ADMIN-DESIGN §47). 호출할 때마다 requireAdmin() 을 다시 거친다.
 * 모든 작업은 화면을 다시 불러오며 안내(쿼리)로 알린다. 공개 반영·되돌리기만 공개 캐시를 갱신한다.
 */
const PAGE = "/admin/home-hero";

function text(formData: FormData, key: string, max: number): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.slice(0, max) : "";
}

function versionOf(formData: FormData): number {
  const n = Number.parseInt(text(formData, "version", 10), 10);
  return Number.isFinite(n) && n >= 0 ? n : -1;
}

function messageOf(error: unknown): string {
  if (error instanceof AppError && (error.kind === "validation" || error.kind === "not_found")) return error.message;
  return "처리하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.";
}

function back(params: Record<string, string>): never {
  redirect(`${PAGE}?${new URLSearchParams(params).toString()}`);
}

async function run(name: string, done: string, publicChange: boolean, work: () => Promise<unknown>): Promise<void> {
  try {
    await work();
  } catch (error) {
    logger.warn(`admin.hero.${name}`, { outcome: "failed", errorKind: errorKindOf(error) });
    back({ error: messageOf(error) });
  }
  revalidatePath(PAGE);
  if (publicChange) refreshPublic();
  back({ done });
}

export async function saveHeroAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  await run("save", "saved", false, async () => saveHeroDraft(adminDb(), admin, versionOf(formData), cleanHeroMediaId(text(formData, "media", 64))));
}

export async function publishHeroAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  await run("publish", "published", true, async () => publishHero(adminDb(), admin, versionOf(formData)));
}

export async function discardHeroAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  await run("discard", "discarded", false, async () => discardHeroDraft(adminDb(), admin, versionOf(formData)));
}

export async function resetHeroAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  await run("reset", "reset", true, async () => resetHeroToDefault(adminDb(), admin, versionOf(formData)));
}
