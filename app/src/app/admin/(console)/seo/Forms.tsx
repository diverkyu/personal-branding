"use client";
import { useActionState, useState } from "react";
import { journalAction, fieldAction, syncAction, type SeoFormState } from "./actions";
import { ENGINE_LABELS, FIELD_LABELS, STATUS_LABELS, TRANSITIONS, type JournalStatus } from "@/seo/model";
import styles from "../../admin.module.css";
import type { seoJournal } from "@/db/schema";

function Result({ state }: { state: SeoFormState }) { return <>{state.error && <p role="alert" className={styles.alert}>{state.error}</p>}{state.message && <p role="status" className={styles.note}>{state.message}</p>}</>; }
export function SyncForm() {
  const [state, action, pending] = useActionState(syncAction, {});
  return <form action={action}><button className={styles.smallButton} disabled={pending}>{pending ? "동기화 중…" : "성과 데이터 동기화"}</button><Result state={state} /></form>;
}
export function FieldForm({ fields }: { fields: Record<string, string> }) {
  const [state, action, pending] = useActionState(fieldAction, {});
  return <section className={styles.panel}><h2 className={styles.h2}>URL별 콘텐츠 분야 지정</h2><p className={styles.note}>스토리는 혼합 주제이므로 직접 지정합니다. 경로별 지정은 자동 분류보다 우선합니다.</p>
    <form action={action} className={styles.form}><label className={styles.filterItem}>현재 사이트 URL 또는 경로<input name="url" required maxLength={2048} placeholder="/story/글-주소" className={styles.select} /></label><label className={styles.filterItem}>분야<select name="field" className={styles.select}>{Object.entries(FIELD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label><button className={styles.smallButton} disabled={pending}>분야 저장</button><Result state={state} /></form>
    <ul>{Object.entries(fields).map(([path, field]) => <li key={path}>{path} · {FIELD_LABELS[field as keyof typeof FIELD_LABELS]}</li>)}</ul></section>;
}
export type JournalView = typeof seoJournal.$inferSelect;
export function JournalForm({ row }: { row?: JournalView }) {
  const [state, action, pending] = useActionState(journalAction, {});
  // Controlled drafts survive rejected server actions (React resets uncontrolled forms).
  const [draft, setDraft] = useState<Record<string, string>>({});
  const bind = (name: string, initial = "") => ({ value: draft[name] ?? initial, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setDraft(previous => ({ ...previous, [name]: event.target.value })) });
  const field = (name: string, label: string, value = "", type = "text", required = false, maxLength = 2048) => <label className={styles.filterItem}>{label}<input className={styles.select} name={name} type={type} {...bind(name, value)} required={required} maxLength={maxLength} min={type === "number" ? 0 : undefined} /></label>;
  const status = (row?.status ?? "needed") as JournalStatus;
  return <form action={action} className={styles.form}>
    <input type="hidden" name="id" value={row?.id ?? ""} /><input type="hidden" name="version" value={row?.version ?? 0} />
    {field("title", "점검 제목", row?.title, "text", true, 160)}
    <label className={styles.filterItem}>검색엔진<select name="engine" {...bind("engine", row?.engine ?? "google")} className={styles.select}>{Object.entries(ENGINE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
    {field("url", "대상 URL 또는 현재 사이트 경로", row?.url ?? "/", "text", true)}
    {field("observedOn", "확인일", row?.observedOn ?? new Date().toISOString().slice(0, 10), "date", true)}
    {field("sourceUrl", "원본·근거 링크 (선택)", row?.sourceUrl ?? "", "url")}
    <label className={styles.filterItem}>점검 내용·조치·재검사 결과<textarea name="note" {...bind("note", row?.note ?? "")} maxLength={5000} rows={4} className={styles.select} /></label>
    {row && <label className={styles.filterItem}>처리 상태<select name="status" className={styles.select} {...bind("status", status)}>{[status, ...TRANSITIONS[status]].map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></label>}
    <details><summary>네이버 수동 성과 (선택)</summary><p className={styles.note}>원본에서 확인한 값만 입력합니다. 빈칸은 미확인, 0은 실제 0입니다. 검색엔진을 Naver로 선택하고 Search Advisor 원본 링크를 남겨 주세요.</p>
      {field("periodStart", "조회 시작일", row?.periodStart ?? "", "date")}{field("periodEnd", "조회 종료일", row?.periodEnd ?? "", "date")}{field("clicks", "클릭", row?.clicks?.toString() ?? "", "number")}{field("impressions", "노출", row?.impressions?.toString() ?? "", "number")}
    </details>
    <button name="operation" value="save" className={styles.smallButton} disabled={pending}>{pending ? "처리 중…" : row ? "수정 저장" : "점검 등록"}</button>
    {row && <details><summary>점검 일지 삭제</summary><div className={styles.row}><label><input name="confirm" type="checkbox" /> 이 기록을 목록에서 삭제합니다.</label><button name="operation" value="delete" className={styles.dangerLink} disabled={pending} formNoValidate>삭제</button></div></details>}
    <Result state={state} />
  </form>;
}
