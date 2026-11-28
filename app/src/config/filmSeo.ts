import type { FilmDetail } from "@/data/filmQueries";

/** 2026-11-28 공개 화면에서 확인한 제목·회차만 사용. 줄거리·도구는 제작자 확인 후 CMS에서 보강한다. */
const episodeCopy: Record<string, { title: string; legacyDescription: string; description: string }> = {
  "brilliant-ordinary-days-ep1": {
    title: "찬란한 보통의 날들 EP1. 괜찮지 않아도 돼",
    legacyDescription: "찬란한 보통의 날들 EP1 AI로 만든 숏드라마입니다.",
    description: "이동규(KYU)의 AI 숏드라마 ‘찬란한 보통의 날들’ 1화, ‘괜찮지 않아도 돼’입니다. 시리즈의 첫 에피소드를 영상으로 감상하고 다음 작품으로 이어 보세요.",
  },
  "brilliant-ordinary-days-ep2": {
    title: "찬란한 보통의 날들 EP2. 우리 집 가자.",
    legacyDescription: "찬란한 보통의 날들 EP2 AI로 만든 숏드라마입니다.",
    description: "‘찬란한 보통의 날들’ 2화 ‘우리 집 가자.’를 감상하세요. 이동규(KYU)가 AI로 제작한 숏드라마의 두 번째 영상으로, 작품 페이지에서 앞뒤 에피소드도 찾아볼 수 있습니다.",
  },
  "brilliant-ordinary-days-ep3": {
    title: "찬란한 보통의 날들 EP3. 보통이",
    legacyDescription: "찬란한 보통의 날들 EP3 AI로 만든 숏드라마입니다.",
    description: "‘보통이’라는 제목으로 이어지는 AI 숏드라마 ‘찬란한 보통의 날들’ 3화입니다. 이동규(KYU)의 세 번째 에피소드 영상과 공개일을 확인하고, 시리즈의 다른 작품도 만나보세요.",
  },
  "brilliant-ordinary-days-ep4": {
    title: "찬란한 보통의 날들 EP4. 나 오늘 칭찬 받았다",
    legacyDescription: "찬란한 보통의 날들 EP4. 나 오늘 칭찬 받았다 AI로 만든 숏드라마입니다",
    description: "AI 숏드라마 ‘찬란한 보통의 날들’ 4화의 제목은 ‘나 오늘 칭찬 받았다’입니다. 이동규(KYU)가 만든 네 번째 에피소드를 감상하고, 앞뒤 회차의 영상으로 이어가 보세요.",
  },
  "brilliant-ordinary-days-ep5": {
    title: "찬란한 보통의 날들 EP.5 기다리면 와",
    legacyDescription: "찬란한 보통의 날들 EP.5 AI로 만든 숏드라마입니다",
    description: "‘찬란한 보통의 날들’ 5화 ‘기다리면 와’를 영상으로 만나보세요. 이동규(KYU)가 AI로 제작한 숏드라마이며, 작품의 자막과 함께 다섯 번째 에피소드를 감상할 수 있습니다.",
  },
  "brilliant-ordinary-days-ep6": {
    title: "찬란한 보통의 날들 EP6.오늘은 참치가 아니네요",
    legacyDescription: "찬란한 보통의 날들 EP.6 AI로 만든 숏드라마입니다",
    description: "‘오늘은 참치가 아니네요’는 AI 숏드라마 ‘찬란한 보통의 날들’의 6화입니다. 이동규(KYU)가 만든 1분 30초 분량의 영상을 자막과 함께 감상하고 이전 에피소드도 확인하세요.",
  },
};

/** 직접 쓴 SEO 값 우선. 알려진 초기 설명/제목에만 편집 기본값을 적용하고 CMS의 새 내용은 가리지 않는다. */
export function filmSearchCopy(film: Pick<FilmDetail, "slug" | "title" | "summary" | "seoTitle" | "seoDescription" | "tags" | "duration" | "hasCaptions">) {
  const draft = episodeCopy[film.slug];
  const matches = draft?.title === film.title;
  const legacy = matches && film.summary === draft.legacyDescription;
  const kind = film.tags.includes("숏드라마") ? "AI 숏드라마" : "AI 영상";
  // 재생 시간/자막을 수정했다면 이전 설명 대신 현재 CMS 요약을 사용한다.
  const mediaMatches = (!film.slug.endsWith("ep6") || film.duration === "1:30")
    && (!/ep[56]$/.test(film.slug) || film.hasCaptions);
  const description = film.seoDescription && film.seoDescription !== draft?.legacyDescription
    ? film.seoDescription
    : legacy && mediaMatches ? draft.description : film.summary || `${film.title}. 이동규(KYU)의 ${kind} 작품을 감상하세요.`;
  const title = film.seoTitle && film.seoTitle !== film.title ? film.seoTitle
    : /AI\s*(영상|숏드라마)/.test(film.title) ? film.title : `${film.title} | ${kind}`;
  return { title, description };
}
