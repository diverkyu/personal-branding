/**
 * 영상 유형의 항목 (ADMIN-DESIGN §5.0 `fields`, §27). 영상은 `contents`의 한 유형이다.
 * 영상은 직접 업로드하지 않고 YouTube·Vimeo 링크로 둔다(PRD A-5). 제목·설명(요약)·본문(선택)은 공통 항목이다.
 * **공개 화면이 아직 없다**(AD-6d 는 어드민까지) — 발행해도 사이트에는 나타나지 않는다.
 * 순수 함수만 둔다. 임시저장은 일부가 비어도 되고, 비어 있으면 안 되는 항목은 발행 점검(videoProblems)에서 막는다.
 */
import { parseVideoUrl } from "@/lib/video";
import { AppError } from "@/lib/errors";

export const VIDEO_LIMITS = { url: 300, duration: 8 } as const;

export interface VideoFields {
  /** 정규화한 시청 주소(YouTube·Vimeo https). 발행하려면 필요하다 */
  videoUrl: string;
  /** 길이. "3:25" 또는 "1:02:30" 모양, 선택 */
  duration: string;
  /** 자막이 있는지 */
  hasCaptions: boolean;
}

export const EMPTY_VIDEO_FIELDS: VideoFields = { videoUrl: "", duration: "", hasCaptions: false };

const DURATION = /^(?:\d{1,2}:)?[0-5]?\d:[0-5]\d$/;
const str = (value: unknown): string => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

export function cleanVideoFields(input: unknown): VideoFields {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;

  let videoUrl = "";
  const urlRaw = str(raw.videoUrl);
  if (urlRaw) {
    if (urlRaw.length > VIDEO_LIMITS.url) throw new AppError("validation", `영상 주소는 ${VIDEO_LIMITS.url}자까지 쓸 수 있습니다.`);
    const parsed = parseVideoUrl(urlRaw);
    if (!parsed) throw new AppError("validation", "영상 주소는 YouTube 또는 Vimeo 의 https 주소만 쓸 수 있습니다.");
    videoUrl = parsed.watchUrl;
  }

  const duration = str(raw.duration);
  if (duration && (duration.length > VIDEO_LIMITS.duration || !DURATION.test(duration))) {
    throw new AppError("validation", "영상 길이는 3:25 또는 1:02:30 모양으로 입력해 주세요.");
  }

  const hasCaptions = raw.hasCaptions === true || raw.hasCaptions === "on" || raw.hasCaptions === "true";
  return { videoUrl, duration, hasCaptions };
}

/** 저장된 항목을 읽을 때: 깨져 있으면 빈 값으로 본다 */
export function readVideoFields(stored: unknown): VideoFields {
  try {
    return cleanVideoFields(stored);
  } catch {
    return { ...EMPTY_VIDEO_FIELDS };
  }
}

/** 발행·예약 전에 채워져 있어야 하는 항목 */
export function videoProblems(f: VideoFields): string[] {
  return f.videoUrl ? [] : ["영상 주소(YouTube 또는 Vimeo)를 입력해 주세요."];
}
