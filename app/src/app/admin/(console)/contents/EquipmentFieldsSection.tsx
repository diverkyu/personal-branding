"use client";

import { useState } from "react";
import { Textarea, TextField } from "@/components/ui/Field";
import type { PickerMedia } from "@/editor/RichEditor";
import { ACTION_LABELS, ACTION_VALUES, DEFAULT_BUTTON_LABEL, EQUIPMENT_LIMITS } from "@/content/equipmentFields";
import styles from "../../admin.module.css";
import { GalleryField, type GalleryEntry } from "./TourFieldsSection";

export interface EquipmentFieldsValues {
  category: string;
  brand: string;
  /** 한 줄에 하나 */
  features: string;
  thumbMediaId: string;
  priceNote: string;
  checkedAt: string;
  action: string;
  externalUrl: string;
  buttonLabel: string;
  affiliate: boolean;
  sortOrder: string;
}

/** 대표 이미지 고르기 (한 장). 선택한 이미지를 바로 보여 주고, 대체 텍스트가 없으면 경고한다 */
function ThumbPicker({ initial, media }: { initial: string; media: PickerMedia[] }) {
  const [id, setId] = useState(initial);
  const chosen = media.find((m) => m.id === id);
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.fieldLabel}>대표 이미지 (발행하려면 필요합니다)</legend>
      <input type="hidden" name="f_thumb" value={id} />
      <div className={styles.row} style={{ alignItems: "flex-start" }}>
        {chosen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={chosen.url} alt={chosen.alt} width={96} height={96} style={{ objectFit: "cover", width: 96, height: 96 }} />
        ) : null}
        <div style={{ display: "grid", gap: 6 }}>
          <select aria-label="대표 이미지 고르기" value={id} onChange={(e) => setId(e.target.value)} className={styles.select} style={{ maxWidth: 360 }}>
            <option value="">이미지 고르기…</option>
            {id && !chosen ? <option value={id}>(목록에 없는 이미지)</option> : null}
            {media.map((m) => (
              <option key={m.id} value={m.id}>
                {m.alt.trim() ? m.alt : `(대체 텍스트 없음) ${m.id.slice(0, 8)}`}
              </option>
            ))}
          </select>
          {chosen && !chosen.alt.trim() ? (
            <span className={styles.note} role="status" style={{ margin: 0 }}>
              대체 텍스트가 없습니다. 어드민 &gt; 미디어에서 입력하지 않으면 발행할 수 없습니다.
            </span>
          ) : null}
          {id ? (
            <button type="button" className={styles.linkButton} onClick={() => setId("")}>
              대표 이미지 빼기
            </button>
          ) : null}
        </div>
      </div>
    </fieldset>
  );
}

/**
 * 행동 버튼 선택과 그에 따라 달라지는 입력(구매 링크·버튼 라벨·제휴 표시).
 * 선택칸은 **uncontrolled**(defaultValue)이다: 값을 상태로 쥐고 있는 controlled 선택칸은, 서버 액션이 끝난 뒤 React 가 폼을
 * 되돌릴 때 화면 값만 첫 항목으로 돌아가고 상태는 그대로여서 "화면과 저장이 다른" 문제가 생긴다.
 * 저장·오류 때마다 keySuffix 가 바뀌어 이 조각이 새로 만들어지므로 화면·상태·서버 값이 항상 같다.
 */
