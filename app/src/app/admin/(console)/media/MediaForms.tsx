"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { downscaleIfLarge } from "@/media/clientDownscale";
import { deleteMediaAction, updateMediaAltAction, uploadMediaAction, type MediaState } from "../../mediaActions";
import styles from "../../admin.module.css";

export function UploadForm({ disabled }: { disabled: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [preparing, setPreparing] = useState(false);
  const [state, action, pending] = useActionState<MediaState, FormData>(async (prev, formData) => {
    setPreparing(true);
    try {
      const file = formData.get("file");
      if (file instanceof File) formData.set("file", await downscaleIfLarge(file));
    } finally {
      setPreparing(false);
    }
    const result = await uploadMediaAction(prev, formData);
    if (result.ok) formRef.current?.reset();
    return result;
  }, {});
  return (
    <form ref={formRef} action={action} className={styles.form} noValidate aria-label="이미지 올리기">
      {state.error ? (
        <p role="alert" className={styles.alert}>
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className={styles.alert}>
          올렸습니다. 위치정보는 제거되고 WebP 로 저장됩니다.
        </p>
      ) : null}
      <div>
        <label htmlFor="media-file" className={styles.fieldLabel}>
          이미지 파일 (JPEG, PNG, WebP, AVIF · 4MB 이하)
        </label>
        <input id="media-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className={styles.select} style={{ paddingTop: 8 }} disabled={disabled} />
      </div>
      <TextField id="media-alt" key={state.alt ?? ""} name="alt" label="대체 텍스트 (그림을 보지 못하는 사람에게 읽어 주는 설명)" defaultValue={state.error ? state.alt : ""} maxLength={205} hint="예: 수면 아래에서 올려다본 햇빛. 비워 두면 나중에 입력할 수 있지만, 대표 이미지로 쓰려면 꼭 필요합니다." surface="light" disabled={disabled} />
      <Button type="submit" busy={pending || preparing} variant="dark" surface="light" size="S" disabled={disabled}>
        {preparing ? "이미지 줄이는 중" : pending ? "올리는 중" : "올리기"}
      </Button>
    </form>
  );
}

export function AltForm({ id, alt }: { id: string; alt: string }) {
  const [state, action, pending] = useActionState<MediaState, FormData>(updateMediaAltAction, {});
  return (
    <form action={action} className={styles.form} noValidate aria-label="대체 텍스트 수정">
      <input type="hidden" name="id" value={id} />
      {state.error ? (
        <p role="alert" className={styles.alert}>
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className={styles.alert}>
          저장했습니다.
        </p>
      ) : null}
      <TextField id={`alt-${id}`} key={`${alt}-${state.alt ?? ""}`} name="alt" label="대체 텍스트" defaultValue={state.error ? state.alt : alt} maxLength={205} surface="light" />
      <Button type="submit" busy={pending} variant="dark" surface="light" size="S">
        {pending ? "저장 중" : "저장"}
      </Button>
    </form>
  );
}

export function DeleteMediaForm({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<MediaState, FormData>(deleteMediaAction, {});
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
        라이브러리에서 이 이미지를 삭제합니다. 다른 곳에서 쓰이고 있으면 삭제할 수 없습니다.
      </p>
      {state.error ? (
        <p role="alert" className={styles.alert}>
          {state.error}
        </p>
      ) : null}
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
