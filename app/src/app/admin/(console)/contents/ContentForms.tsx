"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea, TextField } from "@/components/ui/Field";
import { RichEditor, type PickerMedia } from "@/editor/RichEditor";
import { RECRUIT_LABELS, RECRUIT_VALUES } from "@/content/tourFields";
import {
  createContentAction,
  deleteContentAction,
  discardDraftAction,
  publishDraftAction,
  retryJobAction,
  saveContentAction,
  setRecruitAction,
  transitionContentAction,
  type ContentState,
} from "../../contentActions";
import styles from "../../admin.module.css";
import { CONTENT_TYPES } from "@/content/types";
import { EquipmentFieldsSection, type EquipmentFieldsValues } from "./EquipmentFieldsSection";
import { TourFieldsSection, type GalleryEntry, type TourFieldsValues } from "./TourFieldsSection";
import { TravelFieldsSection, VideoFieldsSection, type TravelFieldsValues, type VideoFieldsValues } from "./VideoTravelSections";

function Notice({ state }: { state: ContentState }) {
  return (
    <>
      {state.error ? (
        <p role="alert" className={styles.alert}>
          {state.error}
        </p>
      ) : null}
      {state.ok && state.message ? (
        <p role="status" className={styles.alert}>
          {state.message}
        </p>
      ) : null}
    </>
  );
}

export function NewContentForm({ type = "story", noun = "스토리", nameLabel = "제목" }: { type?: string; noun?: string; nameLabel?: string }) {
  const [state, action, pending] = useActionState<ContentState, FormData>(createContentAction, {});
  return (
    <form action={action} className={styles.row} noValidate aria-label={`새 ${noun} 만들기`}>
      <input type="hidden" name="type" value={type} />
      <div style={{ flex: "1 1 260px" }}>
        <TextField id={`new-title-${type}`} key={state.values?.title ?? ""} name="title" label={`새 ${noun} ${nameLabel}`} defaultValue={state.values?.title} maxLength={85} surface="light" error={state.error} />
      </div>
      <Button type="submit" busy={pending} variant="dark" surface="light" size="S">
        {pending ? "만드는 중" : "만들기"}
      </Button>
    </form>
  );
}

export interface EditInitial {
  id: string;
  /** 콘텐츠 유형. 투어이면 투어 정보 입력이 더해진다 */
  type: string;
  /** 투어일 때만 */
  tourFields?: TourFieldsValues;
  tourGallery?: GalleryEntry[];
  /** 장비일 때만 */
  equipmentFields?: EquipmentFieldsValues;
  equipmentImages?: GalleryEntry[];
  /** 영상일 때만 */
  videoFields?: VideoFieldsValues;
  /** 여행 추천일 때만 */
  travelFields?: TravelFieldsValues;
  /** 장비 카테고리 후보 (이미 쓰고 있는 것) */
  categories?: string[];
  version: number;
  title: string;
  slug: string;
  slugLocked: boolean;
  summary: string;
  /** 본문 문서(JSON). 편집기가 이것으로 시작한다 */
  bodyDoc: unknown;
  tags: string;
  answers: string;
  seoTitle: string;
  seoDescription: string;
  origin: string;
  originNote: string;
}

const ORIGIN_OPTIONS = [
  { value: "manual", label: "직접 씀" },
  { value: "ai_assisted", label: "AI 도움" },
  { value: "automated", label: "자동 생성" },
];

