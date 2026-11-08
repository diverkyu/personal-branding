import { Button } from "@/components/ui/Button";
import { Checkbox, FormNotice, TextField, Textarea } from "@/components/ui/Field";
import type { TourStatus } from "@/types/content";
import styles from "./TourInquiryCard.module.css";

/**
 * 예약 문의 카드 (SCREEN-SPEC §5.7.1) — 투어 상태에 따라 4가지.
 * 4단계에서는 화면 틀만 있다: 폼은 서버에 연결되지 않았고 제출 버튼은 비활성이다 (접수·검증·스팸 방지는 폼 단계에서 구현).
 */
export function TourInquiryCard({ status }: { status: TourStatus }) {
  if (status === "ended") return null;

  if (status === "closed") {
    return (
      <section className={styles.card} aria-labelledby="inquiry-title">
        <h2 id="inquiry-title" className={styles.title}>
          예약 문의
        </h2>
        <p>이번 투어는 마감되었습니다.</p>
        <Button href="/contact" variant="outline" size="M" icon="arrow-up-right">
          다음 투어 문의하기
        </Button>
      </section>
    );
  }

  if (status === "upcoming") {
    return (
      <section className={styles.card} aria-labelledby="inquiry-title">
        <h2 id="inquiry-title" className={styles.title}>
          예약 문의
        </h2>
        <p>모집이 시작되면 안내해 드립니다.</p>
        <form className={styles.form} aria-label="소식 받기">
          <TextField id="notify-name" name="name" label="이름" required autoComplete="name" />
          <TextField id="notify-email" name="email" type="email" label="이메일" required autoComplete="email" />
          <Checkbox id="notify-consent" name="consent" required label="이 투어의 모집이 시작되면 이메일로 안내를 받는 데 동의합니다." />
          <Button type="button" size="M" disabled>
            소식 받기
          </Button>
          <FormNotice>접수 기능은 아직 연결되지 않았습니다.</FormNotice>
        </form>
      </section>
    );
  }

  return (
    <section className={styles.card} aria-labelledby="inquiry-title">
      <h2 id="inquiry-title" className={styles.title}>
        예약 문의
      </h2>
      <p>결제나 확정은 아닙니다. 남겨주신 내용을 확인한 뒤 연락처로 답변드립니다.</p>
      <form className={styles.form} aria-label="예약 문의">
        <TextField id="inq-name" name="name" label="이름" required autoComplete="name" maxLength={40} />
        <TextField id="inq-phone" name="phone" type="tel" label="연락처" required autoComplete="tel" hint="숫자와 하이픈만 입력해주세요." />
        <TextField id="inq-email" name="email" type="email" label="이메일" required autoComplete="email" maxLength={100} />
        <TextField id="inq-people" name="people" type="number" label="인원" required min={1} max={10} />
        <TextField id="inq-experience" name="experience" label="프리다이빙 경험·자격" maxLength={100} />
        <Textarea id="inq-message" name="message" label="문의 내용" maxLength={1000} />
        <Checkbox id="inq-consent" name="consent" required label="개인정보 수집·이용에 동의합니다." />
        <Button type="button" size="L" disabled>
          예약 문의하기
        </Button>
        <FormNotice>접수 기능은 아직 연결되지 않았습니다.</FormNotice>
      </form>
    </section>
  );
}
