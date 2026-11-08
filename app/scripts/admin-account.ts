/**
 * 어드민 계정 관리 (가입 화면이 없으므로 운영자가 서버에서 실행한다). ADMIN-DESIGN §4.2·§4.3.
 *
 *   npm run admin:create          # 새 관리자 (이메일·이름·비밀번호를 터미널에서 입력)
 *   npm run admin:reset-password  # 비밀번호 재설정 (기존 로그인 모두 해제)
 *   npm run admin:reset-2fa       # 2차 인증 초기화 (다음 로그인 때 다시 등록)
 *
 * - 비밀번호는 화면에 보이지 않게 입력받고, 인자·환경변수·로그로는 받지 않는다 (터미널에서만).
 * - 대상 DB 는 DATABASE_URL (.env.local) 이다. 어느 DB(dev/production)인지 실행 전에 확인한다.
 * - BETTER_AUTH_SECRET 이 필요하다 (32자 이상). 값은 출력하지 않는다.
 */
import { createInterface } from "node:readline/promises";
import { createAuth } from "../src/lib/auth/config";
import { createAdminAccount, resetAdminPassword, resetTwoFactor } from "../src/lib/auth/accounts";
import { getDb } from "../src/db/client";

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function promptHidden(label: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) fail("비밀번호는 터미널에서 직접 입력해야 합니다 (파이프·리다이렉트 불가).");
    process.stdout.write(label);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n" || ch === "\u0004") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          stdin.setRawMode(false);
          process.stdout.write("\n");
          process.exit(130);
        }
        if (ch === "\u007f") value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const command = process.argv[2];
  if (!["create", "reset-password", "reset-2fa"].includes(command ?? "")) fail("사용법: admin-account.ts create | reset-password | reset-2fa");

  const url = process.env.DATABASE_URL?.trim();
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!url) fail("DATABASE_URL 이 없습니다 (.env.local).");
  if (!secret || secret.length < 32) fail("BETTER_AUTH_SECRET 이 없거나 32자보다 짧습니다 (.env.local).");

  const host = new URL(url).hostname.split(".")[0];
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const confirm = (await rl.question(`대상 DB 호스트: ${host}\n계속할까요? (yes 입력) `)).trim();
  if (confirm !== "yes") fail("취소했습니다.");
  const email = (await rl.question("이메일: ")).trim();
  const name = command === "create" ? (await rl.question("표시 이름: ")).trim() : "";
  rl.close();

  const auth = createAuth({ db: getDb(url) as never, secret, baseURL: process.env.SITE_URL?.trim() || "http://localhost:3000", rateLimitEnabled: false });

  if (command === "reset-2fa") {
    await resetTwoFactor(auth, { email });
    process.stdout.write("2차 인증을 초기화했습니다. 다음 로그인 때 다시 등록해야 어드민을 열 수 있습니다.\n");
    return;
  }

  const password = await promptHidden(command === "create" ? "비밀번호 (12자 이상): " : "새 비밀번호 (12자 이상): ");
  const again = await promptHidden("비밀번호 확인: ");
  if (password !== again) fail("비밀번호가 일치하지 않습니다.");

  if (command === "create") {
    await createAdminAccount(auth, { email, name, password });
    process.stdout.write("계정을 만들었습니다. 첫 로그인 때 2차 인증(TOTP)을 등록해야 어드민을 열 수 있습니다.\n");
  } else {
    await resetAdminPassword(auth, { email, password });
    process.stdout.write("비밀번호를 바꿨고 기존 로그인을 모두 해제했습니다.\n");
  }
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    // 입력 검증 오류 문구만 보여 준다 (연결 문자열·비밀번호가 섞일 수 있는 원문은 출력하지 않는다)
    const known = error instanceof Error && error.name === "AppError";
    process.stderr.write(`${known ? (error as Error).message : "실패했습니다. 입력과 DB 연결을 확인해 주세요."}\n`);
    process.exit(1);
  },
);
