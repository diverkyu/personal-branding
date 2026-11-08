"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getAuth } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/config";
import { normalizeTwoFactorCode } from "@/lib/auth/policy";
import { enableTotp } from "@/lib/auth/twoFactor";
import { ADMIN_LOGIN, readSession, requireAdmin, requireSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

/**
 * 어드민 인증 서버 액션. 실패 문구는 어느 쪽이 틀렸는지 알려 주지 않는다 (SECURITY §2).
 * 로그에는 결과 종류만 남기고 이메일·비밀번호·코드는 남기지 않는다. redirect 는 try 밖에서 호출한다.
 */
export interface FormState {
  error?: string;
  /** 로그인 실패 뒤에도 이메일 칸이 비지 않게 돌려준다 (비밀번호는 돌려주지 않는다) */
  email?: string;
}

export interface SetupState extends FormState {
  /** 스캔용 QR(SVG)과 수동 입력용 키, 복구 코드. 한 번만 보여 준다 */
  qrSvg?: string;
  manualKey?: string;
  backupCodes?: string[];
}

const GENERIC_LOGIN_ERROR = "이메일 또는 비밀번호를 확인해 주세요.";
const LIMITED_ERROR = "시도가 너무 많습니다. 잠시 뒤에 다시 시도해 주세요.";
const NOT_CONFIGURED = "어드민이 아직 설정되지 않았습니다. 설정이 끝나면 사용할 수 있습니다.";
const CODE_ERROR = "코드가 맞지 않습니다. 다시 확인해 주세요.";

function isLimited(error: unknown): boolean {
  const e = error as { statusCode?: number; status?: string | number } | null;
  return e?.statusCode === 429 || e?.status === 429 || e?.status === "TOO_MANY_REQUESTS";
}

function text(formData: FormData, key: string, max = 256): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.slice(0, max) : "";
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const auth = getAuth();
  if (!auth) return { error: NOT_CONFIGURED };
  const email = text(formData, "email").trim().toLowerCase();
  const password = text(formData, "password", 128);
  if (!email || !password) return { error: GENERIC_LOGIN_ERROR, email };

  let needsTwoFactor = false;
  try {
    const response = await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
    needsTwoFactor = "twoFactorRedirect" in response && response.twoFactorRedirect === true;
    logger.info("admin.login", { outcome: needsTwoFactor ? "needs_two_factor" : "password_ok" });
  } catch (error) {
    if (isLimited(error)) {
      logger.warn("admin.login", { outcome: "rate_limited" });
      return { error: LIMITED_ERROR, email };
    }
    logger.warn("admin.login", { outcome: "denied" });
    return { error: GENERIC_LOGIN_ERROR, email };
  }
  redirect(needsTwoFactor ? "/admin/login/two-factor" : "/admin");
}

async function verifyCode(method: "totp" | "backup", code: string): Promise<FormState | null> {
  const auth = getAuth();
  if (!auth) return { error: NOT_CONFIGURED };
  const clean = normalizeTwoFactorCode(method, code);
  if (!clean) return { error: CODE_ERROR };
  try {
    const body = { code: clean, trustDevice: false };
    if (method === "totp") await auth.api.verifyTOTP({ body, headers: await headers() });
    else await auth.api.verifyBackupCode({ body, headers: await headers() });
    logger.info("admin.two_factor", { method, outcome: "success" });
    return null;
  } catch (error) {
    if (isLimited(error)) {
      logger.warn("admin.two_factor", { method, outcome: "rate_limited" });
      return { error: LIMITED_ERROR };
    }
    logger.warn("admin.two_factor", { method, outcome: "denied" });
    return { error: CODE_ERROR };
  }
}

export async function verifyTotpAction(_: FormState, formData: FormData): Promise<FormState> {
  const failed = await verifyCode("totp", text(formData, "code", 12));
  if (failed) return failed;
  redirect("/admin");
}

export async function verifyBackupAction(_: FormState, formData: FormData): Promise<FormState> {
  const failed = await verifyCode("backup", text(formData, "code", 24));
  if (failed) return failed;
  redirect("/admin");
}

/** 2차 인증 등록 1단계: 비밀번호를 다시 확인하고 QR·복구 코드를 만든다 */
export async function startTwoFactorAction(_: SetupState, formData: FormData): Promise<SetupState> {
  const auth = getAuth();
  if (!auth) return { error: NOT_CONFIGURED };
  const user = await requireSession();
  if (user.twoFactorEnabled) redirect("/admin");
  const password = text(formData, "password", 128);
  if (!password) return { error: "비밀번호를 입력해 주세요." };
  try {
    const result = await enableTotp(auth, { password, headers: await headers() });
    const qrSvg = await QRCode.toString(result.totpURI, { type: "svg", margin: 1, width: 192 });
    const manualKey = new URL(result.totpURI).searchParams.get("secret") ?? undefined;
    logger.info("admin.two_factor_setup", { outcome: "started" });
    return { qrSvg, manualKey, backupCodes: result.backupCodes };
  } catch (error) {
    logger.warn("admin.two_factor_setup", { outcome: isLimited(error) ? "rate_limited" : "denied" });
    return { error: isLimited(error) ? LIMITED_ERROR : "비밀번호를 확인해 주세요." };
  }
}

/** 2차 인증 등록 2단계: 인증 앱의 코드로 등록을 끝낸다 */
export async function confirmTwoFactorAction(_: FormState, formData: FormData): Promise<FormState> {
  const failed = await verifyCode("totp", text(formData, "code", 12));
  if (failed) return failed;
  redirect("/admin");
}

export async function changePasswordAction(_: FormState, formData: FormData): Promise<FormState & { done?: boolean }> {
  const auth = getAuth();
  if (!auth) return { error: NOT_CONFIGURED };
  await requireAdmin();
  const current = text(formData, "current", 128);
  const next = text(formData, "next", 128);
  const again = text(formData, "again", 128);
  if (!current || !next) return { error: "현재 비밀번호와 새 비밀번호를 입력해 주세요." };
  if (next.length < MIN_PASSWORD_LENGTH) return { error: `새 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` };
  if (next !== again) return { error: "새 비밀번호 확인이 일치하지 않습니다." };
  try {
    await auth.api.changePassword({ body: { currentPassword: current, newPassword: next, revokeOtherSessions: true }, headers: await headers() });
    logger.info("admin.password_change", { outcome: "success" });
    return { done: true };
  } catch (error) {
    logger.warn("admin.password_change", { outcome: isLimited(error) ? "rate_limited" : "denied" });
    return { error: isLimited(error) ? LIMITED_ERROR : "현재 비밀번호를 확인해 주세요." };
  }
}

export async function logoutAction(): Promise<void> {
  const auth = getAuth();
  const { session } = await readSession();
  if (auth && session) {
    try {
      await auth.api.signOut({ headers: await headers() });
      logger.info("admin.logout", { outcome: "success" });
    } catch {
      logger.warn("admin.logout", { outcome: "failed" });
    }
  }
  redirect(ADMIN_LOGIN);
}