function ActionFields({ values, keySuffix }: { values: EquipmentFieldsValues; keySuffix: string }) {
  const [action, setAction] = useState(values.action);
  return (
    <>
      <div>
        <label htmlFor="f-action" className={styles.fieldLabel}>
          행동 버튼
        </label>
        <select id="f-action" name="f_action" defaultValue={values.action} onChange={(e) => setAction(e.target.value)} className={styles.select}>
          {ACTION_VALUES.map((v) => (
            <option key={v} value={v}>
              {ACTION_LABELS[v]}
            </option>
          ))}
        </select>
      </div>
      {action === "external" ? (
        <TextField key={`url-${keySuffix}`} id="f-url" name="f_externalUrl" type="url" label="구매처 링크" defaultValue={values.externalUrl} maxLength={EQUIPMENT_LIMITS.url} surface="light" hint="https 로 시작하는 주소만 가능합니다. 발행하려면 필요합니다" />
      ) : null}
      {action !== "none" ? (
        <TextField key={`bl-${keySuffix}`} id="f-label" name="f_buttonLabel" label="버튼 라벨 (선택)" defaultValue={values.buttonLabel} maxLength={EQUIPMENT_LIMITS.buttonLabel} placeholder={DEFAULT_BUTTON_LABEL[action as "external" | "inquiry"]} surface="light" hint="비우면 기본 라벨을 씁니다" />
      ) : null}
      {action === "external" ? (
        <label className={styles.row} style={{ gap: 8 }}>
          <input key={`af-${keySuffix}`} type="checkbox" name="f_affiliate" defaultChecked={values.affiliate} />
          <span>제휴 링크입니다 (수수료를 받는 링크). 체크하면 고지 문구가 함께 표시됩니다.</span>
        </label>
      ) : null}
    </>
  );
}

/** 장비 전용 입력. 이름이 f_ 로 시작하는 칸은 서버가 유형별 항목으로 묶어 검사한다 */
export function EquipmentFieldsSection({
  values,
  images,
  media,
  categories,
  keySuffix,
}: {
  values: EquipmentFieldsValues;
  images: GalleryEntry[];
  media: PickerMedia[];
  /** 이미 쓰고 있는 카테고리 (입력할 때 고를 수 있게) */
  categories: string[];
  keySuffix: string;
}) {
  return (
    <section className={styles.fieldset} aria-label="장비 정보" style={{ display: "grid", gap: 16 }}>
      <h2 className={styles.h2} style={{ margin: 0 }}>
        장비 정보
      </h2>
      <div className={styles.row}>
        <div style={{ flex: "1 1 200px" }}>
          <TextField key={`cat-${keySuffix}`} id="f-category" name="f_category" label="카테고리" defaultValue={values.category} maxLength={EQUIPMENT_LIMITS.category} list="f-category-list" surface="light" hint="이미 쓴 카테고리는 고를 수 있고, 새 이름을 쓰면 새 카테고리가 생깁니다" />
          <datalist id="f-category-list">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <TextField key={`br-${keySuffix}`} id="f-brand" name="f_brand" label="브랜드 (선택)" defaultValue={values.brand} maxLength={EQUIPMENT_LIMITS.brand} surface="light" />
        </div>
      </div>
      <Textarea key={`ft-${keySuffix}`} id="f-features" name="f_features" label={`특징 (한 줄에 하나, ${EQUIPMENT_LIMITS.features}개까지)`} rows={4} defaultValue={values.features} surface="light" hint={`한 줄은 ${EQUIPMENT_LIMITS.feature}자까지`} />
      <ThumbPicker key={`th-${keySuffix}`} initial={values.thumbMediaId} media={media} />
      <GalleryField initial={images} media={media} name="imagesJson" legend="추가 이미지" noun="이미지" max={EQUIPMENT_LIMITS.images} captions={false} />
      <div className={styles.row}>
        <div style={{ flex: "1 1 200px" }}>
          <TextField key={`pn-${keySuffix}`} id="f-price" name="f_priceNote" label="가격대 (선택)" defaultValue={values.priceNote} maxLength={EQUIPMENT_LIMITS.priceNote} surface="light" />
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <TextField key={`ck-${keySuffix}`} id="f-checked" name="f_checkedAt" type="date" label="정보 확인일 (선택)" defaultValue={values.checkedAt} surface="light" hint="화면에 “정보 확인일”로 보여 오래된 정보를 막습니다" />
        </div>
      </div>

      <ActionFields key={`act-${keySuffix}`} values={values} keySuffix={keySuffix} />
      <TextField key={`so-${keySuffix}`} id="f-sort" name="f_sortOrder" type="number" min={0} max={EQUIPMENT_LIMITS.sortOrderMax} label="노출 순서 (선택)" defaultValue={values.sortOrder} surface="light" hint="숫자가 작을수록 앞에 나옵니다. 비우면 100" />
    </section>
  );
}
