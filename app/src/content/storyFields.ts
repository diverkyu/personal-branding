import { AppError } from "@/lib/errors";

/** Optional, independently selected thumbnail; never infer it from body images. */
export function cleanStoryFields(input: unknown): { thumbMediaId: string | null } {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>).thumbMediaId : undefined;
  if (raw === undefined || raw === null || raw === "") return { thumbMediaId: null };
  if (typeof raw !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw.trim())) {
    throw new AppError("validation", "스토리 대표 이미지가 올바르지 않습니다.");
  }
  return { thumbMediaId: raw.trim().toLowerCase() };
}

export function readStoryFields(input: unknown): { thumbMediaId: string | null } {
  try { return cleanStoryFields(input); }
  catch { return { thumbMediaId: null }; }
}
