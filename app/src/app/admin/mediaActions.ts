"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/data/admin/dbServer";
import { createMedia, deleteMedia, updateMediaAlt } from "@/data/admin/media";
import { AppError, errorKindOf } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { MEDIA_LIMITS, processImage } from "@/media/process";
import { getMediaStorage, newStorageKey } from "@/media/storage";

/**
 * 미디어 서버 액션. 호출할 때마다 requireAdmin() 을 다시 거친다.
 * 업로드는 서버가 형식·크기·해상도를 다시 확인하고, 위치정보를 지운 WebP 로 다시 만들어 저장한다 (SECURITY §7).
 * 오류 문구는 입력 검증 오류만 그대로 보여 주고 나머지는 일반 안내로 바꾼다.
 */
export interface MediaState {
  ok?: boolean;
  error?: string;
  /** 오류 뒤에도 입력한 대체 텍스트가 사라지지 않게 돌려준다 */
  alt?: string;
}

const NOT_CONFIGURED = "이미지 저장소가 아직 연결되지 않았습니다. 연결이 끝나면 올릴 수 있습니다.";

function messageOf(error: unknown): string {
  if (error instanceof AppError && (error.kind === "validation" || error.kind === "not_found")) return error.message;
  return "처리하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.";
}

function text(formData: FormData, key: string, max: number): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.slice(0, max) : "";
}

export async function uploadMediaAction(_: MediaState, formData: FormData): Promise<MediaState> {
  const admin = await requireAdmin();
  const alt = text(formData, "alt", 400);
  const storage = await getMediaStorage();
  if (!storage) return { error: NOT_CONFIGURED, alt };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "올릴 이미지를 선택해 주세요.", alt };
  // 읽기 전에 크기부터 확인한다 (큰 파일을 메모리에 올리지 않는다)
  if (file.size > MEDIA_LIMITS.maxInputBytes) return { error: `파일은 ${Math.round(MEDIA_LIMITS.maxInputBytes / 1024 / 1024)}MB 이하여야 합니다.`, alt };

  let key: string | undefined;
  try {
    const processed = await processImage(Buffer.from(await file.arrayBuffer()));
    key = newStorageKey();
    const { url } = await storage.put(key, processed.data, processed.mime);
    try {
      await createMedia(adminDb(), admin, { storage: storage.kind, storageKey: key, url, bytes: processed.data.length, width: processed.width, height: processed.height, alt });
    } catch (error) {
      // 기록하지 못했으면 올린 파일도 지운다 (고아 파일을 남기지 않는다)
      await storage.remove(key).catch(() => logger.warn("admin.media.cleanup_failed", { outcome: "failed" }));
      throw error;
    }
    logger.info("admin.media.upload", { outcome: "success", bytes: processed.data.length, width: processed.width, height: processed.height });
    revalidatePath("/admin/media");
    return { ok: true };
  } catch (error) {
    logger.warn("admin.media.upload", { outcome: "failed", errorKind: errorKindOf(error), stored: Boolean(key) });
    return { error: messageOf(error), alt };
  }
}

export async function updateMediaAltAction(_: MediaState, formData: FormData): Promise<MediaState> {
  const admin = await requireAdmin();
  const alt = text(formData, "alt", 400);
  try {
    await updateMediaAlt(adminDb(), admin, text(formData, "id", 64), alt);
    revalidatePath("/admin/media");
    return { ok: true, alt };
  } catch (error) {
    logger.warn("admin.media.alt", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: messageOf(error), alt };
  }
}

export async function deleteMediaAction(_: MediaState, formData: FormData): Promise<MediaState> {
  const admin = await requireAdmin();
  if (text(formData, "confirm", 8) !== "yes") return { error: "삭제 확인이 필요합니다." };
  try {
    await deleteMedia(adminDb(), admin, text(formData, "id", 64));
    revalidatePath("/admin/media");
    return { ok: true };
  } catch (error) {
    logger.warn("admin.media.delete", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: messageOf(error) };
  }
}
