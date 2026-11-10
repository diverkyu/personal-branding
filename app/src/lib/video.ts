/**
 * 영상 주소 해석 (SECURITY §5 영상 임베드: 허용 도메인 목록만).
 * 허용: YouTube(youtube.com, youtu.be → youtube-nocookie 로 임베드), Vimeo. 그 밖의 주소·스킴은 null.
 */
export interface VideoSource {
  provider: "youtube" | "vimeo";
  id: string;
  /** iframe 에 넣는 주소 */
  embedUrl: string;
  /** 재생이 안 될 때 보여 주는 원본 링크 */
  watchUrl: string;
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^[0-9]{5,12}$/;

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
  }
  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    if (YT_ID.test(id)) return youtube(id);
  }
  if (host === "vimeo.com") {
    const id = url.pathname.slice(1);
    if (VIMEO_ID.test(id)) return { provider: "vimeo", id, embedUrl: `https://player.vimeo.com/video/${id}?dnt=1`, watchUrl: `https://vimeo.com/${id}` };
  }
  return null;
}

function youtube(id: string): VideoSource {
  return { provider: "youtube", id, embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`, watchUrl: `https://www.youtube.com/watch?v=${id}` };
}

/** "3:25" → "PT3M25S", "1:02:30" → "PT1H2M30S" (구조화 데이터용). 모양이 틀리면 null */
export function isoDuration(duration: string): string | null {
  const m = /^(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)$/.exec(duration);
  if (!m) return null;
  const [, h, min, sec] = m;
  return `PT${h ? `${Number(h)}H` : ""}${Number(min)}M${Number(sec)}S`;
}
