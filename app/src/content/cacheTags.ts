/** 공개 화면의 콘텐츠 캐시 태그. 발행·취소·삭제가 일어나면 이 태그를 갱신한다 (AD-5c) */
export const STORIES_TAG = "contents-story";

/** 태그 갱신이 어떤 이유로 닿지 않아도, 이 시간 뒤에는 새 값을 읽는다. 예약 시각의 오차 한도이기도 하다 */
export const STORIES_MAX_AGE_SECONDS = 300;

/** 투어(공개 목록·상세·신청 화면) 캐시 태그 */
export const TOURS_TAG = "contents-tour";

/** 장비(공개 목록·상세) 캐시 태그 */
export const EQUIPMENT_TAG = "contents-equipment";

/** 수강 후기(공개 후기 화면·홈·허브·투어 상세) 캐시 태그 */
export const REVIEWS_TAG = "reviews";

/** 영상(Films 목록·작품 상세) 캐시 태그 */
export const VIDEOS_TAG = "contents-video";

/** 여행 추천(목록·상세·메뉴) 캐시 태그 */
export const TRAVEL_TAG = "contents-travel";

/** About(규강 소개) 캐시 태그 */
export const ABOUT_TAG = "about";

/** 콘텐츠가 바뀌면 갱신해야 하는 공개 캐시 태그 전부 */
export const PUBLIC_CONTENT_TAGS = [STORIES_TAG, TOURS_TAG, EQUIPMENT_TAG, REVIEWS_TAG, ABOUT_TAG, VIDEOS_TAG, TRAVEL_TAG] as const;
