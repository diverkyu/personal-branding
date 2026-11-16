"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/data/admin/dbServer";
import { deleteMedia, updateMediaAlt } from "@/data/admin/media";
import { storeUploadedImage } from "@/data/admin/mediaUpload";
import { AppError, errorKindOf } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { getMediaStorage } from "@/media/storage";

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
  try {
    const row = await storeUploadedImage(adminDb(), admin, storage, file, alt);
    logger.info("admin.media.upload", { outcome: "success", bytes: row.bytes, width: row.width, height: row.height });
    revalidatePath("/admin/media");
    return { ok: true };
  } catch (error) {
    logger.warn("admin.media.upload", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: messageOf(error), alt };
  }
}

/** 본문 편집기의 이미지 칸에서 바로 올린다. 올린 이미지의 id·주소를 돌려줘 그 자리에서 본문에 넣는다 */
export interface EditorUploadResult {
  ok: boolean;
  error?: string;
  media?: { id: string; url: string; alt: string; width: number; height: number };
}

export async function uploadEditorImageAction(formData: FormData): Promise<EditorUploadResult> {
  const admin = await requireAdmin();
  const alt = text(formData, "alt", 400);
  const storage = await getMediaStorage();
  if (!storage) return { ok: false, error: NOT_CONFIGURED };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "올릴 이미지를 선택해 주세요." };
  try {
    const row = await storeUploadedImage(adminDb(), admin, storage, file, alt);
    logger.info("admin.media.upload", { outcome: "success", from: "editor", bytes: row.bytes, width: row.width, height: row.height });
    revalidatePath("/admin/media");
    return { ok: true, media: { id: row.id, url: row.url, alt: row.alt ?? "", width: row.width, height: row.height } };
  } catch (error) {
    logger.warn("admin.media.upload", { outcome: "failed", from: "editor", errorKind: errorKindOf(error) });
    return { ok: false, error: messageOf(error) };
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
