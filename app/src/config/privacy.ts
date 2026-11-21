/**
 * 개인정보 보유 기간 (SECURITY §8, docs/legal/PRIVACY-POLICY-DRAFT.md).
 * 365일은 **운영자가 확정한 값**이다(2026-11-21). 바꿀 때는 여기와 처리방침·동의 문구를 함께 고친다.
 * 정기 정리(`/api/cron/cleanup`)가 이 기간이 지난 신청을 지운다.
 */
export const privacyConfig = {
  /** 예약 문의·소식 받기 신청을 접수한 날부터 보관하는 일수 (확정: 1년 = 365일) */
  inquiryRetentionDays: 365,
} as const;
