"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminDb } from "@/data/admin/dbServer";
import { createReview, deleteReview, saveReview, setReviewStatus, withdrawReview } from "@/data/admin/reviews";
import { AppError, errorKindOf } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ReviewInput, ReviewStatus } from "@/reviews/fields";
import { refreshPublic } from "./refreshPublic";

/**
 * 후기 서버 액션. 호출할 때마다 requireAdmin() 을 다시 거친다. 오류 문구는 입력 검증 오류만 그대로 보여 주고 나머지는 일반 안내로 바꾼다.
 * 로그에는 후기 내용·수강생 표기를 남기지 않는다(오류 종류만).
 */
export interface ReviewState {
  ok?: boolean;
  error?: string;
  message?: string;
  /** 오류 뒤에도 입력한 값이 사라지지 않게 돌려준다 */
  values?: Record<string, string>;
}

function text(formData: FormData, key: string, max: number): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.slice(0, max) : "";
}

function messageOf(error: unknown): string {
  if (error instanceof AppError && (error.kind === "validation" || error.kind === "not_found")) return error.message;
  return "처리하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.";
}

function versionOf(formData: FormData): number {
  const n = Number.parseInt(text(formData, "version", 10), 10);
  return Number.isFinite(n) && n >= 1 ? n : 0;
}

const VALUE_KEYS = ["body", "authorLabel", "labelKind", "writtenOn", "sourceKind", "sourceNote", "tourSlug", "featured", "featuredOrder", "consentConfirmed", "consentNote"] as const;

function inputFromForm(formData: FormData): ReviewInput {
  return {
    body: text(formData, "body", 5000),
    authorLabel: text(formData, "authorLabel", 400),
    labelKind: text(formData, "labelKind", 20),
    writtenOn: text(formData, "writtenOn", 20),
    sourceKind: text(formData, "sourceKind", 20),
    sourceNote: text(formData, "sourceNote", 1000),
    tourSlug: text(formData, "tourSlug", 100),
    featured: text(formData, "featured", 10) === "on",
    featuredOrder: text(formData, "featuredOrder", 10),
    consentConfirmed: text(formData, "consentConfirmed", 10) === "on",
    consentNote: text(formData, "consentNote", 1000),
  };
}

const valuesOf = (formData: FormData): Record<string, string> => Object.fromEntries(VALUE_KEYS.map((k) => [k, text(formData, k, 5000)]));

export async function createReviewAction(_: ReviewState, formData: FormData): Promise<ReviewState> {
  const admin = await requireAdmin();
  let id: string;
  try {
    id = (await createReview(adminDb(), admin, inputFromForm(formData))).id;
  } catch (error) {
    logger.warn("admin.review.create", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: messageOf(error), values: valuesOf(formData) };
  }
  revalidatePath("/admin/reviews");
  redirect(`/admin/reviews/${id}`);
}

export async function saveReviewAction(_: ReviewState, formData: FormData): Promise<ReviewState> {
  const admin = await requireAdmin();
  const id = text(formData, "id", 64);
  try {
    await saveReview(adminDb(), admin, id, versionOf(formData), inputFromForm(formData));
    revalidatePath(`/admin/reviews/${id}`);
    revalidatePath("/admin/reviews");
    // 공개 중인 후기를 고치면 바로 공개 화면에 반영된다
    refreshPublic();
    return { ok: true, message: "저장했습니다. 공개 중인 후기라면 공개 화면에 바로 반영됩니다." };
  } catch (error) {
    logger.warn("admin.review.save", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: messageOf(error), values: valuesOf(formData) };
  }
}

export async function setReviewStatusAction(_: ReviewState, formData: FormData): Promise<ReviewState> {
  const admin = await requireAdmin();
  const id = text(formData, "id", 64);
  const to = text(formData, "to", 10) as ReviewStatus;
  try {
    await setReviewStatus(adminDb(), admin, id, versionOf(formData), to);
    revalidatePath(`/admin/reviews/${id}`);
    revalidatePath("/admin/reviews");
    refreshPublic();
    return { ok: true, message: to === "public" ? "공개했습니다." : "비공개로 바꿨습니다." };
  } catch (error) {
    logger.warn("admin.review.status", { outcome: "failed", errorKind: errorKindOf(error), to });
    return { error: messageOf(error) };
  }
}

export async function withdrawReviewAction(_: ReviewState, formData: FormData): Promise<ReviewState> {
  const admin = await requireAdmin();
  const id = text(formData, "id", 64);
  try {
    await withdrawReview(adminDb(), admin, id);
  } catch (error) {
    logger.warn("admin.review.withdraw", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: messageOf(error) };
  }
  revalidatePath("/admin/reviews");
  refreshPublic();
  // 철회하면 철회 버튼이 있던 패널이 사라지므로, 완료 안내는 이동한 화면의 배너로 보여 준다
  redirect(`/admin/reviews/${id}?withdrawn=1`);
}

export async function deleteReviewAction(_: ReviewState, formData: FormData): Promise<ReviewState> {
  const admin = await requireAdmin();
  if (text(formData, "confirm", 8) !== "yes") return { error: "삭제 확인이 필요합니다." };
  try {
    await deleteReview(adminDb(), admin, text(formData, "id", 64));
  } catch (error) {
    logger.warn("admin.review.delete", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: messageOf(error) };
  }
  revalidatePath("/admin/reviews");
  refreshPublic();
  redirect("/admin/reviews?deleted=1");
}
