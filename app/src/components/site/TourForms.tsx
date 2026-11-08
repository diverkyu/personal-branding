"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitNotice, submitReservation } from "@/app/freediving/tours/[slug]/actions";
import { Button } from "@/components/ui/Button";
import { Checkbox, FormNotice, TextField, Textarea } from "@/components/ui/Field";
import { LIMITS } from "@/lib/forms/inquiry";
import { IDLE, type FormState } from "@/lib/forms/state";
import styles from "./TourInquiryCard.module.css";

const FAILED_TEXT = "전송하지 못했습니다. 잠시 후 다시 시도하거나 이메일로 문의해주세요.";

/** 허니팟 (TOUR-F08). 사람에게는 보이지 않고 보조기기에도 읽히지 않으며, 키보드로 닿지 않는다. 값이 있으면 서버가 차단한다. */
function Honeypot() {
  return (
    <div className={styles.honeypot} aria-hidden="true">
      <label>
        웹사이트
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

/** 오류가 생기면 첫 오류 필드로 포커스를 옮긴다 (INT-06) */
function useFocusFirstError(state: FormState, order: string[], idPrefix: string) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status !== "invalid" || !state.fieldErrors) return;
    const first = order.find((k) => state.fieldErrors?.[k]);
    if (first) ref.current?.querySelector<HTMLElement>(`#${idPrefix}-${first}`)?.focus();
  }, [state, order, idPrefix]);
  return ref;
}

const RESERVATION_ORDER = ["name", "phone", "email", "people", "experience", "message", "consent"];

/** 예약 문의 폼 (TOUR-F). 모집 중인 투어에만 나온다. */
export function ReservationForm({ slug, capacity }: { slug: string; capacity?: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitReservation.bind(null, slug), IDLE);
  const formRef = useFocusFirstError(state, RESERVATION_ORDER, "inq");
  const [count, setCount] = useState(0);
  const err = state.fieldErrors ?? {};
  const val = state.values ?? {};

  if (state.status === "success") {
    return <FormNotice kind="success">문의가 접수되었습니다. 확인 후 남겨주신 연락처로 답변드리겠습니다.</FormNotice>;
  }

  return (
    <form ref={formRef} action={action} className={styles.form} aria-label="예약 문의" noValidate>
      <TextField id="inq-name" name="name" label="이름" required autoComplete="name" maxLength={LIMITS.nameMax} defaultValue={val.name} error={err.name} />
      <TextField id="inq-phone" name="phone" type="tel" label="연락처" required autoComplete="tel" hint="숫자와 하이픈만 입력해주세요." defaultValue={val.phone} error={err.phone} />
      <TextField id="inq-email" name="email" type="email" label="이메일" required autoComplete="email" maxLength={LIMITS.emailMax} defaultValue={val.email} error={err.email} />
      <TextField
        id="inq-people"
        name="people"
        type="number"
        inputMode="numeric"
        label="인원"
        required
        min={LIMITS.peopleMin}
        max={capacity ? Math.min(capacity, LIMITS.peopleMax) : LIMITS.peopleMax}
        defaultValue={val.people}
        error={err.people}
      />
      <TextField id="inq-experience" name="experience" label="프리다이빙 경험·자격" maxLength={LIMITS.experienceMax} defaultValue={val.experience} error={err.experience} />
      <Textarea
        id="inq-message"
        name="message"
        label="문의 내용"
        maxLength={LIMITS.messageMax}
        hint={`${count} / ${LIMITS.messageMax}자`}
        defaultValue={val.message}
        error={err.message}
        onInput={(e) => setCount(e.currentTarget.value.length)}
      />
      <Checkbox id="inq-consent" name="consent" required label="개인정보 수집·이용에 동의합니다." error={err.consent} />
      <Honeypot />
      <Button type="submit" size="L" busy={pending} className={styles.submit}>
        예약 문의하기
      </Button>
      {state.status === "failed" ? <FormNotice kind="error">{FAILED_TEXT}</FormNotice> : null}
    </form>
  );
}

const NOTICE_ORDER = ["name", "email", "consent"];

/** 소식 받기 폼 (TOUR-N). 모집 예정인 투어에만 나온다. */
export function NoticeForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitNotice.bind(null, slug), IDLE);
  const formRef = useFocusFirstError(state, NOTICE_ORDER, "notify");
  const err = state.fieldErrors ?? {};
  const val = state.values ?? {};

  if (state.status === "success") {
    return <FormNotice kind="success">소식 신청이 접수되었습니다. 모집이 시작되면 안내해 드리겠습니다.</FormNotice>;
  }

  return (
    <form ref={formRef} action={action} className={styles.form} aria-label="소식 받기" noValidate>
      <TextField id="notify-name" name="name" label="이름" required autoComplete="name" maxLength={LIMITS.nameMax} defaultValue={val.name} error={err.name} />
      <TextField id="notify-email" name="email" type="email" label="이메일" required autoComplete="email" maxLength={LIMITS.emailMax} defaultValue={val.email} error={err.email} />
      <Checkbox id="notify-consent" name="consent" required label="이 투어의 모집이 시작되면 이메일로 안내를 받는 데 동의합니다." error={err.consent} />
      <Honeypot />
      <Button type="submit" size="M" busy={pending}>
        소식 받기
      </Button>
      {state.status === "failed" ? <FormNotice kind="error">{FAILED_TEXT}</FormNotice> : null}
    </form>
  );
}
