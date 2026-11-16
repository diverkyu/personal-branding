/**
 * 이미지 한 장을 받아 저장하고 미디어 기록을 만든다. 미디어 화면의 올리기와 본문 편집기의 "바로 올리기"가 함께 쓴다.
 * 서버가 형식·크기·해상도를 다시 확인하고 위치정보를 지운 WebP 로 다시 만든다(SECURITY §7). 기록하지 못하면 올린 파일도 지운다.
 * `admin: AdminSession` 은 requireAdmin() 이 만든 값이다.
 */
import type { MediaRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import type { AdminSession } from "@/lib/auth/types";
import { logger } from "@/lib/logger";
import { MEDIA_LIMITS, processImage } from "@/media/process";
import { newStorageKey, type MediaStorage } from "@/media/storage";
import type { AdminDb } from "./db";
import { createMedia } from "./media";

/** 올린 파일에서 필요한 것만 (File 과 같은 모양이라 시험에서 가짜로 넘기기 쉽다) */
export interface UploadedFile {
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export async function storeUploadedImage(db: AdminDb, admin: AdminSession, storage: MediaStorage, file: UploadedFile, alt: string): Promise<MediaRow> {
  if (file.size === 0) throw new AppError("validation", "올릴 이미지를 선택해 주세요.");
  // 읽기 전에 크기부터 확인한다 (큰 파일을 메모리에 올리지 않는다)
  if (file.size > MEDIA_LIMITS.maxInputBytes) throw new AppError("validation", `파일은 ${Math.round(MEDIA_LIMITS.maxInputBytes / 1024 / 1024)}MB 이하여야 합니다.`);
  const processed = await processImage(Buffer.from(await file.arrayBuffer()));
  const key = newStorageKey();
  const { url } = await storage.put(key, processed.data, processed.mime);
  try {
    return await createMedia(db, admin, { storage: storage.kind, storageKey: key, url, bytes: processed.data.length, width: processed.width, height: processed.height, alt });
  } catch (error) {
    // 기록하지 못했으면 올린 파일도 지운다 (고아 파일을 남기지 않는다)
    await storage.remove(key).catch(() => logger.warn("admin.media.cleanup_failed", { outcome: "failed" }));
    throw error;
  }
}
