/**
 * 가상 데이터. 4단계(페이지 틀)에서 화면을 확인하기 위한 예시이며 실제 이력·고객·후기가 아니다.
 * 실제 저장소(DB)가 연결되면 이 파일은 시험용으로만 남긴다. 개인정보·실제 상품명을 넣지 않는다.
 */
import type { Equipment, Review, Story, Tour } from "@/types/content";

export const stories: Story[] = [
  {
    slug: "waiting-for-the-first-breath",
    title: "첫 호흡을 기다리는 시간",
    summary: "물에 들어가기 전의 고요함에 대해 적어 봅니다. (예시 글)",
    publishedAt: "2026-10-28",
    tags: ["바다", "기록"],
    body: [
      "물에 들어가기 전, 잠깐 숨을 고르는 시간이 있습니다. 이 글은 화면 구성을 확인하기 위한 예시 본문입니다.",
      "실제 글은 어드민에서 작성하며, 소제목·인용·이미지가 들어갈 수 있습니다.",
      "문단 사이의 간격과 한 줄의 길이를 읽기 좋게 확인하는 용도입니다.",
    ],
    questions: ["프리다이빙은 처음이어도 괜찮을까요?", "물이 무서운 사람도 배울 수 있나요?"],
    thumbVariant: "sea-a",
  },
  {
    slug: "making-images-with-ai",
    title: "상상을 이미지로 옮기는 방법",
    summary: "AI로 장면을 만들 때 먼저 떠올리는 것들. (예시 글)",
    publishedAt: "2026-10-14",
    tags: ["창작"],
    body: ["예시 본문입니다. 창작 과정을 기록하는 글이 이곳에 들어갑니다.", "두 번째 단락도 예시입니다."],
    thumbVariant: "sea-b",
  },
  {
    slug: "notes-after-a-tour",
    title: "투어가 끝난 뒤의 메모",
    summary: "함께한 시간을 돌아보며 남기는 기록. (예시 글)",
    publishedAt: "2026-09-30",
    tags: ["바다", "기록"],
    body: ["예시 본문입니다. 투어 이후의 기록이 이곳에 들어갑니다."],
    thumbVariant: "sea-c",
  },
  {
    slug: "a-quiet-morning",
    title: "조용한 아침의 바다",
    summary: "이른 아침 바다에서 느낀 것들. (예시 글)",
    publishedAt: "2026-09-12",
    tags: ["바다"],
    body: ["예시 본문입니다."],
    thumbVariant: "sea-d",
  },
];

// 페이지 나누기(STORY-05)를 확인하기 위해 예시 글을 늘린다. 이미 있는 4건 + 8건 = 12건 (페이지당 9건이면 2페이지).
const VARIANTS = ["sea-a", "sea-b", "sea-c", "sea-d"] as const;
stories.push(
  ...Array.from({ length: 8 }, (_, i): Story => ({
    slug: `sample-story-${i + 1}`,
    title: `예시 글 ${i + 1}`,
    summary: `화면 확인용 예시 글입니다. (${i + 1})`,
    publishedAt: `2026-08-${String(28 - i * 3).padStart(2, "0")}`,
    tags: [["바다", "기록", "창작"][i % 3] as string],
    body: ["예시 본문입니다."],
    thumbVariant: VARIANTS[i % 4] as Story["thumbVariant"],
  })),
);

