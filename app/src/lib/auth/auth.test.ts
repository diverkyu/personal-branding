import { PGlite } from "@electric-sql/pglite";
import { createHmac } from "node:crypto";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createAdminAccount, resetAdminPassword, resetTwoFactor } from "./accounts";
import { createAuth, SESSION_MAX_SECONDS, type AuthInstance } from "./config";
import { evaluateAdminAccess, normalizeTwoFactorCode } from "./policy";
import { enableTotp } from "./twoFactor";

/**
 * 실제 Better Auth + 실제 마이그레이션(PGlite)으로 인증 흐름을 시험한다. 가상 계정만 쓴다.
 * 시험 환경이라 Next.js 쿠키 플러그인은 쓰지 않고, 쿠키를 직접 전달한다.
 */
// 비밀번호 해시(scrypt)가 연속되는 시험이라 제한 시간을 넉넉히 둔다
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const SECRET = "test-secret-test-secret-test-secret-0123456789";
const BASE = "http://localhost:3000";
const EMAIL = "admin-test@example.com";
const PASSWORD = "correct-horse-battery-1";

let client: PGlite;
let auth: AuthInstance;
let limited: AuthInstance;

beforeAll(async () => {
  client = new PGlite();
  const db = drizzle({ client });
  await migrate(db, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  auth = createAuth({ db: db as never, secret: SECRET, baseURL: BASE, secureCookies: false, rateLimitEnabled: false });
  limited = createAuth({ db: db as never, secret: SECRET, baseURL: BASE, secureCookies: false, rateLimitEnabled: true });
  await createAdminAccount(auth, { email: EMAIL, name: "시험 관리자", password: PASSWORD });
});

afterAll(async () => {
  await client.close();
});

function cookiesFrom(headers: Headers): string {
  return headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of input.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function totp(uri: string, atMs = Date.now()): string {
  const secret = base32Decode(new URL(uri).searchParams.get("secret") ?? "");
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(atMs / 1000 / 30)));
  const h = createHmac("sha1", secret).update(counter).digest();
  const off = h[h.length - 1]! & 0xf;
  const n = ((h[off]! & 0x7f) << 24) | (h[off + 1]! << 16) | (h[off + 2]! << 8) | h[off + 3]!;
  return String(n % 1_000_000).padStart(6, "0");
}

async function signIn(instance: AuthInstance, password: string, ip = "10.0.0.1") {
  return instance.api.signInEmail({
    body: { email: EMAIL, password },
    headers: new Headers({ "x-forwarded-for": ip }),
    returnHeaders: true,
    asResponse: false,
  });
}

