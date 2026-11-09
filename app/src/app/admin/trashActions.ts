"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminDb } from "@/data/admin/dbServer";
import { isTrashKind, purgeItem, restoreItem } from "@/data/admin/trash";
import { AppError, errorKindOf } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { getMediaStorage } from "@/media/storage";

/**
 * 휴지통 서버 액션. 호출할 때마다 requireAdmin() 을 다시 거친다. 결과는 휴지통 화면의 안내(쿼리)로 알린다.
 * 영구 삭제는 "되돌릴 수 없음" 확인(confirm=yes)이 있어야 한다. 로그에는 종류와 오류 종류만 남긴다.
 */
function text(formData: FormData, key: string, max: number): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.slice(0, max) : "";
}

function messageOf(error: unknown): string {
  if (error instanceof AppError && (error.kind === "validation" || error.kind === "not_found")) return error.message;
  return "처리하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.";
}

function back(params: Record<string, string>): never {
  redirect(`/admin/trash?${new URLSearchParams(params).toString()}`);
}

export async function restoreTrashAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const kind = text(formData, "kind", 20);
  if (!isTrashKind(kind)) back({ error: "대상을 찾을 수 없습니다." });
  try {
    await restoreItem(adminDb(), admin, kind, text(formData, "id", 64));
  } catch (error) {
    logger.warn("admin.trash.restore", { outcome: "failed", kind, errorKind: errorKindOf(error) });
    back({ error: messageOf(error) });
  }
  revalidatePath("/admin/trash");
  back({ restored: kind });
}

export async function purgeTrashAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const kind = text(formData, "kind", 20);
  if (!isTrashKind(kind)) back({ error: "대상을 찾을 수 없습니다." });
  if (text(formData, "confirm", 8) !== "yes") back({ error: "영구 삭제는 “되돌릴 수 없음”을 확인해야 합니다." });
  try {
    await purgeItem(adminDb(), admin, kind, text(formData, "id", 64), await getMediaStorage());
  } catch (error) {
    logger.warn("admin.trash.purge", { outcome: "failed", kind, errorKind: errorKindOf(error) });
    back({ error: messageOf(error) });
  }
  revalidatePath("/admin/trash");
  back({ purged: kind });
}
