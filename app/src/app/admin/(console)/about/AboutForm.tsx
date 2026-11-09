"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea, TextField } from "@/components/ui/Field";
import { RichEditor, type PickerMedia } from "@/editor/RichEditor";
import { saveAboutAction, type AboutState } from "../../aboutActions";
import styles from "../../admin.module.css";

export interface AboutFormInitial {
  version: number;
  headline: string;
  bodyDoc: unknown;
  signature: string;
  photoMediaId: string;
}

/**
 * About 편집. 입력은 모두 uncontrolled 이고 저장·오류 때마다 새로 만든다(서버 액션이 끝나면 React 가 폼을 비우므로 — ADMIN-DESIGN §23).
 * 사진 선택칸도 uncontrolled 이며, 미리보기용 상태만 따로 둔다.
 */
export function AboutForm({ initial, media }: { initial: AboutFormInitial; media: PickerMedia[] }) {
  const [state, action, pending] = useActionState<AboutState, FormData>(saveAboutAction, {});
  const [photoId, setPhotoId] = useState(initial.photoMediaId);
  const chosen = media.find((m) => m.id === photoId);
  const k = `${initial.version}-${state.error ? "e" : "ok"}`;
  return (
    <form action={action} className={styles.form} noValidate aria-label="About 편집">
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
      <input type="hidden" name="version" value={initial.version} />
      <Textarea key={`h-${k}`} id="about-headline" name="headline" label="헤드라인 (두 줄까지, 80자 이하)" rows={2} defaultValue={initial.headline} surface="light" hint="줄을 바꾸면 화면에서도 줄이 바뀝니다." />
      <div>
        <p className={styles.fieldLabel} id="about-body-label">
          본문
        </p>
        <RichEditor initial={initial.bodyDoc} media={media} resetKey={initial.version} />
      </div>
      <TextField key={`s-${k}`} id="about-signature" name="signature" label="서명 (40자 이하, 비우면 서명을 보이지 않음)" defaultValue={initial.signature} maxLength={45} surface="light" />
      <fieldset className={styles.fieldset} key={`p-${k}`}>
        <legend className={styles.fieldLabel}>프로필 사진 (선택)</legend>
        <div className={styles.row} style={{ alignItems: "flex-start" }}>
          {chosen ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={chosen.url} alt={chosen.alt} width={96} height={96} style={{ objectFit: "cover", width: 96, height: 96 }} />
          ) : null}
          <div style={{ display: "grid", gap: 6 }}>
            <select name="photo" aria-label="프로필 사진 고르기" defaultValue={initial.photoMediaId} onChange={(e) => setPhotoId(e.target.value)} className={styles.select} style={{ maxWidth: 360 }}>
              <option value="">사진 없음</option>
              {initial.photoMediaId && !media.some((m) => m.id === initial.photoMediaId) ? <option value={initial.photoMediaId}>(목록에 없는 이미지)</option> : null}
              {media.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.alt.trim() ? m.alt : `(대체 텍스트 없음) ${m.id.slice(0, 8)}`}
                </option>
              ))}
            </select>
            {chosen && !chosen.alt.trim() ? (
              <span className={styles.note} role="status" style={{ margin: 0 }}>
                대체 텍스트가 없습니다. 어드민 &gt; 미디어에서 입력하지 않으면 공개할 수 없습니다.
              </span>
            ) : null}
          </div>
        </div>
      </fieldset>
      <Button type="submit" busy={pending} variant="dark" surface="light" size="S">
        {pending ? "저장 중" : "저장"}
      </Button>
    </form>
  );
}