describe("어드민 인증 (Better Auth + PGlite)", () => {
  it("공개 가입은 막혀 있다", async () => {
    await expect(
      auth.api.signUpEmail({ body: { email: "intruder@example.com", password: "another-long-password-1", name: "침입자" } }),
    ).rejects.toThrow();
    const ctx = await auth.$context;
    expect(await ctx.internalAdapter.findUserByEmail("intruder@example.com")).toBeNull();
  });

  it("틀린 비밀번호와 없는 계정은 같은 방식으로 거부된다", async () => {
    const wrong = await signIn(auth, "wrong-password-123").catch((e) => e);
    const missing = await auth.api
      .signInEmail({ body: { email: "nobody@example.com", password: "wrong-password-123" } })
      .catch((e) => e);
    expect(wrong).toBeInstanceOf(Error);
    expect(missing).toBeInstanceOf(Error);
    expect(String(wrong.body?.message ?? wrong.message)).toBe(String(missing.body?.message ?? missing.message));
  });

  it("2차 인증 등록 전에는 세션이 있어도 어드민을 열 수 없다", async () => {
    const { headers, response } = await signIn(auth, PASSWORD);
    expect("twoFactorRedirect" in response).toBe(false);
    const cookie = cookiesFrom(headers);
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(session).not.toBeNull();
    expect(evaluateAdminAccess(session)).toBe("needs_two_factor");
  });

  it("TOTP를 등록하면 다음 로그인부터 2차 인증을 요구하고, 세션은 8시간이다", async () => {
    const first = await signIn(auth, PASSWORD);
    const cookie = cookiesFrom(first.headers);
    const enabled = await enableTotp(auth, { password: PASSWORD, headers: new Headers({ cookie }) });
    expect(enabled.totpURI).toContain("otpauth://totp/");
    expect(enabled.backupCodes.length).toBeGreaterThanOrEqual(8);
    const verify = await auth.api.verifyTOTP({
      body: { code: totp(enabled.totpURI), trustDevice: false },
      headers: new Headers({ cookie }),
      returnHeaders: true,
    });
    expect(verify.response.token).toBeTruthy();

    const again = await signIn(auth, PASSWORD);
    expect("twoFactorRedirect" in again.response && again.response.twoFactorRedirect).toBe(true);
    // 2차 인증을 마치기 전에는 세션이 없다
    const before = await auth.api.getSession({ headers: new Headers({ cookie: cookiesFrom(again.headers) }) });
    expect(before).toBeNull();

    const done = await auth.api.verifyTOTP({
      body: { code: totp(enabled.totpURI), trustDevice: false },
      headers: new Headers({ cookie: cookiesFrom(again.headers) }),
      returnHeaders: true,
    });
    const session = await auth.api.getSession({ headers: new Headers({ cookie: cookiesFrom(done.headers) }) });
    expect(evaluateAdminAccess(session)).toBe("ok");
    const lifetime = new Date(session!.session.expiresAt).getTime() - new Date(session!.session.createdAt).getTime();
    expect(Math.abs(lifetime - SESSION_MAX_SECONDS * 1000)).toBeLessThan(5000);

    // 복구 코드는 한 번만 쓸 수 있다
    const code = enabled.backupCodes[0]!;
    const third = await signIn(auth, PASSWORD);
    const viaBackup = await auth.api.verifyBackupCode({
      body: { code, trustDevice: false },
      headers: new Headers({ cookie: cookiesFrom(third.headers) }),
      returnHeaders: true,
    });
    expect(viaBackup.response.token).toBeTruthy();
    const fourth = await signIn(auth, PASSWORD);
    await expect(
      auth.api.verifyBackupCode({ body: { code }, headers: new Headers({ cookie: cookiesFrom(fourth.headers) }) }),
    ).rejects.toThrow();
  });

  it("로그아웃하면 이전 세션 쿠키로 접근할 수 없다 (SEC-11)", async () => {
    // 2차 인증이 등록된 뒤라 계정을 새로 만들어 격리한다
    const email = "logout-test@example.com";
    await createAdminAccount(auth, { email, name: "로그아웃 시험", password: PASSWORD });
    const login = await auth.api.signInEmail({ body: { email, password: PASSWORD }, returnHeaders: true });
    const cookie = cookiesFrom(login.headers);
    expect(await auth.api.getSession({ headers: new Headers({ cookie }) })).not.toBeNull();
    await auth.api.signOut({ headers: new Headers({ cookie }) });
    expect(await auth.api.getSession({ headers: new Headers({ cookie }) })).toBeNull();
  });

  it("비밀번호를 재설정하면 기존 세션이 폐기되고 새 비밀번호로만 로그인된다", async () => {
    const email = "reset-test@example.com";
    await createAdminAccount(auth, { email, name: "재설정 시험", password: PASSWORD });
    const login = await auth.api.signInEmail({ body: { email, password: PASSWORD }, returnHeaders: true });
    const cookie = cookiesFrom(login.headers);
    await resetAdminPassword(auth, { email, password: "brand-new-password-9" });
    expect(await auth.api.getSession({ headers: new Headers({ cookie }) })).toBeNull();
    await expect(auth.api.signInEmail({ body: { email, password: PASSWORD } })).rejects.toThrow();
    await expect(auth.api.signInEmail({ body: { email, password: "brand-new-password-9" } })).resolves.toBeTruthy();
  });

  it("2차 인증을 초기화하면 다시 등록해야 어드민을 열 수 있다", async () => {
    const email = "tf-reset@example.com";
    await createAdminAccount(auth, { email, name: "초기화 시험", password: PASSWORD });
    const login = await auth.api.signInEmail({ body: { email, password: PASSWORD }, returnHeaders: true });
    const cookie = cookiesFrom(login.headers);
    const enabled = await enableTotp(auth, { password: PASSWORD, headers: new Headers({ cookie }) });
    await auth.api.verifyTOTP({ body: { code: totp(enabled.totpURI) }, headers: new Headers({ cookie }) });
    await resetTwoFactor(auth, { email });
    const relogin = await auth.api.signInEmail({ body: { email, password: PASSWORD }, returnHeaders: true });
    expect("twoFactorRedirect" in relogin.response).toBe(false);
    const session = await auth.api.getSession({ headers: new Headers({ cookie: cookiesFrom(relogin.headers) }) });
    expect(evaluateAdminAccess(session)).toBe("needs_two_factor");
  });

  it("로그인을 반복해서 틀리면 시도가 제한된다 (10분에 5회)", async () => {
    const attempt = (ip: string, password: string) =>
      limited.handler(
        new Request(`${BASE}/api/auth/sign-in/email`, {
          method: "POST",
          headers: { "content-type": "application/json", origin: BASE, "x-forwarded-for": ip },
          body: JSON.stringify({ email: EMAIL, password }),
        }),
      );
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await attempt("10.9.9.9", "wrong-password-123")).status);
    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(5)).toEqual([429, 429]);
    // 다른 접속 주소는 영향을 받지 않는다
    expect((await attempt("10.8.8.8", "wrong-password-123")).status).toBe(401);
  });

  it("계정 생성은 짧은 비밀번호와 잘못된 이메일을 거부한다", async () => {
    await expect(createAdminAccount(auth, { email: "a@example.com", name: "x", password: "short" })).rejects.toThrow();
    await expect(createAdminAccount(auth, { email: "not-an-email", name: "x", password: PASSWORD })).rejects.toThrow();
    await expect(createAdminAccount(auth, { email: EMAIL, name: "중복", password: PASSWORD })).rejects.toThrow("이미 있는 계정");
  });
});

