"use client";

import { TextField } from "@/components/ui/Field";
import { LEVEL_LABELS, LEVEL_VALUES, TRAVEL_LIMITS } from "@/content/travelFields";
import { VIDEO_LIMITS } from "@/content/videoFields";
import styles from "../../admin.module.css";

export interface VideoFieldsValues {
  videoUrl: string;
  duration: string;
  hasCaptions: boolean;
}

export interface TravelFieldsValues {
  region: string;
  place: string;
  season: string;
  level: string;
  budget: string;
  checkedAt: string;
}

/**
 * 영상 전용 입력. 이름이 f_ 로 시작하는 칸은 서버가 유형별 항목으로 묶어 검사한다.
 * 입력은 모두 uncontrolled 이고 저장·오류 때마다 새로 만든다(keySuffix) — ADMIN-DESIGN §23 원칙.
 */
export function VideoFieldsSection({ values, keySuffix }: { values: VideoFieldsValues; keySuffix: string }) {
  return (
    <section className={styles.fieldset} aria-label="영상 정보" style={{ display: "grid", gap: 16 }}>
      <h2 className={styles.h2} style={{ margin: 0 }}>
        영상 정보
      </h2>
      <TextField key={`vu-${keySuffix}`} id="f-video-url" name="f_videoUrl" label="영상 주소 (발행하려면 필요합니다)" defaultValue={values.videoUrl} maxLength={VIDEO_LIMITS.url + 5} surface="light" hint="YouTube 또는 Vimeo 의 https 주소만 쓸 수 있습니다. 직접 올리지 않습니다." />
      <div className={styles.row}>
        <div style={{ flex: "1 1 200px" }}>
          <TextField key={`vd-${keySuffix}`} id="f-video-duration" name="f_duration" label="길이 (선택)" defaultValue={values.duration} maxLength={VIDEO_LIMITS.duration + 2} surface="light" hint="3:25 또는 1:02:30 모양" />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: "var(--kyu-touch)" }}>
          <input key={`vc-${keySuffix}`} type="checkbox" name="f_captions" defaultChecked={values.hasCaptions} /> 자막이 있습니다
        </label>
      </div>
    </section>
  );
}

/** 여행 추천 전용 입력 */
export function TravelFieldsSection({ values, keySuffix }: { values: TravelFieldsValues; keySuffix: string }) {
  return (
    <section className={styles.fieldset} aria-label="여행 정보" style={{ display: "grid", gap: 16 }}>
      <h2 className={styles.h2} style={{ margin: 0 }}>
        여행 정보
      </h2>
      <div className={styles.row}>
        <div style={{ flex: "1 1 200px" }}>
          <TextField key={`tr-${keySuffix}`} id="f-travel-region" name="f_region" label="지역 (발행하려면 필요합니다)" defaultValue={values.region} maxLength={TRAVEL_LIMITS.region + 5} surface="light" hint="예: 제주, 필리핀 보홀" />
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <TextField key={`tp-${keySuffix}`} id="f-travel-place" name="f_place" label="장소 (발행하려면 필요합니다)" defaultValue={values.place} maxLength={TRAVEL_LIMITS.place + 5} surface="light" hint="예: 서귀포 문섬 인근" />
        </div>
      </div>
      <div className={styles.row}>
        <div style={{ flex: "1 1 200px" }}>
          <TextField key={`ts-${keySuffix}`} id="f-travel-season" name="f_season" label="추천 시기 (선택)" defaultValue={values.season} maxLength={TRAVEL_LIMITS.season + 5} surface="light" hint="예: 5~10월" />
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <label htmlFor="f-travel-level" className={styles.fieldLabel}>
            난이도 (선택)
          </label>
          <select key={`tl-${keySuffix}`} id="f-travel-level" name="f_level" defaultValue={values.level} className={styles.select}>
            {LEVEL_VALUES.map((v) => (
              <option key={v || "none"} value={v}>
                {LEVEL_LABELS[v]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.row}>
        <div style={{ flex: "1 1 200px" }}>
          <TextField key={`tb-${keySuffix}`} id="f-travel-budget" name="f_budget" label="예산 안내 (선택)" defaultValue={values.budget} maxLength={TRAVEL_LIMITS.budget + 5} surface="light" hint="예: 1인 약 80만 원" />
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <TextField key={`tc-${keySuffix}`} id="f-travel-checked" name="f_checkedAt" type="date" label="정보 확인일 (선택)" defaultValue={values.checkedAt} surface="light" hint="가격·시기는 오래되기 쉬워 확인한 날을 적어 둡니다" />
        </div>
      </div>
    </section>
  );
}