export function EditForm({ initial, media }: { initial: EditInitial; media: PickerMedia[] }) {
  const [state, action, pending] = useActionState<ContentState, FormData>(saveContentAction, {});
  const v = state.error ? state.values : undefined;
  const pick = (key: keyof EditInitial & string, name: string = key) => (v?.[name] ?? (initial[key] as string));
  const ef = initial.equipmentFields;
  const equipmentValues: EquipmentFieldsValues | undefined = ef && {
    category: v?.f_category ?? ef.category,
    brand: v?.f_brand ?? ef.brand,
    features: v?.f_features ?? ef.features,
    thumbMediaId: v?.f_thumb ?? ef.thumbMediaId,
    priceNote: v?.f_priceNote ?? ef.priceNote,
    checkedAt: v?.f_checkedAt ?? ef.checkedAt,
    action: v?.f_action ?? ef.action,
    externalUrl: v?.f_externalUrl ?? ef.externalUrl,
    buttonLabel: v?.f_buttonLabel ?? ef.buttonLabel,
    affiliate: v ? v.f_affiliate === "on" : ef.affiliate,
    sortOrder: v?.f_sortOrder ?? ef.sortOrder,
  };
  const vf = initial.videoFields;
  const videoValues: VideoFieldsValues | undefined = vf && {
    videoUrl: v?.f_videoUrl ?? vf.videoUrl,
    duration: v?.f_duration ?? vf.duration,
    hasCaptions: v ? v.f_captions === "on" : vf.hasCaptions,
    posterMediaId: v?.f_poster ?? vf.posterMediaId,
    cutLabel: v?.f_cutLabel ?? vf.cutLabel,
    featured: v ? v.f_featured === "on" : vf.featured,
    sceneIntent: v?.f_sceneIntent ?? vf.sceneIntent,
    promptNotes: v?.f_promptNotes ?? vf.promptNotes,
    editNotes: v?.f_editNotes ?? vf.editNotes,
  };
  const tvf = initial.travelFields;
  const travelValues: TravelFieldsValues | undefined = tvf && {
    region: v?.f_region ?? tvf.region,
    place: v?.f_place ?? tvf.place,
    season: v?.f_season ?? tvf.season,
    level: v?.f_level ?? tvf.level,
    budget: v?.f_budget ?? tvf.budget,
    checkedAt: v?.f_checkedAt ?? tvf.checkedAt,
  };
  const typeDef = CONTENT_TYPES[initial.type];
  const summaryLabel = typeDef?.summaryLabel ? `${typeDef.summaryLabel} (${typeDef.summaryMax}자 이하)` : "요약 (160자 이하)";
  const tf = initial.tourFields;
  const tourValues: TourFieldsValues | undefined = tf && {
    startDate: v?.f_startDate ?? tf.startDate,
    endDate: v?.f_endDate ?? tf.endDate,
    place: v?.f_place ?? tf.place,
    recruit: v?.f_recruit ?? tf.recruit,
    capacity: v?.f_capacity ?? tf.capacity,
    feeNote: v?.f_feeNote ?? tf.feeNote,
    videos: v?.f_videos ?? tf.videos,
  };
  const k = `${initial.version}-${state.error ? JSON.stringify(state.values).length : 0}`;
  return (
    <form action={action} className={styles.form} noValidate aria-label="콘텐츠 편집">
      <Notice state={state} />
      <input type="hidden" name="id" value={initial.id} />
      <input type="hidden" name="version" value={initial.version} />
      <TextField key={`t-${k}`} id="c-title" name="title" label="제목" defaultValue={pick("title")} maxLength={85} required surface="light" />
      <TextField
        key={`s-${k}`}
        id="c-slug"
        name="slug"
        label="주소 이름"
        defaultValue={pick("slug")}
        maxLength={80}
        disabled={initial.slugLocked}
        hint={initial.slugLocked ? "발행된 글의 주소 이름은 바꿀 수 없습니다. 먼저 발행을 취소해 주세요." : "영소문자·숫자·하이픈. 글 주소가 됩니다."}
        surface="light"
      />
      {initial.slugLocked ? <input type="hidden" name="slug" value={initial.slug} /> : null}
      <Textarea
        key={`su-${k}`}
        id="c-summary"
        name="summary"
        label={summaryLabel}
        rows={2}
        defaultValue={pick("summary")}
        hint={typeDef?.summaryRequired ? "카드에 보이는 한 줄입니다. 발행하려면 필요합니다." : "발행 전 점검에서 160자를 넘으면 막힙니다. 비우면 본문 앞부분을 씁니다."}
        surface="light"
      />
      {equipmentValues ? <EquipmentFieldsSection values={equipmentValues} images={initial.equipmentImages ?? []} media={media} categories={initial.categories ?? []} keySuffix={k} /> : null}
      {videoValues ? <VideoFieldsSection values={videoValues} media={media} keySuffix={k} /> : null}
      {travelValues ? <TravelFieldsSection values={travelValues} keySuffix={k} /> : null}
      {tourValues ? <TourFieldsSection values={tourValues} gallery={initial.tourGallery ?? []} media={media} recruitLocked={initial.slugLocked} keySuffix={k} /> : null}
      <div>
        <p className={styles.fieldLabel} id="body-label">
          {typeDef?.bodyLabel ?? "본문"}
        </p>
        <RichEditor initial={initial.bodyDoc} media={media} resetKey={initial.version} />
      </div>
      <TextField key={`tg-${k}`} id="c-tags" name="tags" label="태그 (쉼표로 구분, 5개까지)" defaultValue={pick("tags")} surface="light" />
      <Textarea key={`a-${k}`} id="c-answers" name="answers" label="이 글이 답하는 질문 (한 줄에 하나, 10개까지)" rows={3} defaultValue={pick("answers")} surface="light" />
      <TextField key={`st-${k}`} id="c-seo-title" name="seoTitle" label="검색 제목 (비우면 제목)" defaultValue={pick("seoTitle")} maxLength={75} surface="light" />
      <TextField key={`sd-${k}`} id="c-seo-desc" name="seoDescription" label="검색 설명 (비우면 요약)" defaultValue={pick("seoDescription")} maxLength={165} surface="light" />
      <div>
        <label htmlFor="c-origin" className={styles.fieldLabel}>
          제작 방식
        </label>
        <select id="c-origin" name="origin" defaultValue={pick("origin")} key={`o-${k}`} className={styles.select}>
          {ORIGIN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <TextField key={`on-${k}`} id="c-origin-note" name="originNote" label="제작 메모 (공개되지 않음)" defaultValue={pick("originNote")} surface="light" />
      <Button type="submit" busy={pending} variant="dark" surface="light" size="S">
        {pending ? "저장 중" : "저장"}
      </Button>
    </form>
  );
}

/** 투어의 모집 상태를 바로 바꾼다 (수정 내용 발행을 거치지 않고 공개 화면에 즉시 반영) */
export function RecruitForm({ id, version, current }: { id: string; version: number; current: string }) {
  const [state, action, pending] = useActionState<ContentState, FormData>(setRecruitAction, {});
  return (
    <form action={action} className={styles.form} noValidate aria-label="모집 상태 바꾸기">
      <Notice state={state} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <div>
        <label htmlFor="recruit-now" className={styles.fieldLabel}>
          모집 상태
        </label>
        <select id="recruit-now" name="recruit" defaultValue={current} className={styles.select}>
          {RECRUIT_VALUES.map((v) => (
            <option key={v} value={v}>
              {RECRUIT_LABELS[v]}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" busy={pending} variant="dark" surface="light" size="S">
        {pending ? "바꾸는 중" : "모집 상태 바꾸기"}
      </Button>
    </form>
  );
}

export function TransitionForm({ id, version, to, label, needsTime, defaultTime }: { id: string; version: number; to: string; label: string; needsTime?: boolean; defaultTime?: string }) {
  const [state, action, pending] = useActionState<ContentState, FormData>(transitionContentAction, {});
  return (
    <form action={action} className={styles.form} noValidate aria-label={label}>
      <Notice state={state} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="to" value={to} />
      {needsTime ? (
        <TextField id={`at-${to}`} name="publishAt" type="datetime-local" label="예약 시각 (한국 시간)" defaultValue={defaultTime} surface="light" />
      ) : null}
      <Button type="submit" busy={pending} variant="dark" surface="light" size="S">
        {pending ? "처리 중" : label}
      </Button>
    </form>
  );
}

export function DraftBanner({ id, version }: { id: string; version: number }) {
  const [publishState, publish, publishing] = useActionState<ContentState, FormData>(publishDraftAction, {});
  const [discardState, discard, discarding] = useActionState<ContentState, FormData>(discardDraftAction, {});
  return (
    <div className={styles.dangerBox} role="group" aria-label="수정 중인 내용">
      <p className={styles.note} style={{ margin: 0 }}>
        <strong>수정 중인 내용이 있습니다.</strong> 공개된 글은 아직 바뀌지 않았습니다.
      </p>
      <Notice state={publishState} />
      <Notice state={discardState} />
      <form action={publish}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="version" value={version} />
        <Button type="submit" busy={publishing} variant="dark" surface="light" size="S">
          {publishing ? "반영 중" : "수정 내용 발행"}
        </Button>
      </form>
      <form action={discard}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="version" value={version} />
        <button type="submit" className={styles.linkButton} disabled={discarding}>
          수정 내용 버리기
        </button>
      </form>
    </div>
  );
}

export function DeleteContentForm({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ContentState, FormData>(deleteContentAction, {});
  if (!open) {
    return (
      <button type="button" className={styles.dangerLink} onClick={() => setOpen(true)}>
        삭제…
      </button>
    );
  }
  return (
    <form action={action} className={styles.dangerBox} noValidate>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="confirm" value="yes" />
      <p className={styles.note} style={{ margin: 0 }}>
        이 글을 휴지통으로 보냅니다. 예약되어 있으면 취소되고, 30일 안에는 어드민의 휴지통에서 복원할 수 있습니다.
      </p>
      <Notice state={state} />
      <div className={styles.row}>
        <Button type="submit" busy={pending} variant="dark" surface="light" size="S">
          {pending ? "삭제 중" : "삭제"}
        </Button>
        <button type="button" className={styles.linkButton} onClick={() => setOpen(false)}>
          취소
        </button>
      </div>
    </form>
  );
}

export function RetryJobForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ContentState, FormData>(retryJobAction, {});
  return (
    <form action={action} className={styles.row}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" busy={pending} variant="dark" surface="light" size="S">
        {pending ? "처리 중" : "다시 시도"}
      </Button>
      <Notice state={state} />
    </form>
  );
}
