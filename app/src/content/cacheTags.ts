/** 공개 화면의 콘텐츠 캐시 태그. 발행·취소·삭제가 일어나면 이 태그를 갱신한다 (AD-5c) */
export const STORIES_TAG = "contents-story";

/** 태그 갱신이 어떤 이유로 닿지 않아도, 이 시간 뒤에는 새 값을 읽는다. 예약 시각의 오차 한도이기도 하다 */
export const STORIES_MAX_AGE_SECONDS = 300;
