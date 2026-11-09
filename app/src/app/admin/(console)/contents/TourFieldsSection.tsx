"use client";

import { useState } from "react";
import { Textarea, TextField } from "@/components/ui/Field";
import type { PickerMedia } from "@/editor/RichEditor";
import { RECRUIT_LABELS, RECRUIT_VALUES, TOUR_LIMITS } from "@/content/tourFields";
import styles from "../../admin.module.css";

export interface TourFieldsValues {
  startDate: string;
  endDate: string;
  place: string;
  recruit: string;
  capacity: string;
  feeNote: string;
  /** 한 줄에 하나 */
  videos: string;
}

export interface GalleryEntry {
  mediaId: string;
  caption: string;
}

/**
 * 갤러리 고르기. 미디어 라이브러리의 이미지를 골라 순서·설명을 정한다. 값은 숨은 입력(galleryJson)으로 폼과 함께 간다.
 * 대체 텍스트는 이미지(미디어)에 저장된 것을 쓰므로, 없는 이미지는 경고를 보여 주고 발행 점검에서 막는다.
 */
function GalleryField({ initial, media }: { initial: GalleryEntry[]; media: PickerMedia[] }) {
  const [items, setItems] = useState<GalleryEntry[]>(initial);
  const [pick, setPick] = useState("");
  const byId = new Map(media.map((m) => [m.id, m]));
  const available = media.filter((m) => !items.some((i) => i.mediaId === m.id));
  const move = (index: number, delta: number) =>
    setItems((list) => {
      const next = [...list];
      const target = index + delta;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.fieldLabel}>갤러리 (사진 {items.length}/{TOUR_LIMITS.gallery}장)</legend>
      <input type="hidden" name="galleryJson" value={JSON.stringify(items)} />
      {items.length === 0 ? (
        <p className={styles.note} style={{ margin: "0 0 8px" }}>
          아직 넣은 사진이 없습니다. 어드민 &gt; 미디어에 먼저 올린 사진을 고를 수 있습니다.
        </p>
      ) : (
        <ol style={{ listStyle: "none", margin: "0 0 12px", padding: 0, display: "grid", gap: 12 }}>
          {items.map((item, i) => {
            const m = byId.get(item.mediaId);
            return (
              <li key={item.mediaId} style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 12, alignItems: "start" }}>
                {m ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.alt} width={72} height={72} style={{ objectFit: "cover", width: 72, height: 72 }} />
                ) : (
                  <span className={styles.note}>목록에 없음</span>
                )}
                <div style={{ display: "grid", gap: 6 }}>
                  <input
                    type="text"
                    aria-label={`${i + 1}번째 사진 설명`}
                    placeholder="사진 설명 (선택)"
                    value={item.caption}
                    maxLength={TOUR_LIMITS.caption}
                    onChange={(e) => setItems((list) => list.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))}
                    className={styles.select}
                  />
                  {m && !m.alt.trim() ? (
                    <span className={styles.note} role="status" style={{ margin: 0 }}>
                      대체 텍스트가 없습니다. 어드민 &gt; 미디어에서 입력하지 않으면 발행할 수 없습니다.
                    </span>
                  ) : null}
                  <span className={styles.row}>
                    <button type="button" className={styles.smallButton} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${i + 1}번째 사진 위로`}>
                      위로
                    </button>
                    <button type="button" className={styles.smallButton} onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`${i + 1}번째 사진 아래로`}>
                      아래로
                    </button>
                    <button type="button" className={styles.linkButton} onClick={() => setItems((list) => list.filter((_, j) => j !== i))} aria-label={`${i + 1}번째 사진 빼기`}>
                      빼기
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {items.length < TOUR_LIMITS.gallery ? (
        <div className={styles.row}>
          <select aria-label="추가할 사진" value={pick} onChange={(e) => setPick(e.target.value)} className={styles.select} style={{ maxWidth: 360 }}>
            <option value="">사진 고르기…</option>
            {available.map((m) => (
              <option key={m.id} value={m.id}>
                {m.alt.trim() ? m.alt : `(대체 텍스트 없음) ${m.id.slice(0, 8)}`}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={styles.smallButton}
            disabled={!pick}
            onClick={() => {
              if (!pick) return;
              setItems((list) => [...list, { mediaId: pick, caption: "" }]);
              setPick("");
            }}
          >
            추가
          </button>
        </div>
      ) : null}
    </fieldset>
  );
}

/** 투어 전용 입력. 이름이 f_ 로 시작하는 칸은 서버가 유형별 항목으로 묶어 검사한다 */
export function TourFieldsSection({ values, gallery, media, recruitLocked, keySuffix }: { values: TourFieldsValues; gallery: GalleryEntry[]; media: PickerMedia[]; recruitLocked: boolean; keySuffix: string }) {
  return (
    <section className={styles.fieldset} aria-label="투어 정보" style={{ display: "grid", gap: 16 }}>
      <h2 className={styles.h2} style={{ margin: 0 }}>
        투어 정보
      </h2>
      <div className={styles.row}>
        <div style={{ flex: "1 1 160px" }}>
          <TextField key={`sd-${keySuffix}`} id="f-start" name="f_startDate" type="date" label="시작일" defaultValue={values.startDate} surface="light" hint="발행하려면 필요합니다" />
        </div>
        <div style={{ flex: "1 1 160px" }}>
          <TextField key={`ed-${keySuffix}`} id="f-end" name="f_endDate" type="date" label="종료일" defaultValue={values.endDate} surface="light" hint="종료일이 지나면 자동으로 “종료”로 바뀝니다" />
        </div>
      </div>
      <TextField key={`pl-${keySuffix}`} id="f-place" name="f_place" label="장소" defaultValue={values.place} maxLength={TOUR_LIMITS.place} surface="light" hint="발행하려면 필요합니다" />
      {recruitLocked ? (
        <>
          <input type="hidden" name="f_recruit" value={values.recruit} />
          <p className={styles.note} style={{ margin: 0 }}>
            모집 상태: <strong>{RECRUIT_LABELS[values.recruit as keyof typeof RECRUIT_LABELS] ?? values.recruit}</strong> — 발행된 투어는 오른쪽 “모집 상태”에서 바로 바꿉니다.
          </p>
        </>
      ) : (
        <div>
          <label htmlFor="f-recruit" className={styles.fieldLabel}>
            모집 상태
          </label>
          <select id="f-recruit" name="f_recruit" defaultValue={values.recruit} key={`rc-${keySuffix}`} className={styles.select}>
            {RECRUIT_VALUES.map((v) => (
              <option key={v} value={v}>
                {RECRUIT_LABELS[v]}
              </option>
            ))}
          </select>
        </div>
      )}
      <TextField key={`cp-${keySuffix}`} id="f-capacity" name="f_capacity" type="number" min={1} max={TOUR_LIMITS.capacityMax} label="정원 (선택, 명)" defaultValue={values.capacity} surface="light" />
      <Textarea key={`fe-${keySuffix}`} id="f-fee" name="f_feeNote" label="참가비·포함 사항 안내 (선택)" rows={3} defaultValue={values.feeNote} surface="light" hint="결제 기능은 없고 안내 문구만 보여 줍니다" />
      <Textarea key={`vd-${keySuffix}`} id="f-videos" name="f_videos" label={`스케치 영상 주소 (한 줄에 하나, ${TOUR_LIMITS.videos}개까지)`} rows={2} defaultValue={values.videos} surface="light" hint="YouTube 또는 Vimeo 주소(https)만 가능합니다" />
      <GalleryField initial={gallery} media={media} />
    </section>
  );
}
