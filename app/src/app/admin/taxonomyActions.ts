"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminDb } from "@/data/admin/dbServer";
import { removeTag, renameCategory, renameTag, type TaxonomyResult } from "@/data/admin/taxonomy";
import { addRegisteredTerm, removeRegisteredTerm, type TermKind } from "@/data/admin/taxonomyRegistry";
import { AppError, errorKindOf } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { refreshPublic } from "./refreshPublic";

/**
 * 태그·카테고리 서버 액션. 호출할 때마다 requireAdmin() 을 다시 거친다.
 * 결과는 화면을 다시 불러오며 안내(쿼리)로 알린다. 로그에는 이름을 남기지 않는다(종류와 오류 종류만).
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
  redirect(`/admin/taxonomy?${new URLSearchParams(params).toString()}`);
}

function done(kind: string, r: TaxonomyResult): never {
  revalidatePath("/admin/taxonomy");
  revalidatePath("/admin/contents");
  refreshPublic();
  back({ done: kind, changed: String(r.changed), skipped: String(r.skipped) });
}

export async function renameTagAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  let result: TaxonomyResult;
  try {
    result = await renameTag(adminDb(), admin, text(formData, "from", 100), text(formData, "to", 100));
  } catch (error) {
    logger.warn("admin.taxonomy.rename", { outcome: "failed", kind: "tag", errorKind: errorKindOf(error) });
    back({ error: messageOf(error) });
  }
  done("rename", result);
}

export async function removeTagAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (text(formData, "confirm", 8) !== "yes") back({ error: "태그 지우기는 확인 체크가 필요합니다." });
  let result: TaxonomyResult;
  try {
    result = await removeTag(adminDb(), admin, text(formData, "from", 100));
  } catch (error) {
    logger.warn("admin.taxonomy.remove", { outcome: "failed", kind: "tag", errorKind: errorKindOf(error) });
    back({ error: messageOf(error) });
  }
  done("remove", result);
}

export async function renameCategoryAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  let result: TaxonomyResult;
  try {
    result = await renameCategory(adminDb(), admin, text(formData, "from", 100), text(formData, "to", 100));
  } catch (error) {
    logger.warn("admin.taxonomy.rename", { outcome: "failed", kind: "category", errorKind: errorKindOf(error) });
    back({ error: messageOf(error) });
  }
  done("rename", result);
}

const kindOf = (formData: FormData): TermKind => (text(formData, "kind", 12) === "category" ? "category" : "tag");

/** 새 태그·카테고리를 미리 등록한다 (글에서 아직 쓰지 않아도 된다) */
export async function addTermAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const kind = kindOf(formData);
  let added = false;
  try {
    added = (await addRegisteredTerm(adminDb(), admin, kind, text(formData, "name", 100))).added;
  } catch (error) {
    logger.warn("admin.taxonomy.add", { outcome: "failed", kind, errorKind: errorKindOf(error) });
    back({ error: messageOf(error) });
  }
  revalidatePath("/admin/taxonomy");
  revalidatePath("/admin/contents");
  back({ done: "add", kind, added: added ? "1" : "0" });
}

/** 쓰는 글이 없는 이름을 등록 목록에서 지운다 */
export async function unregisterTermAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const kind = kindOf(formData);
  try {
    await removeRegisteredTerm(adminDb(), admin, kind, text(formData, "name", 100));
  } catch (error) {
    logger.warn("admin.taxonomy.unregister", { outcome: "failed", kind, errorKind: errorKindOf(error) });
    back({ error: messageOf(error) });
  }
  revalidatePath("/admin/taxonomy");
  revalidatePath("/admin/contents");
  back({ done: "unregister", kind });
}

