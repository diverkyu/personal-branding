/** 사이트 공통 상수 (단일 출처). 확정 카피는 docs/COPY.md 와 같은 값이다. */
export const siteConfig = {
  name: "KYU",
  ownerName: "이동규",
  defaultTitle: "KYU — Dive deeper. Create beyond.",
  titleTemplate: "%s — KYU",
  description: "이동규 KYU — 프리다이빙 강사이자 AI 크리에이터. 바다의 깊이와 상상의 가능성을 탐험합니다.",
  locale: "ko_KR",
  /** 브라우저 주소창 색 (docs/COPY.md theme-color) */
  themeColor: "#071e29",
} as const;

/**
 * 연락처 (사이트 설정 > 연락 의 기본값). 실제 주소는 규강이 확인해 사이트 설정에서 바꾼다.
 * example.com 은 예약된 시험용 도메인이라 실수로 실제 메일이 발송되지 않는다.
 */
export const contactConfig = {
  email: "contact@example.com",
  intro: "당신의 이야기를 들려주세요.",
  subjects: [
    { label: "강습·투어 문의", subject: "[KYU] 강습·투어 문의" },
    { label: "협업 문의", subject: "[KYU] 협업 문의" },
  ],
} as const;
