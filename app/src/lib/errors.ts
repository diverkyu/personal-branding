/** 오류 종류. 로그의 errorKind 와 사용자 안내 문구를 가르는 기준이다 (DEVELOPMENT.md §5, §6). */
export type ErrorKind = "validation" | "permission" | "not_found" | "external" | "unknown";

export class AppError extends Error {
  constructor(
    public readonly kind: ErrorKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AppError";
  }
}

export function errorKindOf(error: unknown): ErrorKind {
  return error instanceof AppError ? error.kind : "unknown";
}
