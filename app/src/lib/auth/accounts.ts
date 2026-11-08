/**
 * 관리자 계정 관리 (운영자가 서버에서 스크립트로 실행한다). 가입 화면은 없다 (ADMIN-DESIGN §4.2·§4.3).
 * 비밀번호는 이 함수가 받아 해시로만 저장한다. 값은 로그·오류 메시지에 쓰지 않는다.
 */
import { AppError } from "@/lib/errors";
import { MIN_PASSWORD_LENGTH, type AuthInstance } from "./config";

export interface NewAdmin {
  email: string;
  name: string;
  password: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkPassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) throw new AppError("validation", `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
  if (password.length > 128) throw new AppError("validation", "비밀번호는 128자 이하여야 합니다.");
}

function normalizeEmail(email: string): string {
  const value = email.trim().toLowerCase();
  if (!EMAIL.test(value)) throw new AppError("validation", "이메일 형식이 올바르지 않습니다.");
  return value;
}

export async function createAdminAccount(auth: AuthInstance, input: NewAdmin): Promise<{ userId: string }> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  if (!name || name.length > 40) throw new AppError("validation", "표시 이름은 1~40자여야 합니다.");
  checkPassword(input.password);
  const ctx = await auth.$context;
  if (await ctx.internalAdapter.findUserByEmail(email)) throw new AppError("validation", "이미 있는 계정입니다.");
  const hash = await ctx.password.hash(input.password);
  const user = await ctx.internalAdapter.createUser({ email, name, emailVerified: true }, {} as never);
  await ctx.internalAdapter.linkAccount({ userId: user.id, providerId: "credential", accountId: user.id, password: hash });
  return { userId: user.id };
}

/** 비밀번호를 새로 정하고 기존 세션을 모두 폐기한다 */
export async function resetAdminPassword(auth: AuthInstance, input: { email: string; password: string }): Promise<void> {
  const email = normalizeEmail(input.email);
  checkPassword(input.password);
  const ctx = await auth.$context;
  const found = await ctx.internalAdapter.findUserByEmail(email);
  if (!found) throw new AppError("not_found", "계정을 찾을 수 없습니다.");
  await ctx.internalAdapter.updatePassword(found.user.id, await ctx.password.hash(input.password));
  await ctx.adapter.deleteMany({ model: "session", where: [{ field: "userId", value: found.user.id }] });
}

/** 2차 인증을 초기화한다 (기기·복구 코드를 모두 잃은 경우). 다음 로그인 때 다시 등록해야 어드민을 열 수 있다 */
export async function resetTwoFactor(auth: AuthInstance, input: { email: string }): Promise<void> {
  const email = normalizeEmail(input.email);
  const ctx = await auth.$context;
  const found = await ctx.internalAdapter.findUserByEmail(email);
  if (!found) throw new AppError("not_found", "계정을 찾을 수 없습니다.");
  await ctx.adapter.deleteMany({ model: "twoFactor", where: [{ field: "userId", value: found.user.id }] });
  await ctx.internalAdapter.updateUser(found.user.id, { twoFactorEnabled: false } as never);
  await ctx.adapter.deleteMany({ model: "session", where: [{ field: "userId", value: found.user.id }] });
}
