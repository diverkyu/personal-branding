/**
 * 여행 추천 화면의 고정 문구 (SCREEN-SPEC §5.16·5.17, §12.2 결정 T-1~T-9).
 * 제목·부제·빈 상태 문구는 사이트 설정(사이트 설정 > 여행 추천)에서 고친다. 여기 값은 설정이 비었을 때의 기본값이다.
 */
export const travelConfig = {
  label: "FREEDIVING / TRAVEL",
  title: ["바다를 만나러", "가는 길."],
  subtitle: "프리다이빙하기 좋은 곳과, 가기 전에 알아 둘 것을 정리했습니다.",
  empty: "곧 첫 여행 추천을 올리겠습니다.",
  /** 필터에 맞는 글이 없을 때 */
  noMatch: "조건에 맞는 여행 추천이 없습니다.",
  /** 목록·상세에 항상 보이는 안내 (TRAVEL-08, TRAVELD-05) */
  notice: "시기·예산은 작성한 날의 참고 정보이며 달라질 수 있습니다. 가기 전에 최신 정보를 확인해 주세요.",
  /** 정보 확인일이 이 개월 수를 넘으면 오래된 정보로 본다 (결정 T-5) */
  staleMonths: 12,
  staleCard: "정보 확인일이 오래되었습니다",
  staleDetail: "정보가 오래되었을 수 있습니다. 가기 전에 최신 정보를 확인해 주세요.",
  noCheckedAt: "정보 확인일이 적혀 있지 않습니다.",
  pageSize: 9,
  inquiry: {
    label: "여행 문의",
    title: "이 곳이 궁금하다면, 편하게 물어보세요.",
    button: "메일로 문의하기",
    subject: "[KYU] 여행 문의",
    mailBody: "여행 추천에 대해 문의드립니다.\n\n이름(선택):\n문의 내용:\n",
  },
} as const;

/** 사이트 설정(`travel.*`)에서 온 문구. 값이 없거나 비면 위 기본값을 쓴다 */
export interface TravelCopy {
  titleLines: string[];
  subtitle: string;
  empty: string;
}

export function travelCopy(settings: Record<string, string> = {}): TravelCopy {
  const pick = (key: string, fallback: string) => (settings[key]?.trim() ? settings[key]! : fallback);
  return {
    titleLines: pick("travel.title", travelConfig.title.join("\n")).split("\n"),
    subtitle: pick("travel.subtitle", travelConfig.subtitle),
    empty: pick("travel.empty", travelConfig.empty),
  };
}

/** 여행 문의 메일 주소 (제목만 채운다. 글 제목은 넣지 않는다). 서버에 저장하지 않는다 (결정 T-7) */
export function travelMailto(email: string): string {
  const { subject, mailBody } = travelConfig.inquiry;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;
}
