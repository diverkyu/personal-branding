"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminDb } from "@/data/admin/dbServer";
import { deleteInquiry, updateInquiryMemo, updateInquiryStatus } from "@/data/admin/inquiries";
import { errorKindOf } from "@/lib/errors";
import { AppError } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

/**
 * 신청·문의 변경 서버 액션. 모든 액션이 호출될 때마다 requireAdmin() 을 다시 거친다 (화면에서 막혔다고 믿지 않는다).
 * 오류 문구는 사용자 입력 검증 오류만 그대로 보여 주고, 나머지는 일반 안내로 바꾼다.
 */
export interface ActionState {
  ok?: boolean;
  error?: string;
}

function field(formData: FormData, key: string, max: number): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.slice(0, max) : "";
}

function messageOf(error: unknown): string {
  if (error instanceof AppError && (error.kind === "validation" || error.kind === "not_found")) return error.message;
  return "저장하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.";
}

export async function updateStatusAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = field(formData, "id", 64);
  try {
    await updateInquiryStatus(adminDb(), admin, id, field(formData, "status", 30));
    revalidatePath("/admin/inquiries");
    revalidatePath(`/admin/inquiries/${id}`);
    return { ok: true };
  } catch (error) {
    logger.warn("admin.inquiry.status", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: messageOf(error) };
  }
}

export async function updateMemoAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = field(formData, "id", 64);
  try {
    await updateInquiryMemo(adminDb(), admin, id, field(formData, "memo", 2000));
    revalidatePath(`/admin/inquiries/${id}`);
    return { ok: true };
  } catch (error) {
    logger.warn("admin.inquiry.memo", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: messageOf(error) };
  }
}

/** 파기. 확인 값(confirm=yes) 없이는 동작하지 않는다 */
export async function deleteInquiryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  if (field(formData, "confirm", 8) !== "yes") return { error: "삭제 확인이 필요합니다." };
  try {
    await deleteInquiry(adminDb(), admin, field(formData, "id", 64));
  } catch (error) {
    logger.warn("admin.inquiry.delete", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: messageOf(error) };
  }
  revalidatePath("/admin/inquiries");
  redirect("/admin/inquiries?deleted=1");
}
