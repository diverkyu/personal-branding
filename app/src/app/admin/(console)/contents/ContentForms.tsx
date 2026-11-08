"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea, TextField } from "@/components/ui/Field";
import { RichEditor, type PickerMedia } from "@/editor/RichEditor";
import {
  createContentAction,
  deleteContentAction,
  discardDraftAction,
  publishDraftAction,
  retryJobAction,
  saveContentAction,
  transitionContentAction,
  type ContentState,
} from "../../contentActions";
import styles from "../../admin.module.css";

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

export function NewContentForm() {
  const [state, action, pending] = useActionState<ContentState, FormData>(createContentAction, {});
  return (
    <form action={action} className={styles.row} noValidate aria-label="새 스토리 만들기">
      <input type="hidden" name="type" value="story" />
      <div style={{ flex: "1 1 260px" }}>
        <TextField id="new-title" key={state.values?.title ?? ""} name="title" label="새 스토리 제목" defaultValue={state.values?.title} maxLength={85} surface="light" error={state.error} />
      </div>
      <Button type="submit" busy={pending} variant="dark" surface="light" size="S">
        {pending ? "만드는 중" : "만들기"}
      </Button>
    </form>
  );
}

export interface EditInitial {
  id: string;
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
      <Textarea key={`su-${k}`} id="c-summary" name="summary" label="요약 (160자 이하)" rows={2} defaultValue={pick("summary")} hint="발행 전 점검에서 160자를 넘으면 막힙니다. 비우면 본문 앞부분을 씁니다." surface="light" />
      <div>
        <p className={styles.fieldLabel} id="body-label">
          본문
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
        이 글을 삭제합니다. 예약되어 있으면 취소됩니다. (휴지통에서 복원하는 기능은 다음 단계에서 추가됩니다.)
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
