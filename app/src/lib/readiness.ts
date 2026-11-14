/**
 * 공개 준비 점검 (어드민 대시보드 카드). 사이트를 공개하기 전에 끝나 있어야 하는 설정을 한눈에 보여 준다.
 * 순수 함수다 — 환경변수는 "있는지"만 보고 값은 읽지도 돌려주지도 않는다 (AGENTS §6). 화면 글에 비밀 값이 들어갈 길이 없다.
 */
import { BUILTIN_VERSION } from "@/settings/consent";
import { contactConfig } from "@/config/site";

export type ReadinessStatus = "todo" | "ok" | "info";

export interface ReadinessItem {
  id: string;
  label: string;
  status: ReadinessStatus;
  /** 지금 상태와 해야 할 일 (글자로만, 색에 기대지 않는다) */
  detail: string;
  /** 어드민 안에서 고칠 수 있으면 그 화면 */
  href?: string;
  /** 누가 하는 일인가: 어드민에서 직접(admin), Vercel 환경변수(vercel), 도메인(domain) */
  where: "admin" | "vercel" | "domain";
}

export interface ReadinessInput {
  /** 환경변수 사본 (process.env). 값은 읽지 않고 있는지·형식만 본다 */
  env: Record<string, string | undefined>;
  /** 사이트 설정에서 해석한 값 */
  settings: Record<string, string>;
  privacyPublished: boolean;
  /** 현재 예약 문의·소식 받기 동의 문구의 버전 표기 (BUILTIN_VERSION 이면 어드민에서 게시한 적이 없다) */
  consentVersions: { reservation: string; notice: string };
}

const has = (v: string | undefined, min = 1) => (v ?? "").trim().length >= min;

function hostOf(raw: string | undefined): string {
  try {
    return new URL((raw ?? "").trim()).hostname;
  } catch {
    return "";
  }
}

/** 예시·시험용 주소인가 (기본값 contact@example.com 등) */
function isPlaceholderEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return !domain || domain === "example.com" || domain.endsWith(".example") || domain === "example.org";
}