export const tours: Tour[] = [
  {
    slug: "sample-recruiting",
    title: "입문 프리다이빙 투어 (예시)",
    status: "recruiting",
    startDate: "2026-12-05",
    endDate: "2026-12-07",
    place: "예시 장소 A",
    capacity: 8,
    summary: "처음 물에 들어가는 사람을 위한 투어. (예시)",
    description: ["바다를 만나고, 호흡에 집중하고, 물속에서 새로운 감각을 발견하는 시간입니다. (예시 소개문)", "일정과 준비물은 실제 투어가 등록되면 이곳에 표시됩니다."],
    feeNote: "참가비와 포함 사항은 예시입니다. 결제는 이 사이트에서 하지 않으며 안내만 제공합니다.",
    gallery: [
      { alt: "예시 사진 1: 바다 표면", caption: "예시 사진 1", variant: "sea-a" },
      { alt: "예시 사진 2: 물속 풍경", caption: "예시 사진 2", variant: "sea-b" },
      { alt: "예시 사진 3: 해안", caption: "예시 사진 3", variant: "sea-c" },
    ],
    thumbVariant: "sea-a",
  },
  {
    slug: "sample-upcoming",
    title: "봄 바다 투어 (예시)",
    status: "upcoming",
    startDate: "2027-03-20",
    endDate: "2027-03-22",
    place: "예시 장소 B",
    summary: "모집을 준비하고 있는 투어. (예시)",
    description: ["모집 예정인 투어의 예시 소개문입니다."],
    thumbVariant: "sea-b",
  },
  {
    slug: "sample-closed",
    title: "가을 바다 투어 (예시)",
    status: "closed",
    startDate: "2026-11-21",
    endDate: "2026-11-22",
    place: "예시 장소 C",
    capacity: 6,
    summary: "마감된 투어. (예시)",
    description: ["마감된 투어의 예시 소개문입니다."],
    thumbVariant: "sea-c",
  },
  {
    slug: "sample-ended-1",
    title: "여름 바다 투어 (예시)",
    status: "ended",
    startDate: "2026-08-08",
    endDate: "2026-08-10",
    place: "예시 장소 A",
    summary: "종료된 투어. (예시)",
    description: ["종료된 투어의 예시 소개문입니다."],
    gallery: [
      { alt: "예시 사진 1: 출발 전 바다", caption: "출발 전 (예시)", variant: "sea-a" },
      { alt: "예시 사진 2: 호흡 연습", caption: "호흡 연습 (예시)", variant: "sea-b" },
      { alt: "예시 사진 3: 물속", caption: "물속 (예시)", variant: "sea-c" },
      { alt: "예시 사진 4: 단체", caption: "단체 (예시)", variant: "sea-d" },
    ],
    videos: ["https://www.youtube.com/watch?v=aqz-KE-bpKQ"],
    extras: ["후기 연결됨", "갤러리", "스케치 영상"],
    thumbVariant: "sea-d",
  },
  {
    slug: "sample-ended-2",
    title: "초여름 바다 투어 (예시)",
    status: "ended",
    startDate: "2026-06-13",
    endDate: "2026-06-14",
    place: "예시 장소 B",
    summary: "종료된 투어. (예시)",
    description: ["종료된 투어의 예시 소개문입니다."],
    extras: ["후기 연결됨", "스케치 영상"],
    thumbVariant: "sea-a",
  },
];

export const equipment: Equipment[] = [
  {
    slug: "sample-mask",
    name: "마스크 예시 A",
    category: "마스크",
    brand: "예시 브랜드",
    reason: "시야가 넓고 물이 덜 차는 구조라는 가정의 예시 문구입니다.",
    reasonDetail: ["실제 추천 이유는 규강이 직접 사용·검증한 내용만 씁니다. (예시)"],
    features: ["저용량 구조 (예시)", "넓은 시야 (예시)"],
    images: [
      { alt: "예시 이미지: 정면", variant: "sea-b" },
      { alt: "예시 이미지: 측면", variant: "sea-c" },
      { alt: "예시 이미지: 착용 모습", variant: "sea-d" },
    ],
    priceNote: "가격대는 예시입니다",
    checkedAt: "2026-11-01",
    action: "external",
    externalUrl: "https://example.com/mask",
    affiliate: true,
    thumbVariant: "sea-a",
  },
  {
    slug: "sample-fins",
    name: "핀 예시 B",
    category: "핀",
    reason: "가볍고 부담이 적은 핀이라는 예시 문구입니다.",
    action: "inquiry",
    thumbVariant: "sea-b",
  },
  {
    slug: "sample-suit",
    name: "슈트 예시 C",
    category: "슈트",
    reason: "보온과 움직임의 균형이라는 예시 문구입니다.",
    action: "none",
    thumbVariant: "sea-c",
  },
  {
    slug: "sample-snorkel",
    name: "스노클 예시 D",
    category: "마스크",
    reason: "입에 편한 마우스피스라는 예시 문구입니다.",
    action: "external",
    externalUrl: "https://example.com/snorkel",
    thumbVariant: "sea-d",
  },
];

export const reviews: Review[] = [
  { id: "r1", text: "예시 후기 원문입니다.\n줄바꿈은 그대로 보입니다.", author: "수강생 A", writtenAt: "2026-08-20", tourSlug: "sample-ended-1", featured: true },
  { id: "r2", text: "두 번째 예시 후기입니다. 실제 후기는 동의를 받은 원문만 사용합니다.", author: "수강생 B", writtenAt: "2026-08-18", tourSlug: "sample-ended-1", featured: true },
  { id: "r3", text: "세 번째 예시 후기입니다.", author: "수강생 C", writtenAt: "2026-06-20", tourSlug: "sample-ended-2", featured: true },
  { id: "r4", text: "투어와 연결되지 않은 예시 후기입니다.", author: "수강생 D", writtenAt: "2026-05-02", featured: false },
];

// 후기 "더 보기"(REV-05)를 확인하기 위해 예시 후기를 늘린다 (기본 4건 + 10건 = 14건, 12건씩).
reviews.push(
  ...Array.from({ length: 10 }, (_, i): Review => ({
    id: `rx${i + 1}`,
    text: `화면 확인용 예시 후기입니다. (${i + 1})`,
    author: `수강생 ${String.fromCharCode(69 + i)}`,
    writtenAt: `2026-04-${String(28 - i * 2).padStart(2, "0")}`,
    featured: false,
  })),
);
