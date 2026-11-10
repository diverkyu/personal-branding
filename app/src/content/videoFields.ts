/**
 * 영상 유형의 항목 (ADMIN-DESIGN §5.0 `fields`, §27). 영상은 `contents`의 한 유형이다.
 * 영상은 직접 업로드하지 않고 YouTube·Vimeo 링크로 둔다(PRD A-5). 제목·설명(요약)·본문(선택)은 공통 항목이다.
 * Films 공개 화면(7b)을 위한 항목을 더했다(7a, ADMIN-DESIGN §28): 포스터(대표 이미지), 표시 문구, 대표 작품, 제작 노트 3칸.
 * **공개 화면이 아직 없다** — 발행해도 사이트에는 나타나지 않는다(7b 에서 만든다).
 * 순수 함수만 둔다. 임시저장은 일부가 비어도 되고, 비어 있으면 안 되는 항목은 발행 점검(videoProblems)에서 막는다.
 */
import { parseVideoUrl } from "@/lib/video";
import { AppError } from "@/lib/errors";

export const VIDEO_LIMITS = { url: 300, duration: 8, cutLabel: 20, note: 1500 } as const;

/** 제작 노트 3칸 (SCREEN-SPEC FILMD-09): 장면 의도 / 프롬프트·스킬 / 편집 판단 */
export const NOTE_KEYS = ["sceneIntent", "promptNotes", "editNotes"] as const;
export type NoteKey = (typeof NOTE_KEYS)[number];
export const NOTE_LABELS: Record<NoteKey, string> = { sceneIntent: "장면 의도", promptNotes: "프롬프트 · 스킬", editNotes: "편집 판단" };
export const NOTE_HINTS: Record<NoteKey, string> = {
  sceneIntent: "이 장면으로 무엇을 말하려 했는지",
  promptNotes: "실제로 쓴 구절이나 제작 기법. 공개하고 싶지 않으면 비워 두세요",
  editNotes: "컷을 고르고 이은 이유, 다음에 고칠 점",
};

export interface VideoFields {
  /** 정규화한 시청 주소(YouTube·Vimeo https). 발행하려면 필요하다 */
  videoUrl: string;
  /** 길이. "3:25" 또는 "1:02:30" 모양, 선택 */
  duration: string;
  /** 자막이 있는지 */
  hasCaptions: boolean;
  /** 포스터(대표 이미지) id. 발행하려면 필요하다. 업로드한 이미지만 쓴다 — 외부 서비스 썸네일은 쓰지 않는다 */
  posterMediaId: string | null;
  /** 표시 문구 (예: ROUGH CUT). 비우면 뱃지를 보이지 않는다 */
  cutLabel: string;
  /** 대표 작품 표시. 여러 건이면 가장 최근에 공개한 것이 대표다 */
  featured: boolean;
  /** 제작 노트. 글자 그대로(줄바꿈 유지, HTML 해석 없음). 비운 칸은 공개 화면에서 숨긴다 */
  sceneIntent: string;
  promptNotes: string;
  editNotes: string;
}

export const EMPTY_VIDEO_FIELDS: VideoFields = { videoUrl: "", duration: "", hasCaptions: false, posterMediaId: null, cutLabel: "", featured: false, sceneIntent: "", promptNotes: "", editNotes: "" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** 탭·줄바꿈 말고 제어 문자는 거부한다 */
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

/** 제작 노트는 가공하지 않는다: 줄바꿈 형식(CRLF→LF)과 앞뒤 공백만 정리한다 */
function cleanNote(value: unknown, label: string): string {
  const text = typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : "";
  if (text.length > VIDEO_LIMITS.note) throw new AppError("validation", `${label}은(는) ${VIDEO_LIMITS.note}자까지 쓸 수 있습니다.`);
  if (CONTROL.test(text)) throw new AppError("validation", `${label}에 쓸 수 없는 문자가 있습니다.`);
  return text;
}

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

  const posterRaw = typeof raw.posterMediaId === "string" ? raw.posterMediaId.trim() : "";
  if (posterRaw && !UUID.test(posterRaw)) throw new AppError("validation", "포스터 이미지를 다시 골라 주세요.");
  const posterMediaId = posterRaw ? posterRaw.toLowerCase() : null;

  const cutLabel = str(raw.cutLabel);
  if (cutLabel.length > VIDEO_LIMITS.cutLabel) throw new AppError("validation", `표시 문구는 ${VIDEO_LIMITS.cutLabel}자까지 쓸 수 있습니다.`);

  const featured = raw.featured === true || raw.featured === "on" || raw.featured === "true";
  return {
    videoUrl,
    duration,
    hasCaptions,
    posterMediaId,
    cutLabel,
    featured,
    sceneIntent: cleanNote(raw.sceneIntent, NOTE_LABELS.sceneIntent),
    promptNotes: cleanNote(raw.promptNotes, NOTE_LABELS.promptNotes),
    editNotes: cleanNote(raw.editNotes, NOTE_LABELS.editNotes),
  };
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
  const problems: string[] = [];
  if (!f.videoUrl) problems.push("영상 주소(YouTube 또는 Vimeo)를 입력해 주세요.");
  if (!f.posterMediaId) problems.push("포스터 이미지를 골라 주세요.");
  return problems;
}

/** 이 영상이 쓰는 이미지 id (존재 확인·대체 텍스트 점검·사용 집계에 쓴다) */
export const videoMediaIds = (f: VideoFields): string[] => (f.posterMediaId ? [f.posterMediaId] : []);

/** 제작 노트가 하나라도 있는지 (공개 화면에서 "제작 노트 보기"를 보일지 정한다) */
export const hasNotes = (f: VideoFields): boolean => NOTE_KEYS.some((k) => f[k] !== "");
