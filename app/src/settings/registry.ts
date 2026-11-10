/**
 * 사이트 설정 목록 (SCREEN-SPEC §7.6). 어떤 값을 어디서 고칠 수 있는지의 단일 출처다.
 * - 값은 비어 있거나 잘못되면 기본값을 쓴다 (화면이 깨지지 않게).
 * - 레이아웃·색·글꼴은 설정에 없다 (SCREEN-SPEC §2: 고정 디자인은 개발 요청).
 * - 순수 코드라 서버 액션·화면·시험이 같은 규칙을 쓴다.
 */
export type SettingType = "text" | "lines" | "email";
export type SettingGroup = "home" | "films" | "contact" | "footer" | "seo";

export interface SettingDef {
  key: string;
  group: SettingGroup;
  label: string;
  /** 어느 화면의 어느 요소에 쓰이는지 (SCREEN-SPEC 요소 ID) */
  usedAt: string;
  type: SettingType;
  /** text·email 은 전체 글자 수, lines 는 한 줄당 글자 수 */
  maxLength: number;
  /** lines 일 때 최대 줄 수 */
  maxLines?: number;
  default: string;
  hint?: string;
  /** 브랜드 핵심 문구: 저장 전 확인을 받는다 (SCREEN-SPEC §12 결정 1) */
  brandCore?: boolean;
}

export const SETTING_GROUPS: { id: SettingGroup; title: string }[] = [
  { id: "home", title: "홈" },
  { id: "films", title: "Films (AI 영상)" },
  { id: "contact", title: "연락" },
  { id: "footer", title: "푸터" },
  { id: "seo", title: "검색·공유" },
];

import { filmsConfig } from "@/config/films";

export const SETTINGS: SettingDef[] = [
  {
    key: "home.slogan",
    group: "home",
    label: "영문 슬로건",
    usedAt: "홈 히어로 제목 (HOME-02)",
    type: "text",
    maxLength: 60,
    default: "Dive deeper. Create beyond.",
    hint: "두 문장, 마침표로 끝납니다. 두 번째 문장의 마지막 단어가 강조색으로 보입니다.",
    brandCore: true,
  },
  {
    key: "home.headline",
    group: "home",
    label: "한국어 헤드라인",
    usedAt: "홈 히어로 (HOME-03)",
    type: "lines",
    maxLength: 24,
    maxLines: 2,
    default: "바다에서는 더 깊이,\n상상 속에서는 더 멀리.",
    hint: "최대 2줄, 한 줄 24자까지",
  },
  {
    key: "home.lead",
    group: "home",
    label: "소개문",
    usedAt: "홈 히어로 (HOME-04)",
    type: "lines",
    maxLength: 40,
    maxLines: 2,
    default: "프리다이빙 강사이자 AI 크리에이터, 이동규입니다.\n한 번의 호흡과 하나의 아이디어로 새로운 세계를 탐험합니다.",
    hint: "최대 2줄, 한 줄 40자까지",
  },
  {
    key: "films.title",
    group: "films",
    label: "Films 제목",
    usedAt: "Films 목록 제목, 홈 Films 구역 제목 (FILMS-01, HOME-24)",
    type: "lines",
    maxLength: 20,
    maxLines: 2,
    default: filmsConfig.title.join("\n"),
    hint: "최대 2줄, 한 줄 20자까지",
  },
  {
    key: "films.subtitle",
    group: "films",
    label: "Films 부제",
    usedAt: "Films 목록 제목 아래, 홈 Films 구역 (FILMS-01, HOME-24)",
    type: "text",
    maxLength: 100,
    default: filmsConfig.subtitle,
  },
  {
    key: "films.aiNotice",
    group: "films",
    label: "AI 제작 표기 문구",
    usedAt: "모든 작품 상세의 영상 바로 아래 (FILMD-13)",
    type: "text",
    maxLength: 100,
    default: filmsConfig.aiNotice,
    hint: "앞에 “AI 제작 ·”이 자동으로 붙습니다. 작품마다 끌 수 없습니다. 규강 님이 확정해 주세요.",
  },
  {
    key: "films.calloutTitle",
    group: "films",
    label: "AI 특강 소식 띠 제목",
    usedAt: "Films 목록·작품 상세 하단 (FILMS-09, FILMD-11)",
    type: "text",
    maxLength: 60,
    default: filmsConfig.callout.title,
  },
  {
    key: "films.calloutBody",
    group: "films",
    label: "AI 특강 소식 띠 안내문",
    usedAt: "Films 목록·작품 상세 하단 (FILMS-09, FILMD-11)",
    type: "text",
    maxLength: 200,
    default: filmsConfig.callout.body,
    hint: "버튼은 제목이 채워진 메일 창을 열 뿐이며, 서버에 저장하지 않습니다.",
  },
  {
    key: "contact.email",
    group: "contact",
    label: "연락 이메일",
    usedAt: "Contact 영역, 메일 링크 (CONTACT-02, 06)",
    type: "email",
    maxLength: 120,
    default: "contact@example.com",
    hint: "방문자가 문의를 보낼 주소입니다. 기본값은 시험용 주소라 실제 메일이 가지 않습니다.",
  },
  {
    key: "contact.intro",
    group: "contact",
    label: "Contact 안내문",
    usedAt: "Contact 영역 (CONTACT-03)",
    type: "lines",
    maxLength: 40,
    maxLines: 2,
    default: "프리다이빙 문의부터 새로운 크리에이티브 협업까지.\n당신의 이야기를 들려주세요.",
    hint: "최대 2줄, 한 줄 40자까지",
  },
  {
    key: "footer.owner",
    group: "footer",
    label: "푸터 이름 표기",
    usedAt: "푸터 저작권 줄 (GL-F2)",
    type: "text",
    maxLength: 40,
    default: "KYU · 이동규",
    hint: "연도는 자동으로 앞에 붙습니다.",
  },
  {
    key: "seo.title",
    group: "seo",
    label: "사이트 제목",
    usedAt: "검색 결과·브라우저 탭의 기본 제목 (홈)",
    type: "text",
    maxLength: 70,
    default: "KYU — Dive deeper. Create beyond.",
  },
  {
    key: "seo.description",
    group: "seo",
    label: "기본 설명",
    usedAt: "검색 결과·공유 미리보기의 기본 설명",
    type: "text",
    maxLength: 160,
    default: "이동규 KYU — 프리다이빙 강사이자 AI 크리에이터. 바다의 깊이와 상상의 가능성을 탐험합니다.",
  },
];