describe("evaluateAdminAccess", () => {
  const user = (twoFactorEnabled: boolean | null) => ({ id: "u", twoFactorEnabled });
  const future = new Date(Date.now() + 60_000);
  it("세션 없음·만료·2차 인증 미등록·정상을 구분한다", () => {
    expect(evaluateAdminAccess(null)).toBe("no_session");
    expect(evaluateAdminAccess({ user: user(true), session: { expiresAt: new Date(Date.now() - 1) } })).toBe("expired");
    expect(evaluateAdminAccess({ user: user(false), session: { expiresAt: future } })).toBe("needs_two_factor");
    expect(evaluateAdminAccess({ user: user(null), session: { expiresAt: future } })).toBe("needs_two_factor");
    expect(evaluateAdminAccess({ user: user(true), session: { expiresAt: future } })).toBe("ok");
  });
});

describe("normalizeTwoFactorCode", () => {
  it("TOTP 는 공백·하이픈을 지우고, 복구 코드는 하이픈을 지키며 앞뒤 공백만 지운다", () => {
    expect(normalizeTwoFactorCode("totp", " 123 456 ")).toBe("123456");
    expect(normalizeTwoFactorCode("totp", "123-456")).toBe("123456");
    expect(normalizeTwoFactorCode("backup", "  abcde-12345 ")).toBe("abcde-12345");
  });
});
