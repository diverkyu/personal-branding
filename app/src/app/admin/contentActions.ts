"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminDb } from "@/data/admin/dbServer";
import {
  createContent,
  deleteContent,
  discardDraft,
  publishDraft,
  retryPublishJob,
  setRecruitStatus,
  saveContent,
  transitionContent,
  type ContentEdit,
} from "@/data/admin/contents";
import { STATUSES, parseKstLocal, type ContentOrigin, type ContentStatus } from "@/content/publish";
import { AppError, errorKindOf } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { refreshPublic } from "./refreshPublic";

/**
 * 콘텐츠 서버 액션. 호출할 때마다 requireAdmin() 을 다시 거친다.
 * 오류 문구는 입력 검증 오류만 그대로 보여 주고 나머지는 일반 안내로 바꾼다.
 */
export interface ContentState {
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

export async function createContentAction(_: ContentState, formData: FormData): Promise<ContentState> {
  const admin = await requireAdmin();
  const title = text(formData, "title", 200);
  let id: string;
  try {
    id = (await createContent(adminDb(), admin, { type: text(formData, "type", 30) || "story", title })).id;
  } catch (error) {
    logger.warn("admin.content.create", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: messageOf(error), values: { title } };
  }
  revalidatePath("/admin/contents");
  redirect(`/admin/contents/${id}`);
}

/** 화면의 입력을 ContentEdit 으로 만든다. 본문은 편집기가 보낸 JSON 이며 서버가 다시 검사한다 */
function editFromForm(formData: FormData): ContentEdit {
  let body: unknown;
  try {
    body = JSON.parse(text(formData, "bodyJson", 900_000));
  } catch {
    throw new AppError("validation", "본문을 읽을 수 없습니다. 새로고침한 뒤 다시 시도해 주세요.");
  }
  return {
    title: text(formData, "title", 300),
    slug: text(formData, "slug", 200),
    summary: text(formData, "summary", 1000),
    body,
    tags: text(formData, "tags", 400).split(/[,\n]/),
    answers: text(formData, "answers", 2000).split("\n"),
    seoTitle: text(formData, "seoTitle", 300),
    seoDescription: text(formData, "seoDescription", 500),
    origin: text(formData, "origin", 20) as ContentOrigin,
    originNote: text(formData, "originNote", 1000),
    fields: fieldsFromForm(formData),
  };
}

function jsonList(formData: FormData, key: string, what: string): unknown[] {
  const raw = text(formData, key, 20_000);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new AppError("validation", `${what}을(를) 읽을 수 없습니다. 새로고침한 뒤 다시 시도해 주세요.`);
  }
}

/**
 * 유형별 입력(f_ 로 시작하는 칸)을 항목으로 묶는다. 투어·장비 입력을 모두 담고, 서버가 글의 유형에 따라
 * 필요한 것만 검사해 쓰고 나머지는 버린다 (스토리는 모두 버린다).
 */
function fieldsFromForm(formData: FormData): Record<string, unknown> {
  const gallery = jsonList(formData, "galleryJson", "갤러리");
  const equipmentImages = jsonList(formData, "imagesJson", "추가 이미지").map((i) => (i && typeof i === "object" ? (i as { mediaId?: unknown }).mediaId : undefined));
  return {
    // 장비
    category: text(formData, "f_category", 200),
    brand: text(formData, "f_brand", 200),
    features: text(formData, "f_features", 3000).split(/\r?\n/),
    thumbMediaId: text(formData, "f_thumb", 64),
    images: equipmentImages,
    priceNote: text(formData, "f_priceNote", 200),
    checkedAt: text(formData, "f_checkedAt", 20),
    action: text(formData, "f_action", 20),
    externalUrl: text(formData, "f_externalUrl", 600),
    buttonLabel: text(formData, "f_buttonLabel", 100),
    affiliate: text(formData, "f_affiliate", 10) === "on",
    sortOrder: text(formData, "f_sortOrder", 10),
    // 투어
    startDate: text(formData, "f_startDate", 20),
    endDate: text(formData, "f_endDate", 20),
    place: text(formData, "f_place", 300),
    recruit: text(formData, "f_recruit", 20),
    capacity: text(formData, "f_capacity", 10),
    feeNote: text(formData, "f_feeNote", 2000),
    videos: text(formData, "f_videos", 3000).split(/\r?\n/),
    gallery,
  };
}

