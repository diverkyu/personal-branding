/**
 * 이미지 저장소 (ADMIN-DESIGN §9). 어댑터 하나를 환경변수로 고른다 — 정해지지 않으면 업로드는 "사용할 수 없음"이고,
 * 저장하지 못한 파일을 저장됐다고 말하지 않는다 (문의 저장소와 같은 원칙).
 * - MEDIA_STORE=blob  : Vercel Blob (BLOB_READ_WRITE_TOKEN 필요). 운영·프리뷰.
 * - MEDIA_STORE=local : 개발·시험 전용. 로컬 폴더(.media-dev)에 저장하고 /media-dev/... 로 보여 준다. 운영에서는 쓰이지 않는다.
 */
import { randomBytes } from "node:crypto";

export type StorageKind = "blob" | "local";

export interface MediaStorage {
  kind: StorageKind;
  /** 저장하고 공개 주소를 돌려준다 */
  put(key: string, data: Buffer, mime: string): Promise<{ url: string }>;
  remove(key: string): Promise<void>;
}

/** 서버가 만드는 무작위 경로: media/2026/11/<32자리 16진수>.webp. 원본 파일명은 쓰지 않는다 */
export function newStorageKey(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `media/${y}/${m}/${randomBytes(16).toString("hex")}.webp`;
}

const KEY = /^media\/\d{4}\/\d{2}\/[0-9a-f]{32}\.webp$/;
export const isValidStorageKey = (key: string): boolean => KEY.test(key);

export function mediaStoreKind(env: Record<string, string | undefined> = process.env): StorageKind | null {
  if (env.MEDIA_STORE === "blob" && env.BLOB_READ_WRITE_TOKEN?.trim()) return "blob";
  if (env.MEDIA_STORE === "local" && env.NODE_ENV !== "production") return "local";
  return null;
}

export async function getMediaStorage(env: Record<string, string | undefined> = process.env): Promise<MediaStorage | null> {
  const kind = mediaStoreKind(env);
  if (kind === "blob") {
    const token = env.BLOB_READ_WRITE_TOKEN!.trim();
    return {
      kind,
      async put(key, data, mime) {
        const { put } = await import("@vercel/blob");
        const result = await put(key, data, { access: "public", contentType: mime, addRandomSuffix: false, allowOverwrite: false, token, cacheControlMaxAge: 60 * 60 * 24 * 30 });
        return { url: result.url };
      },
      async remove(key) {
        const { del } = await import("@vercel/blob");
        await del(key, { token });
      },
    };
  }
  if (kind === "local") {
    const { createLocalStorage } = await import("./localStorage");
    return createLocalStorage(env.MEDIA_LOCAL_DIR || ".media-dev");
  }
  return null;
}
