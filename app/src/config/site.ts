/** 사이트 공통 상수 (단일 출처). 확정 카피는 docs/COPY.md 와 같은 값이다. */
export const siteConfig = {
  name: "KYU",
  ownerName: "이동규",
  defaultTitle: "이동규 KYU | 프리다이빙 강사·AI 영상 크리에이터",
  titleTemplate: "%s — KYU",
  description: "프리다이빙 강사이자 AI 영상 크리에이터 이동규(KYU)의 공간입니다. 함께 떠나는 바다 여행과 AI 영상 작품을 만나고, 프리다이빙 강습·투어 또는 영상 협업을 문의해 보세요.",
  locale: "ko_KR",
  /** 인물 구조화 데이터의 하는 일 (description 과 같은 표현) */
  jobTitles: ["프리다이빙 강사", "AI 크리에이터"],
  /** 브라우저 주소창 색 (docs/COPY.md theme-color) */
  themeColor: "#071e29",
} as const;

/**
 * 연락처 (사이트 설정 > 연락 의 기본값). 실제 주소는 규강이 확인해 사이트 설정에서 바꾼다.
 * example.com 은 예약된 시험용 도메인이라 실수로 실제 메일이 발송되지 않는다.
 */
export const contactConfig = {
  email: "contact@example.com",
  intro: ["프리다이빙 문의부터 새로운 크리에이티브 협업까지.", "당신의 이야기를 들려주세요."],
  subjects: [
    { label: "강습·투어 문의", subject: "[KYU] 강습·투어 문의" },
    { label: "협업 문의", subject: "[KYU] 협업 문의" },
  ],
} as const;
