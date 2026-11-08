import "server-only";
import { getDb } from "@/db/client";
import { AppError } from "@/lib/errors";
import type { AdminDb } from "./db";

/** 어드민이 쓰는 운영 DB. 설정이 없으면 던진다 (인증이 설정돼 있다면 DATABASE_URL 도 있다). */
export function adminDb(env: Record<string, string | undefined> = process.env): AdminDb {
  const url = env.DATABASE_URL?.trim();
  if (!url) throw new AppError("external", "DATABASE_URL 이 설정되지 않았습니다.");
  return getDb(url) as unknown as AdminDb;
}
