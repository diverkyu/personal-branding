"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea, TextField } from "@/components/ui/Field";
import { LABEL_KINDS, LABEL_KIND_LABELS, REVIEW_LIMITS, SOURCE_KINDS, SOURCE_LABELS } from "@/reviews/fields";
import { createReviewAction, deleteReviewAction, saveReviewAction, setReviewStatusAction, withdrawReviewAction, type ReviewState } from "../../reviewActions";
import styles from "../../admin.module.css";

function Notice({ state }: { state: ReviewState }) {
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

export interface ReviewFormValues {
  body: string;
  authorLabel: string;
  labelKind: string;
  writtenOn: string;
  sourceKind: string;
  sourceNote: string;
  tourSlug: string;
  featured: boolean;
  featuredOrder: string;
  consentConfirmed: boolean;
  consentNote: string;
}

export interface TourChoice {
  slug: string;
  title: string;
}

/** 후기 원문 입력과 글자 수. 저장·오류 때마다 새로 만들어져 글자 수가 항상 입력과 같다 */
function BodyField({ defaultValue }: { defaultValue: string }) {
  const [length, setLength] = useState(defaultValue.length);
  return (
    <div>
      <Textarea
        id="r-body"
        name="body"
        label="후기 원문"
        rows={8}
        defaultValue={defaultValue}
        maxLength={REVIEW_LIMITS.body}
        required
        surface="light"
        hint={`수강생이 쓴 그대로 붙여 넣습니다. 고치거나 다듬지 않습니다. (${length}/${REVIEW_LIMITS.body}자)`}
        onChange={(e) => setLength(e.target.value.length)}
      />
    </div>
  );
}

/**
 * 후기 입력 폼 (만들기·고치기 공용). 제출되는 입력은 모두 uncontrolled(defaultValue) 이고 저장·오류 때마다 key 로 새로 만든다
 * (서버 액션 뒤 폼 되돌림과 화면·상태가 어긋나지 않게, ADMIN-DESIGN §23). 글자 수만 화면에서 센다.
 */
export function ReviewForm({ mode, initial, tours, reviewId, version, today }: { mode: "create" | "edit"; initial: ReviewFormValues; tours: TourChoice[]; reviewId?: string; version?: number; today: string }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(mode === "create" ? createReviewAction : saveReviewAction, {});
  const v = state.error ? state.values : undefined;
  const k = `${version ?? 0}-${state.error ? JSON.stringify(state.values).length : 0}`;
  const val = (name: keyof ReviewFormValues): string => v?.[name] ?? (initial[name] as string);
  const checked = (name: "featured" | "consentConfirmed"): boolean => (v ? v[name] === "on" : initial[name]);
  const slugKnown = tours.some((t) => t.slug === val("tourSlug"));
  return (
    <form action={action} className={styles.form} noValidate aria-label={mode === "create" ? "새 후기 만들기" : "후기 편집"}>
      <Notice state={state} />
      {mode === "edit" ? (
        <>
          <input type="hidden" name="id" value={reviewId} />
          <input type="hidden" name="version" value={version} />
        </>
      ) : null}
      <BodyField key={`b-${k}`} defaultValue={val("body")} />
      <div className={styles.row}>
        <div style={{ flex: "1 1 220px" }}>
          <TextField key={`a-${k}`} id="r-author" name="authorLabel" label="수강생 표기" defaultValue={val("authorLabel")} maxLength={REVIEW_LIMITS.author} required surface="light" hint="동의받은 방식 그대로 (실명·이니셜·닉네임)" />
        </div>
        <div style={{ flex: "1 1 160px" }}>
          <label htmlFor="r-kind" className={styles.fieldLabel}>
            표기 방식
          </label>
          <select id="r-kind" name="labelKind" defaultValue={val("labelKind")} key={`k-${k}`} className={styles.select}>
            <option value="">고르기…</option>
            {LABEL_KINDS.map((x) => (
              <option key={x} value={x}>
                {LABEL_KIND_LABELS[x]}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: "1 1 160px" }}>
          <TextField key={`d-${k}`} id="r-date" name="writtenOn" type="date" label="후기 작성일" defaultValue={val("writtenOn")} max={today} required surface="light" />
        </div>
      </div>
      <div>
        <label htmlFor="r-tour" className={styles.fieldLabel}>
          연결할 투어 (선택)
        </label>
        <select id="r-tour" name="tourSlug" defaultValue={val("tourSlug")} key={`t-${k}`} className={styles.select}>
          <option value="">연결 안 함</option>
          {!slugKnown && val("tourSlug") ? <option value={val("tourSlug")}>(목록에 없는 투어) {val("tourSlug")}</option> : null}
          {tours.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.title}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.row}>
        <div style={{ flex: "1 1 180px" }}>
          <label htmlFor="r-source" className={styles.fieldLabel}>
            출처 (기록용, 공개하지 않음)
          </label>
          <select id="r-source" name="sourceKind" defaultValue={val("sourceKind")} key={`s-${k}`} className={styles.select}>
            {SOURCE_KINDS.map((x) => (
              <option key={x} value={x}>
                {SOURCE_LABELS[x]}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: "2 1 260px" }}>
          <TextField key={`sn-${k}`} id="r-source-note" name="sourceNote" label="출처 메모 (선택)" defaultValue={val("sourceNote")} maxLength={REVIEW_LIMITS.sourceNote} surface="light" />
        </div>
      </div>

      <fieldset className={styles.fieldset} style={{ display: "grid", gap: 12 }}>
        <legend className={styles.fieldLabel}>공개 동의</legend>
        <label className={styles.row} style={{ gap: 8 }}>
          <input key={`c-${k}`} type="checkbox" name="consentConfirmed" defaultChecked={checked("consentConfirmed")} />
          <span>수강생에게 후기 공개 동의를 받았습니다. (체크해야 공개할 수 있습니다)</span>
        </label>
        <TextField key={`cn-${k}`} id="r-consent-note" name="consentNote" label="동의 방법과 일자 메모" defaultValue={val("consentNote")} maxLength={REVIEW_LIMITS.consentNote} surface="light" hint="예: 2026-11-08 인스타그램 DM으로 동의 받음 (공개하지 않음)" />
      </fieldset>

      <fieldset className={styles.fieldset} style={{ display: "grid", gap: 12 }}>
        <legend className={styles.fieldLabel}>대표 후기</legend>
        <label className={styles.row} style={{ gap: 8 }}>
          <input key={`f-${k}`} type="checkbox" name="featured" defaultChecked={checked("featured")} />
          <span>홈과 Freediving 허브에 대표 후기로 보여 줍니다 (공개된 후기만, 3건).</span>
        </label>
        <TextField key={`fo-${k}`} id="r-order" name="featuredOrder" type="number" min={0} max={REVIEW_LIMITS.featuredOrderMax} label="대표 순서 (선택)" defaultValue={val("featuredOrder")} surface="light" hint="숫자가 작을수록 앞에 나옵니다. 비우면 100" />
      </fieldset>

      <Button type="submit" busy={pending} variant="dark" surface="light" size="S">
        {pending ? "저장 중" : mode === "create" ? "후기 만들기 (비공개로 저장)" : "저장"}
      </Button>
    </form>
  );
}

function StatusButton({ id, version, to, label }: { id: string; version: number; to: "public" | "private"; label: string }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(setReviewStatusAction, {});
  return (
    <form action={action} className={styles.form} noValidate aria-label={label}>
      <Notice state={state} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="to" value={to} />
      <Button type="submit" busy={pending} variant="dark" surface="light" size="S">
        {pending ? "처리 중" : label}
      </Button>
    </form>
  );
}

export function ReviewStatusForms({ id, version, status }: { id: string; version: number; status: "public" | "private" }) {
  return status === "private" ? <StatusButton id={id} version={version} to="public" label="공개하기" /> : <StatusButton id={id} version={version} to="private" label="비공개로 바꾸기" />;
}

/** 철회 요청: 확인 없이 바로 비공개로 돌린다(안전한 쪽으로 가는 작업이라 한 번에 된다) */
export function WithdrawForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(withdrawReviewAction, {});
  return (
    <form action={action} className={styles.form} noValidate aria-label="철회">
      <Notice state={state} />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" busy={pending} variant="dark" surface="light" size="S">
        {pending ? "처리 중" : "철회 (즉시 비공개)"}
      </Button>
      <p className={styles.note} style={{ margin: 0 }}>
        수강생이 공개를 원치 않을 때 누릅니다. 바로 비공개가 되고 철회로 기록됩니다.
      </p>
    </form>
  );
}

export function DeleteReviewForm({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ReviewState, FormData>(deleteReviewAction, {});
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
        이 후기를 삭제합니다. 공개 중이면 바로 내려갑니다. 수정 이력은 남습니다. (복원 기능은 다음 단계에서 추가됩니다.)
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
