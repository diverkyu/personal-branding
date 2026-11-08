"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { deleteMediaAction, updateMediaAltAction, uploadMediaAction, type MediaState } from "../../mediaActions";
import styles from "../../admin.module.css";

const DOWNSCALE_OVER_BYTES = 3 * 1024 * 1024;
const DOWNSCALE_EDGE = 2400;

/**
 * 큰 사진은 올리기 전에 브라우저에서 줄인다(휴대폰 사진은 서버리스 요청 상한을 넘기 쉽다). 다시 그리면서 위치정보도 자연히 빠진다.
 * 이것은 편의일 뿐이다 — 서버가 크기·형식을 다시 확인하고 위치정보를 다시 지운다. 줄이지 못하면 원본을 그대로 보내고 서버가 판단한다.
 */
async function downscaleIfLarge(file: File): Promise<File> {
  if (file.size <= DOWNSCALE_OVER_BYTES || !file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, DOWNSCALE_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    return blob && blob.size < file.size ? new File([blob], "upload.webp", { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}

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