export const SETTINGS_BY_KEY: Record<string, SettingDef> = Object.fromEntries(SETTINGS.map((s) => [s.key, s]));

export type ResolvedSettings = Record<string, string>;

export function defaultSettings(): ResolvedSettings {
  return Object.fromEntries(SETTINGS.map((s) => [s.key, s.default]));
}

const EMAIL = /^[^\s@?&,;<>"']+@[^\s@?&,;<>"']+\.[^\s@?&,;<>"']+$/;

export type Validation = { ok: true; value: string } | { ok: false; error: string };

/** 입력값을 정리하고 검사한다. 빈 값은 "기본값으로 되돌리기"(value "")다 */
export function validateSetting(def: SettingDef, raw: string): Validation {
  const text = raw.replace(/\r\n/g, "\n");
  if (def.type === "lines") {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return { ok: true, value: "" };
    if (lines.length > (def.maxLines ?? 1)) return { ok: false, error: `${def.maxLines ?? 1}줄까지 쓸 수 있습니다.` };
    if (lines.some((l) => l.length > def.maxLength)) return { ok: false, error: `한 줄은 ${def.maxLength}자까지 쓸 수 있습니다.` };
    return { ok: true, value: lines.join("\n") };
  }
  const value = text.trim();
  if (!value) return { ok: true, value: "" };
  if (value.includes("\n")) return { ok: false, error: "줄바꿈 없이 한 줄로 입력해 주세요." };
  if (value.length > def.maxLength) return { ok: false, error: `${def.maxLength}자까지 쓸 수 있습니다.` };
  if (def.type === "email" && !EMAIL.test(value)) return { ok: false, error: "이메일 주소 형식이 올바르지 않습니다." };
  return { ok: true, value };
}

/**
 * 저장된 값과 기본값을 합친다. 저장된 값이 지금 규칙에 맞지 않으면(규칙이 바뀐 경우 등) 기본값을 쓴다.
 * 모르는 키는 무시한다.
 */
export function resolveSettings(stored: Record<string, string>): ResolvedSettings {
  const result = defaultSettings();
  for (const def of SETTINGS) {
    const value = stored[def.key];
    if (value === undefined) continue;
    const checked = validateSetting(def, value);
    if (checked.ok && checked.value) result[def.key] = checked.value;
  }
  return result;
}

/** 영문 슬로건을 히어로의 두 줄로 나눈다. 두 번째 줄의 마지막 단어가 강조 대상이다. 형식이 다르면 한 줄로 보여 준다 */
export function splitSlogan(slogan: string): { line1: string; line2Lead: string; accent: string } {
  const sentences = slogan.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length < 2) return { line1: slogan.trim(), line2Lead: "", accent: "" };
  const second = sentences.slice(1).join(" ");
  const words = second.split(" ");
  const accent = words.pop() ?? "";
  return { line1: sentences[0]!, line2Lead: words.join(" "), accent };
}
