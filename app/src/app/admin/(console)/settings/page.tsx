import { adminDb } from "@/data/admin/dbServer";
import { listStoredSettings } from "@/data/admin/settings";
import { requireAdmin } from "@/lib/auth/session";
import { SETTINGS, SETTING_GROUPS } from "@/settings/registry";
import styles from "../../admin.module.css";
import { SettingsGroupForm, type SettingField } from "./SettingsForm";

export const metadata = { title: "사이트 설정 · KYU 어드민" };

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const stored = await listStoredSettings(adminDb(), admin);
  return (
    <>
      <h1 className={styles.h1}>사이트 설정</h1>
      <p className={styles.note}>공개 사이트의 공통 문구와 연락처를 고칩니다. 레이아웃·색·글꼴은 여기서 바꾸지 않습니다. 저장하면 공개 화면에 몇 초 안에 반영됩니다.</p>
      {SETTING_GROUPS.map((group) => {
        const fields: SettingField[] = SETTINGS.filter((s) => s.group === group.id).map((s) => ({
          key: s.key,
          label: s.label,
          usedAt: s.usedAt,
          type: s.type,
          maxLength: s.maxLength,
          maxLines: s.maxLines,
          hint: s.hint,
          brandCore: s.brandCore,
          value: stored[s.key]?.value ?? s.default,
          version: stored[s.key]?.version ?? 0,
          isDefault: !stored[s.key],
        }));
        return (
          <section key={group.id} className={styles.panel} style={{ marginBottom: 16 }} aria-labelledby={`g-${group.id}`}>
            <h2 id={`g-${group.id}`} className={styles.h2} style={{ marginTop: 0 }}>
              {group.title}
            </h2>
            <SettingsGroupForm group={group.id} title={group.title} fields={fields} />
          </section>
        );
      })}
      <p className={styles.note}>
        아직 이 화면에서 고칠 수 없는 문구(홈의 About·구분 띠, 투어 폼 안내·완료 문구, 알림 수신 이메일 등)는 다음 단계에서 추가됩니다. 동의 문구와 개인정보 처리방침은 <a href="/admin/legal">동의·방침</a>에서 버전으로 관리합니다.
      </p>
    </>
  );
}