export async function saveContentAction(_: ContentState, formData: FormData): Promise<ContentState> {
  const admin = await requireAdmin();
  const id = text(formData, "id", 64);
  const values = Object.fromEntries(["title", "slug", "summary", "tags", "answers", "seoTitle", "seoDescription", "origin", "originNote", "f_startDate", "f_endDate", "f_place", "f_recruit", "f_capacity", "f_feeNote", "f_videos", "f_category", "f_thumb", "f_brand", "f_features", "f_priceNote", "f_checkedAt", "f_action", "f_externalUrl", "f_buttonLabel", "f_affiliate", "f_sortOrder"].map((k) => [k, text(formData, k, 5000)]));
  try {
    const db = adminDb();
    const saved = await saveContent(db, admin, id, versionOf(formData), editFromForm(formData));
    revalidatePath(`/admin/contents/${id}`);
    revalidatePath("/admin/contents");
    return { ok: true, message: saved.savedAsDraft ? "수정 내용을 저장했습니다. 공개 내용은 '수정 내용 발행'을 눌러야 바뀝니다." : "저장했습니다." };
  } catch (error) {
    logger.warn("admin.content.save", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: messageOf(error), values };
  }
}

export async function transitionContentAction(_: ContentState, formData: FormData): Promise<ContentState> {
  const admin = await requireAdmin();
  const id = text(formData, "id", 64);
  const to = text(formData, "to", 20);
  if (!(STATUSES as readonly string[]).includes(to)) return { error: "알 수 없는 상태입니다." };
  const publishAtRaw = text(formData, "publishAt", 30);
  let publishAt: Date | undefined;
  if (to === "scheduled") {
    publishAt = parseKstLocal(publishAtRaw) ?? undefined;
    if (!publishAt) return { error: "예약 시각을 입력해 주세요. (한국 시간)" };
  }
  try {
    await transitionContent(adminDb(), admin, id, to as ContentStatus, { version: versionOf(formData), publishAt });
    revalidatePath(`/admin/contents/${id}`);
    revalidatePath("/admin/contents");
    revalidatePath("/admin/schedule");
    refreshPublic();
    return { ok: true };
  } catch (error) {
    logger.warn("admin.content.transition", { outcome: "failed", errorKind: errorKindOf(error), to });
    return { error: messageOf(error) };
  }
}

export async function setRecruitAction(_: ContentState, formData: FormData): Promise<ContentState> {
  const admin = await requireAdmin();
  const id = text(formData, "id", 64);
  try {
    await setRecruitStatus(adminDb(), admin, id, versionOf(formData), text(formData, "recruit", 20));
    revalidatePath(`/admin/contents/${id}`);
    revalidatePath("/admin/contents");
    refreshPublic();
    return { ok: true, message: "모집 상태를 바꿨습니다. 공개 화면에 바로 반영됩니다." };
  } catch (error) {
    logger.warn("admin.content.recruit_status", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: messageOf(error) };
  }
}

export async function publishDraftAction(_: ContentState, formData: FormData): Promise<ContentState> {
  const admin = await requireAdmin();
  const id = text(formData, "id", 64);
  try {
    await publishDraft(adminDb(), admin, id, versionOf(formData));
    revalidatePath(`/admin/contents/${id}`);
    refreshPublic();
    return { ok: true, message: "수정 내용을 발행했습니다." };
  } catch (error) {
    logger.warn("admin.content.publish_draft", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: messageOf(error) };
  }
}

export async function discardDraftAction(_: ContentState, formData: FormData): Promise<ContentState> {
  const admin = await requireAdmin();
  const id = text(formData, "id", 64);
  try {
    await discardDraft(adminDb(), admin, id, versionOf(formData));
    revalidatePath(`/admin/contents/${id}`);
    return { ok: true, message: "수정 내용을 버렸습니다." };
  } catch (error) {
    logger.warn("admin.content.discard_draft", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: messageOf(error) };
  }
}

export async function deleteContentAction(_: ContentState, formData: FormData): Promise<ContentState> {
  const admin = await requireAdmin();
  if (text(formData, "confirm", 8) !== "yes") return { error: "삭제 확인이 필요합니다." };
  try {
    await deleteContent(adminDb(), admin, text(formData, "id", 64));
  } catch (error) {
    logger.warn("admin.content.delete", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: messageOf(error) };
  }
  revalidatePath("/admin/contents");
  refreshPublic();
  redirect("/admin/contents?deleted=1");
}

export async function retryJobAction(_: ContentState, formData: FormData): Promise<ContentState> {
  const admin = await requireAdmin();
  try {
    await retryPublishJob(adminDb(), admin, text(formData, "id", 64));
    revalidatePath("/admin/schedule");
    return { ok: true, message: "다시 시도하도록 했습니다. 다음 실행 때 발행됩니다." };
  } catch (error) {
    logger.warn("admin.content.retry_job", { outcome: "failed", errorKind: errorKindOf(error) });
    return { error: messageOf(error) };
  }
}
