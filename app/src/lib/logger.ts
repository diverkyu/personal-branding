/**
 * 구조화 로거 — 프로젝트에서 로그를 남기는 유일한 모듈 (DEVELOPMENT.md §5).
 * - 한 줄 JSON 으로 출력한다. 호스팅의 로그 수집 방식이 정해지면 sink 만 바꾼다.
 * - 개인정보·비밀로 보이는 키는 값을 지우고 [REDACTED] 로 남긴다 (SECURITY.md §14).
 * - 이 파일만 eslint no-console 예외다. 다른 곳에서는 console.log 를 쓰지 않는다.
 */
import { randomUUID } from "node:crypto";
import { errorKindOf } from "./errors";

export type LogLevel = "error" | "warn" | "info" | "debug";

const ORDER: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };

/** 값이 로그에 남으면 안 되는 키 이름 (이름·연락처·이메일·본문·인증 정보) */
const SENSITIVE_KEY = /pass(word)?|token|secret|cookie|authorization|api[-_]?key|session|e[-_]?mail|phone|tel(ephone)?|name$|message|body|content|address/i;
const REDACTED = "[REDACTED]";
const MAX_DEPTH = 4;

export type LogContext = Record<string, unknown>;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[TRUNCATED]";
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (value && typeof value === "object" && !(value instanceof Error)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? REDACTED : redact(item, depth + 1),
      ]),
    );
  }
  return value;
}

export interface LoggerOptions {
  /** 한 줄(JSON 문자열)과 수준을 받는다. 기본은 표준 출력/오류 */
  sink?: (line: string, level: LogLevel) => void;
  level?: () => LogLevel;
  now?: () => number;
}

function defaultLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL;
  if (configured && configured in ORDER) return configured as LogLevel;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function defaultSink(line: string, level: LogLevel): void {
  (level === "error" || level === "warn" ? process.stderr : process.stdout).write(line + "\n");
}

export function createLogger(options: LoggerOptions = {}) {
  const sink = options.sink ?? defaultSink;
  const currentLevel = options.level ?? defaultLevel;
  const now = options.now ?? Date.now;

  function write(level: LogLevel, msg: string, context: LogContext = {}): void {
    if (ORDER[level] > ORDER[currentLevel()]) return;
    const entry = { time: new Date(now()).toISOString(), level, msg, ...(redact(context) as LogContext) };
    sink(JSON.stringify(entry), level);
  }

  return {
    error: (msg: string, context?: LogContext) => write("error", msg, context),
    warn: (msg: string, context?: LogContext) => write("warn", msg, context),
    info: (msg: string, context?: LogContext) => write("info", msg, context),
    debug: (msg: string, context?: LogContext) => write("debug", msg, context),

    /**
     * 핵심 조작 하나를 감싸 operationId, outcome, durationMs, errorKind 를 남긴다.
     * 오류는 삼키지 않고 다시 던진다 (원칙 6).
     */
    async operation<T>(
      operation: string,
      run: (ctx: { operationId: string }) => Promise<T> | T,
      context: LogContext & { operationId?: string } = {},
    ): Promise<T> {
      const operationId = context.operationId ?? randomUUID();
      const start = now();
      try {
        const result = await run({ operationId });
        write("info", operation, { ...context, operation, operationId, outcome: "success", durationMs: now() - start });
        return result;
      } catch (error) {
        write("error", operation, {
          ...context,
          operation,
          operationId,
          outcome: "failed",
          errorKind: errorKindOf(error),
          // 오류 종류(클래스 이름)만 남긴다. 메시지에는 연결 문자열·입력값이 섞일 수 있어 기록하지 않는다 (원인 구분용)
          errorType: error instanceof Error ? error.name : typeof error,
          durationMs: now() - start,
        });
        throw error;
      }
    },
  };
}

export const logger = createLogger();
