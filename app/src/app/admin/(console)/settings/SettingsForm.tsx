"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Messages, TextField, Textarea, describedBy } from "@/components/ui/Field";
import { saveSettingsGroupAction, type SettingsState } from "../../siteActions";
import styles from "../../admin.module.css";

export interface SettingField {
  key: string;
  label: string;
  usedAt: string;
  type: "text" | "lines" | "email" | "url" | "choice" | "verification";
  maxLength: number;
  maxLines?: number;
  hint?: string;
  brandCore?: boolean;
  /** choice 일 때 고를 수 있는 값 */
  options?: readonly { value: string; label: string }[];
  /** 지금 쓰이는 값 (저장된 값 또는 기본값) */
  value: string;
  /** 저장된 항목의 version. 아직 저장된 적 없으면 0 */
  version: number;
  isDefault: boolean;
}

export function SettingsGroupForm({ group, title, fields }: { group: string; title: string; fields: SettingField[] }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettingsGroupAction.bind(null, group), {});
  const hasBrand = fields.some((f) => f.brandCore);
  const errors = state.errors ?? {};
  // 오류가 났을 때는 방금 입력한 값을 그대로 보여 준다 (React 가 폼을 초기화해도 입력이 사라지지 않게)
  const shown = (f: SettingField) => (state.errors && state.values ? (state.values[f.key] ?? f.value) : f.value);
  return (
    <form action={action} className={styles.form} noValidate aria-label={`${title} 설정`}>
      {state.error ? (
        <p role="alert" className={styles.alert}>
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className={styles.alert}>
          {state.changed ? `저장했습니다. 공개 화면에는 몇 초 안에 반영됩니다(바로 안 보이면 새로고침). (${state.changed}개 항목)` : "바뀐 항목이 없습니다."}
        </p>
      ) : null}
      {fields.map((f) => {
        const reset = f.type === "choice" ? "" : f.isDefault ? " · 지금은 기본값입니다. 비우면 기본값으로 돌아갑니다." : " · 비우면 기본값으로 돌아갑니다.";
        const hint = `${f.usedAt}${f.hint ? ` · ${f.hint}` : ""}${reset}`;
        return (
          <div key={f.key}>
            <input type="hidden" name={`ver_${f.key}`} value={f.version} />
            {f.type === "choice" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor={`s-${f.key}`} className={styles.fieldLabel}>
                  {f.label}
                </label>
                <select key={`${f.key}-${f.version}-${state.values?.[f.key] ?? ""}`} id={`s-${f.key}`} name={`v_${f.key}`} defaultValue={shown(f)} className={styles.select} aria-invalid={errors[f.key] ? true : undefined} aria-describedby={describedBy(`s-${f.key}`, hint, errors[f.key])}>
                  {(f.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <Messages id={`s-${f.key}`} hint={hint} error={errors[f.key]} />
              </div>
            ) : f.type === "lines" ? (
              <Textarea key={`${f.key}-${f.version}-${state.values?.[f.key] ?? ""}`} id={`s-${f.key}`} name={`v_${f.key}`} label={f.label} rows={f.maxLines ?? 2} defaultValue={shown(f)} hint={hint} error={errors[f.key]} surface="light" />
            ) : (
              <TextField key={`${f.key}-${f.version}-${state.values?.[f.key] ?? ""}`} id={`s-${f.key}`} name={`v_${f.key}`} type={f.type === "email" ? "email" : f.type === "url" ? "url" : "text"} label={f.label} defaultValue={shown(f)} maxLength={f.maxLength + 5} hint={hint} error={errors[f.key]} surface="light" />
            )}
          </div>
        );
      })}
      {hasBrand ? <Checkbox id={`confirm-${group}`} name="confirmBrand" label="브랜드 핵심 문구(영문 슬로건)를 바꾸는 것을 확인했습니다. 바꾸지 않을 때는 선택하지 않아도 됩니다." surface="light" /> : null}
      <Button type="submit" busy={pending} variant="dark" surface="light" size="S">
        {pending ? "저장 중" : `${title} 저장`}
      </Button>
    </form>
  );
}
