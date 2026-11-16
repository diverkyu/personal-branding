/**
 * 영상 주소 해석 (SECURITY §5 영상 임베드: 허용 도메인 목록만).
 * 허용: YouTube(youtube.com, youtu.be, Shorts → youtube-nocookie 로 임베드), Vimeo, Instagram(릴스·게시물 → 공식 임베드 주소).
 * 그 밖의 주소·스킴은 null. 저장되는 주소(watchUrl)는 추적용 값(utm_source 등)을 뗀 정규화 주소다.
 */
export type VideoProvider = "youtube" | "vimeo" | "instagram";
export const PROVIDER_LABELS: Record<VideoProvider, string> = { youtube: "YouTube", vimeo: "Vimeo", instagram: "Instagram" };

export interface VideoSource {
  provider: VideoProvider;
  /** 세로 영상(Shorts·Instagram)은 좁은 폭으로 보여 준다 */
  orientation: "landscape" | "portrait";
  id: string;
  /** iframe 에 넣는 주소 */
  embedUrl: string;
  /** 재생이 안 될 때 보여 주는 원본 링크 */
  watchUrl: string;
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^[0-9]{5,12}$/;
/** Instagram 게시물 코드(예: DfyQydRMWBw). 길이는 느슨하게 받고 글자 종류만 제한한다 */
const IG_CODE = /^[A-Za-z0-9_-]{6,20}$/;
const IG_USER = /^[A-Za-z0-9._]{1,30}$/;

export function parseVideoUrl(raw: string): VideoSource | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id = url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.startsWith("/embed/") ? url.pathname.slice(7) : null;
    if (id && YT_ID.test(id)) return youtube(id);
    if (url.pathname.startsWith("/shorts/")) {
      const shortId = url.pathname.slice(8).replace(/\/$/, "");
      if (YT_ID.test(shortId)) return youtube(shortId, "portrait");
    }
  }
  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    if (YT_ID.test(id)) return youtube(id);
  }
  if (host === "vimeo.com") {
    const id = url.pathname.slice(1);
    if (VIMEO_ID.test(id)) return { provider: "vimeo", orientation: "landscape", id, embedUrl: `https://player.vimeo.com/video/${id}?dnt=1`, watchUrl: `https://vimeo.com/${id}` };
  }
  if (host === "instagram.com") return instagram(url.pathname);
  return null;
}

/** /reel/코드/, /p/코드/, /tv/코드/ 와 /사용자/reel/코드/ 모양을 받는다. 쿼리(utm_source 등)는 버린다 */
function instagram(pathname: string): VideoSource | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 3 && IG_USER.test(parts[0] ?? "")) parts.shift();
  const [kind, code] = parts;
  if (parts.length !== 2 || !code || !IG_CODE.test(code)) return null;
  if (kind !== "reel" && kind !== "p" && kind !== "tv") return null;
  return { provider: "instagram", orientation: "portrait", id: code, embedUrl: `https://www.instagram.com/${kind}/${code}/embed/`, watchUrl: `https://www.instagram.com/${kind}/${code}/` };
}

function youtube(id: string, orientation: "landscape" | "portrait" = "landscape"): VideoSource {
  return { provider: "youtube", orientation, id, embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`, watchUrl: `https://www.youtube.com/watch?v=${id}` };
}

/**
 * iframe 의 sandbox 값. 재생에 필요한 최소만 허용한다. Instagram 은 화면 안의 링크("Instagram에서 더 보기", 프로필)가
 * 새 창으로 열려야 해서 팝업만 더 허용한다(새 창은 샌드박스 밖에서 열려 Instagram 이 정상 동작한다).
 */
export function embedSandbox(provider: VideoProvider): string {
  const base = "allow-scripts allow-same-origin allow-presentation";
  return provider === "instagram" ? `${base} allow-popups allow-popups-to-escape-sandbox` : base;
}

/** "3:25" → "PT3M25S", "1:02:30" → "PT1H2M30S" (구조화 데이터용). 모양이 틀리면 null */
export function isoDuration(duration: string): string | null {
  const m = /^(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)$/.exec(duration);
  if (!m) return null;
  const [, h, min, sec] = m;
  return `PT${h ? `${Number(h)}H` : ""}${Number(min)}M${Number(sec)}S`;
}
