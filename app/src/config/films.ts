/**
 * Films(AI 영상) 화면의 고정 문구 (SCREEN-SPEC §5.14·5.15, §12.1 결정 11·14·18).
 * 소개 카피·부제·AI 제작 표기·특강 띠 문구는 사이트 설정(사이트 설정 > Films)에서 고친다. 여기 값은 설정이 비었을 때의 기본값이다.
 * AI 제작 표기 문구는 규강이 확정해야 한다(지금은 자리표시 문구).
 */
export const filmsConfig = {
  label: "04 / FILMS",
  title: ["물속에서 떠올린", "이야기."],
  subtitle: "상상으로 만든 짧은 영상과, 그 영상을 만든 과정을 함께 기록합니다.",
  /** 모든 작품 상세에 항상 보이는 AI 제작 표기 (결정 18) */
  aiNotice: "이 영상은 AI를 활용해 만들었습니다.",
  empty: "곧 첫 작품을 공개합니다.",
  callout: {
    label: "AI 영상 특강",
    title: "직접 만들어 보고 싶다면, 특강 소식을 먼저 받아 보세요.",
    body: "개설이 확정되면 대상, 실습 결과물, 일정과 신청 방식을 알려 드립니다. 버튼을 누르면 제목이 채워진 메일 창이 열리고, 실제 발송은 직접 하셔야 합니다.",
    button: "AI 특강 소식 요청하기",
    subject: "[KYU] AI 특강 소식 요청",
    mailBody: "AI 영상 특강 소식을 받고 싶습니다.\n\n이름(선택):\n",
  },
} as const;

/** 사이트 설정(`films.*`)에서 온 문구. 값이 없거나 비면 위 기본값을 쓴다 */
export interface FilmsCopy {
  titleLines: string[];
  subtitle: string;
  aiNotice: string;
  calloutTitle: string;
  calloutBody: string;
}

export function filmsCopy(settings: Record<string, string> = {}): FilmsCopy {
  const pick = (key: string, fallback: string) => (settings[key]?.trim() ? settings[key]! : fallback);
  return {
    titleLines: pick("films.title", filmsConfig.title.join("\n")).split("\n"),
    subtitle: pick("films.subtitle", filmsConfig.subtitle),
    aiNotice: pick("films.aiNotice", filmsConfig.aiNotice),
    calloutTitle: pick("films.calloutTitle", filmsConfig.callout.title),
    calloutBody: pick("films.calloutBody", filmsConfig.callout.body),
  };
}

/** 특강 소식 요청 메일 주소 (제목·본문이 채워진다). 서버에 저장하지 않는다 */
export function filmsMailto(email: string): string {
  const { subject, mailBody } = filmsConfig.callout;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;
}

/** 길이 문구 ("1:00" → "1:00"). 값이 없으면 빈 문자열 */
export const durationLabel = (duration: string): string => duration;
