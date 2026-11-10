import Link from "next/link";
import { notFound } from "next/navigation";
import { EMPTY_BODY, sanitizeBody } from "@/content/body";
import { STATUS_LABELS, allowedTransitions, suggestPublishAt, type ContentStatus } from "@/content/publish";
import { CONTENT_TYPES } from "@/content/types";
import { editableView, getContent, listEquipmentCategoryNames, publishProblems } from "@/data/admin/contents";
import { adminDb } from "@/data/admin/dbServer";
import { listMediaForPicker } from "@/data/admin/media";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTimeKst } from "@/lib/format";
import styles from "../../../admin.module.css";
import { readEquipmentFields } from "@/content/equipmentFields";
import { readTourFields } from "@/content/tourFields";
import { readTravelFields } from "@/content/travelFields";
import { readVideoFields } from "@/content/videoFields";
import { DeleteContentForm, DraftBanner, EditForm, RecruitForm, TransitionForm } from "../ContentForms";

export const metadata = { title: "콘텐츠 편집 · KYU 어드민" };

const TRANSITION_LABELS: Record<ContentStatus, string> = {
  draft: "임시저장으로 되돌리기",
  review: "검토 필요로 표시",
  scheduled: "예약하기",
  published: "지금 발행",
  archived: "보관",
};

export default async function ContentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const db = adminDb();
  const row = await getContent(db, admin, id);
  if (!row) notFound();
  const view = editableView(row);
  const body = sanitizeBody(view.body);
  const pickerMedia = await listMediaForPicker(db, admin);
  const status = row.status as ContentStatus;
  const problems = await publishProblems(db, admin, row, status === "review");
  const nextWeek = suggestPublishAt();
  const isTour = row.type === "tour";
  const tour = isTour ? readTourFields(view.fields) : null;
  const equipment = row.type === "equipment" ? readEquipmentFields(view.fields) : null;
  const video = row.type === "video" ? readVideoFields(view.fields) : null;
  const travel = row.type === "travel" ? readTravelFields(view.fields) : null;
  const categories = equipment ? await listEquipmentCategoryNames(db, admin) : [];

  return (
    <>
      <p style={{ margin: "0 0 8px" }}>
        <Link href="/admin/contents" className={styles.linkButton}>
          ← 전체 콘텐츠
        </Link>
      </p>
      <h1 className={styles.h1}>{row.title}</h1>
      <p className={styles.note}>
        <a href={`/admin/contents/${row.id}/preview`} target="_blank" rel="noopener noreferrer" className={styles.linkButton}>
          미리보기 (새 탭)
        </a>{" · "}
        {CONTENT_TYPES[row.type]?.label ?? row.type} · <span className={styles.statusTag}>{STATUS_LABELS[status]}</span>
        {status === "scheduled" && row.publishAt ? ` · ${formatDateTimeKst(row.publishAt)}에 공개 예정` : ""}
        {status === "published" && row.publishedAt ? ` · ${formatDateTimeKst(row.publishedAt)} 발행` : ""}
      </p>

      {CONTENT_TYPES[row.type]?.noPublicNote ? (
        <p role="note" className={styles.alert} style={{ marginBottom: 16 }}>
          {CONTENT_TYPES[row.type]?.noPublicNote}
        </p>
      ) : null}
      <div className={styles.twoCol}>
        <div className={styles.panel}>
          <EditForm
            initial={{
              id: row.id,
              type: row.type,
              tourFields: tour
                ? { startDate: tour.startDate, endDate: tour.endDate, place: tour.place, recruit: tour.recruit, capacity: tour.capacity === null ? "" : String(tour.capacity), feeNote: tour.feeNote, videos: tour.videos.join("\n") }
                : undefined,
              tourGallery: tour?.gallery,
              equipmentFields: equipment
                ? {
                    category: equipment.category,
                    brand: equipment.brand,
                    features: equipment.features.join("\n"),
                    thumbMediaId: equipment.thumbMediaId ?? "",
                    priceNote: equipment.priceNote,
                    checkedAt: equipment.checkedAt,
                    action: equipment.action,
                    externalUrl: equipment.externalUrl,
                    buttonLabel: equipment.buttonLabel,
                    affiliate: equipment.affiliate,
                    sortOrder: String(equipment.sortOrder),
                  }
                : undefined,
              videoFields: video ? { videoUrl: video.videoUrl, duration: video.duration, hasCaptions: video.hasCaptions } : undefined,
              travelFields: travel ? { region: travel.region, place: travel.place, season: travel.season, level: travel.level, budget: travel.budget, checkedAt: travel.checkedAt } : undefined,
              equipmentImages: equipment?.images.map((mediaId) => ({ mediaId, caption: "" })),
              categories,
              version: row.version,
              title: view.title,
              slug: row.slug,
              slugLocked: status === "published",
              summary: view.summary,
              bodyDoc: body.ok ? body.doc : EMPTY_BODY,
              tags: view.tags.join(", "),
              answers: view.answers.join("\n"),
              seoTitle: view.seoTitle,
              seoDescription: view.seoDescription,
              origin: view.origin,
              originNote: view.originNote,
            }}
            media={pickerMedia}
          />
        </div>

        <div>
          {view.hasDraft ? (
            <div className={styles.panel} style={{ marginBottom: 16 }}>
              <DraftBanner id={row.id} version={row.version} />
            </div>
          ) : null}

          <section className={styles.panel} aria-labelledby="publish-title">
            <h2 id="publish-title" className={styles.h2} style={{ marginTop: 0 }}>
              발행
            </h2>
            <p className={styles.note}>발행 전 점검</p>
            {problems.length === 0 ? (
              <p className={styles.note} style={{ marginTop: 0 }}>
                통과했습니다.
              </p>
            ) : (
              <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 14 }}>
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
            <div className={styles.form}>
              {allowedTransitions(status).map((to) => (
                <TransitionForm key={to} id={row.id} version={row.version} to={to} label={TRANSITION_LABELS[to]} needsTime={to === "scheduled"} defaultTime={nextWeek} />
              ))}
            </div>
            <p className={styles.note} style={{ margin: "12px 0 0" }}>
              예약한 글은 정해진 시각이 지나면 공개 화면에 5분 안에 나타납니다. “발행됨” 표시와 기록은 다음 자동 실행 때 정리되며, 현재 무료 플랜에서는 하루 한 번(한국 시간 오전 9시) 실행됩니다.
            </p>
          </section>

          {tour && status === "published" ? (
            <section className={styles.panel} style={{ marginTop: 16 }} aria-labelledby="recruit-title">
              <h2 id="recruit-title" className={styles.h2} style={{ marginTop: 0 }}>
                모집 상태
              </h2>
              <p className={styles.note}>마감하거나 다시 여는 것은 수정 내용 발행 없이 공개 화면에 바로 반영됩니다. 종료일이 지나면 모집 상태와 상관없이 “종료”로 보입니다.</p>
              <RecruitForm id={row.id} version={row.version} current={tour.recruit} />
            </section>
          ) : null}

          <div className={styles.panel} style={{ marginTop: 16 }}>
            <DeleteContentForm id={row.id} />
          </div>
        </div>
      </div>
    </>
  );
}
