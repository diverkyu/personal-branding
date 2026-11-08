/** 폼 제출 결과. 서버 액션이 돌려주고 폼이 화면에 반영한다 (SCREEN-SPEC INT-06). */
export type FormStatus = "idle" | "invalid" | "success" | "failed";

export interface FormState {
  status: FormStatus;
  /** 필드 이름 → 오류 문구 (status 가 invalid 일 때) */
  fieldErrors?: Record<string, string>;
  /** 오류 때 다시 채울 입력값 (동의·허니팟 제외) */
  values?: Record<string, string>;
}

export const IDLE: FormState = { status: "idle" };
