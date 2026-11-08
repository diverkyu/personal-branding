/** 클래스 이름을 이어 붙인다. 거짓 값(false, null, undefined, 빈 문자열)은 건너뛴다. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