export function readinessChecks({ env, settings, privacyPublished, consentVersions }: ReadinessInput): ReadinessItem[] {
  const items: ReadinessItem[] = [];
  const contact = (settings["contact.email"] ?? contactConfig.email).trim();
  items.push(
    isPlaceholderEmail(contact)
      ? { id: "contact", label: "연락 이메일", status: "todo", detail: "아직 예시 주소입니다. 방문자가 보내는 메일이 닿지 않습니다. 사이트 설정 > 연락에서 실제 주소로 바꿔 주세요.", href: "/admin/settings", where: "admin" }
      : { id: "contact", label: "연락 이메일", status: "ok", detail: "실제 주소로 바뀌어 있습니다.", href: "/admin/settings", where: "admin" },
  );

  items.push(
    privacyPublished
      ? { id: "privacy", label: "개인정보 처리방침", status: "ok", detail: "게시되어 있습니다.", href: "/admin/legal", where: "admin" }
      : { id: "privacy", label: "개인정보 처리방침", status: "todo", detail: "아직 \"준비 중\" 화면입니다. 신청 폼이 열린 투어(모집 예정·모집 중)를 공개하기 전에 동의·방침에서 게시해 주세요.", href: "/admin/legal", where: "admin" },
  );

  const unpublished = (["reservation", "notice"] as const).filter((k) => consentVersions[k] === BUILTIN_VERSION);
  items.push(
    unpublished.length === 0
      ? { id: "consent", label: "동의 문구", status: "ok", detail: "예약 문의·소식 받기 문구가 모두 게시되어 있습니다.", href: "/admin/legal", where: "admin" }
      : {
          id: "consent",
          label: "동의 문구",
          status: "todo",
          detail: `${unpublished.map((k) => (k === "reservation" ? "예약 문의" : "소식 받기")).join("·")} 동의 문구가 기본 한 줄입니다. 수집 항목·보유 기간·거부할 권리가 담긴 문구를 게시해 주세요.`,
          href: "/admin/legal",
          where: "admin",
        },
  );

  const notifyTo = (settings["notify.email"] ?? "").trim();
  const mailKeys = has(env.RESEND_API_KEY) && has(env.MAIL_FROM);
  if (notifyTo && mailKeys) items.push({ id: "mail", label: "신청 알림 메일", status: "ok", detail: "수신 이메일과 발송 설정이 모두 있습니다. (Preview에서는 보내지 않고 운영에서만 갑니다.)", href: "/admin/settings", where: "admin" });
  else {
    const missing = [!notifyTo ? "알림 수신 이메일(사이트 설정 > 연락)" : "", !has(env.RESEND_API_KEY) ? "RESEND_API_KEY(Vercel)" : "", !has(env.MAIL_FROM) ? "MAIL_FROM(Vercel)" : ""].filter(Boolean);
    items.push({ id: "mail", label: "신청 알림 메일", status: "todo", detail: `새 신청이 와도 메일이 가지 않습니다. 빠진 것: ${missing.join(", ")}. 지금은 대시보드에서 직접 확인해야 합니다.`, href: !notifyTo ? "/admin/settings" : undefined, where: notifyTo ? "vercel" : "admin" });
  }

  const blob = env.MEDIA_STORE === "blob" && has(env.BLOB_READ_WRITE_TOKEN);
  items.push(
    blob
      ? { id: "media", label: "이미지 저장소", status: "ok", detail: "연결되어 있습니다.", href: "/admin/media", where: "vercel" }
      : { id: "media", label: "이미지 저장소", status: "todo", detail: "연결되지 않았습니다. 이미지를 올릴 수 없어 영상 포스터·투어 갤러리를 만들 수 없습니다. Vercel Blob 연결과 MEDIA_STORE=blob이 필요합니다.", href: "/admin/media", where: "vercel" },
  );

  items.push(
    has(env.CRON_SECRET, 16)
      ? { id: "cron", label: "예약 발행·휴지통 정리", status: "ok", detail: "CRON_SECRET이 있어 예약 발행과 자동 정리가 동작합니다.", where: "vercel" }
      : { id: "cron", label: "예약 발행·휴지통 정리", status: "todo", detail: "CRON_SECRET(16자 이상)이 없어 예약 발행과 휴지통 자동 정리가 동작하지 않습니다. 바로 발행은 문제없습니다.", where: "vercel" },
  );

  const host = hostOf(env.SITE_URL);
  const temporary = !host || host.endsWith(".vercel.app") || host === "localhost" || host === "127.0.0.1";
  items.push(
    temporary
      ? { id: "domain", label: "사이트 주소", status: "info", detail: `임시 주소(${host || "지정 안 됨"})를 쓰고 있습니다. 도메인을 연결한 뒤 SITE_URL을 실제 주소로 바꾸고 다시 배포해야 합니다.`, where: "domain" }
      : { id: "domain", label: "사이트 주소", status: "ok", detail: `${host} 로 설정되어 있습니다.`, where: "domain" },
  );

  const indexing = env.SITE_INDEXING === "on";
  items.push(
    indexing
      ? { id: "indexing", label: "검색 노출", status: temporary ? "todo" : "info", detail: temporary ? "검색 노출이 켜져 있는데 임시 주소입니다. 공개 전에는 SITE_INDEXING을 끄세요." : "검색엔진 노출이 켜져 있습니다(공개 상태).", where: "vercel" }
      : { id: "indexing", label: "검색 노출", status: "info", detail: `꺼져 있습니다(검색엔진에 노출되지 않음). 공개 직전에 SITE_INDEXING=on 으로 켭니다.`, where: "vercel" },
  );

  return items;
}

/** 해야 할 일이 남은 개수 (info 는 세지 않는다) */
export const todoCount = (items: ReadinessItem[]): number => items.filter((i) => i.status === "todo").length;
