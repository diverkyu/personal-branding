/**
 * 어드민 대시보드의 공개 준비 점검 (ADMIN-DESIGN §35). 설정·동의·방침이 게시됐는지 DB 에서 읽고, 환경변수는 "있는지"만 판정한다.
 * 읽기 전용이며 개인정보를 읽지 않는다. 확인된 관리자만 부른다.
 */
import { readinessChecks, type ReadinessItem } from "@/lib/readiness";
import type { AdminSession } from "@/lib/auth/types";
import { loadCurrentConsent, loadCurrentPrivacy, loadSettings } from "@/settings/store";
import type { AdminDb } from "./db";

export async function loadReadiness(db: AdminDb, admin: AdminSession, env: Record<string, string | undefined>): Promise<ReadinessItem[]> {
  void admin;
  const [settings, privacy, reservation, notice] = await Promise.all([loadSettings(db), loadCurrentPrivacy(db), loadCurrentConsent(db, "reservation"), loadCurrentConsent(db, "notice")]);
  return readinessChecks({ env, settings, privacyPublished: privacy !== null, consentVersions: { reservation: reservation.version, notice: notice.version } });
}
