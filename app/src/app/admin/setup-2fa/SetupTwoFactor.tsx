"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { confirmTwoFactorAction, logoutAction, startTwoFactorAction, type FormState, type SetupState } from "../actions";
import styles from "../admin.module.css";

export function SetupTwoFactor() {
  const [started, start, starting] = useActionState<SetupState, FormData>(startTwoFactorAction, {});
  const [confirmed, confirm, confirming] = useActionState<FormState, FormData>(confirmTwoFactorAction, {});

  if (!started.qrSvg) {
    return (
      <>
        <form action={start} className={styles.form} noValidate>
          {started.error ? (
            <p role="alert" className={styles.alert}>
              {started.error}
            </p>
          ) : null}
          <TextField id="password" name="password" type="password" label="비밀번호 확인" autoComplete="current-password" required surface="light" hint="안전을 위해 비밀번호를 한 번 더 확인합니다." />
          <Button type="submit" busy={starting} variant="dark" surface="light">
            {starting ? "준비 중" : "등록 시작"}
          </Button>
        </form>
        {/* 폼 안에 폼을 넣을 수 없으므로 로그아웃은 별도 폼이다 */}
        <form action={logoutAction}>
          <button type="submit" className={styles.linkButton}>
            로그아웃
          </button>
        </form>
      </>
    );
  }

  return (
    <div className={styles.form}>
      <p className={styles.note}>1. 인증 앱(예: Google Authenticator, 1Password)에서 QR 코드를 스캔합니다.</p>
      {/* QR 은 서버가 이 계정의 일회성 URI 로 만든 SVG 다 */}
      <div className={styles.qr} role="img" aria-label="인증 앱에 등록할 QR 코드" dangerouslySetInnerHTML={{ __html: started.qrSvg }} />
      <p className={styles.note}>
        스캔할 수 없으면 앱에 키를 직접 입력합니다: <span className={styles.key}>{started.manualKey}</span>
      </p>
      <p className={styles.note}>2. 복구 코드를 안전한 곳에 보관합니다. 인증 앱을 잃어버렸을 때 한 번씩만 쓸 수 있고, 이 화면을 닫으면 다시 볼 수 없습니다.</p>
      <ul className={styles.codes} aria-label="복구 코드">
        {started.backupCodes?.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <form action={confirm} className={styles.form} noValidate>
        {confirmed.error ? (
          <p role="alert" className={styles.alert}>
            {confirmed.error}
          </p>
        ) : null}
        <TextField id="code" name="code" label="3. 앱에 표시된 6자리 코드" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required surface="light" />
        <Button type="submit" busy={confirming} variant="dark" surface="light">
          {confirming ? "확인 중" : "등록 완료"}
        </Button>
      </form>
    </div>
  );
}
