import { adminDb } from "@/data/admin/dbServer";
import { listConsentVersions } from "@/data/admin/settings";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTimeKst } from "@/lib/format";
import { CONSENT_LABELS, CONSENT_LIMITS, DEFAULT_CONSENT_TEXT, type ConsentKind } from "@/settings/consent";
import styles from "../../admin.module.css";
import { ConsentForm } from "./ConsentForm";

export const metadata = { title: "동의·방침 · KYU 어드민" };

const NOTES: Record<ConsentKind, string> = {
  reservation: "투어 상세의 예약 문의 폼 체크박스에 나오는 문구입니다.",
  notice: "모집 예정 투어의 소식 받기 폼 체크박스에 나오는 문구입니다.",
  privacy: "공개 사이트의 개인정보 처리방침 페이지 본문입니다. 공개 전에 법률 전문가의 확인을 받아 게시하세요.",
};

export default async function LegalPage() {
  const admin = await requireAdmin();
  const db = adminDb();
  const kinds: ConsentKind[] = ["reservation", "notice", "privacy"];
  const lists = await Promise.all(kinds.map((k) => listConsentVersions(db, admin, k)));
  return (
    <>
      <h1 className={styles.h1}>동의·방침</h1>
      <p className={styles.note}>문구를 바꾸면 수정하지 않고 <strong>새 버전</strong>으로 게시합니다. 접수된 신청에는 신청자가 본 문구의 버전이 기록됩니다.</p>
      {kinds.map((kind, i) => {
        const versions = lists[i] ?? [];
        const latest = versions[0];
        const multiline = kind === "privacy";
        const fallback = kind === "privacy" ? "" : DEFAULT_CONSENT_TEXT[kind];
        return (
          <section key={kind} className={styles.panel} style={{ marginBottom: 16 }} aria-labelledby={`l-${kind}`}>
            <h2 id={`l-${kind}`} className={styles.h2} style={{ marginTop: 0 }}>
              {CONSENT_LABELS[kind]}
            </h2>
            <p className={styles.note}>
              {NOTES[kind]} {latest ? `현재 버전 ${latest.version} (${formatDateTimeKst(latest.effectiveFrom)}부터)` : "아직 게시된 버전이 없습니다. " + (kind === "privacy" ? "공개 페이지에는 준비 중 안내가 보입니다." : "기본 문구를 쓰고 있습니다.")}
            </p>
            <ConsentForm kind={kind} multiline={multiline} current={latest?.body ?? fallback} maxLength={multiline ? CONSENT_LIMITS.privacy : CONSENT_LIMITS.checkbox} />
            {versions.length > 0 ? (
              <details style={{ marginTop: 16 }}>
                <summary className={styles.linkButton}>이전 버전 기록 ({versions.length})</summary>
                <ol style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: 14, lineHeight: 1.6 }}>
                  {versions.map((v) => (
                    <li key={v.id}>
                      버전 {v.version} · {formatDateTimeKst(v.effectiveFrom)}
                      <p className={styles.message} style={{ margin: "4px 0 8px" }}>
                        {v.body}
                      </p>
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}
          </section>
        );
      })}
    </>
  );
}
