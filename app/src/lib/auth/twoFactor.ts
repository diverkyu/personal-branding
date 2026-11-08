import { AppError } from "@/lib/errors";
import type { AuthInstance } from "./config";

/** TOTP 등록을 시작한다 (비밀번호 재확인). 인증 앱용 URI 와 복구 코드를 돌려준다. 코드를 확인(verifyTOTP)하기 전에는 활성화되지 않는다. */
export async function enableTotp(auth: AuthInstance, input: { password: string; headers: Headers }): Promise<{ totpURI: string; backupCodes: string[] }> {
  const result = await auth.api.enableTwoFactor({ body: { password: input.password }, headers: input.headers });
  if (!("totpURI" in result)) throw new AppError("external", "TOTP 방식이 아닙니다.");
  return { totpURI: result.totpURI, backupCodes: result.backupCodes };
}
