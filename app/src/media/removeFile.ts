import { AppError } from "@/lib/errors";
import type { MediaStorage } from "./storage";

/** 저장소의 이미지 파일을 지운다. 저장소를 쓸 수 없거나 종류가 다르면 던진다(DB 행을 지우기 전에 부른다) */
export async function removeFile(storage: MediaStorage | null, row: { storage: string; storageKey: string }): Promise<void> {
  if (!storage || storage.kind !== row.storage) {
    throw new AppError("validation", "이미지 저장소를 사용할 수 없어 파일을 지울 수 없습니다. 저장소 설정을 확인한 뒤 다시 시도해 주세요.");
  }
  await storage.remove(row.storageKey);
}
