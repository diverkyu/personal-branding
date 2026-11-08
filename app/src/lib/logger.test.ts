import { describe, expect, it } from "vitest";
import { AppError } from "./errors";
import { createLogger, redact, type LogLevel } from "./logger";

function capture(level: LogLevel = "debug") {
  const lines: { level: LogLevel; entry: Record<string, unknown> }[] = [];
  const log = createLogger({
    level: () => level,
    now: (() => {
      let t = 1_000;
      return () => (t += 5);
    })(),
    sink: (line, l) => lines.push({ level: l, entry: JSON.parse(line) }),
  });
  return { log, lines };
}

describe("logger", () => {
  it("수준 아래의 로그는 출력하지 않는다", () => {
    const { log, lines } = capture("warn");
    log.debug("d");
    log.info("i");
    log.warn("w");
    log.error("e");
    expect(lines.map((l) => l.level)).toEqual(["warn", "error"]);
  });

  it("한 줄 JSON 에 시간·수준·메시지를 담는다", () => {
    const { log, lines } = capture();
    log.info("saved", { target: "story-1" });
    expect(lines[0]?.entry).toMatchObject({ level: "info", msg: "saved", target: "story-1" });
    expect(typeof lines[0]?.entry.time).toBe("string");
  });

  it("개인정보와 비밀로 보이는 키는 값을 지운다 (중첩 포함)", () => {
    const { log, lines } = capture();
    log.info("inquiry", {
      tourId: "t1",
      applicantName: "홍길동",
      email: "a@b.c",
      phone: "010-0000-0000",
      message: "문의 본문",
      nested: { password: "x", token: "y", ok: 1 },
      list: [{ cookie: "z", id: 2 }],
    });
    const entry = JSON.stringify(lines[0]?.entry);
    expect(entry).not.toMatch(/홍길동|a@b\.c|010-0000|문의 본문|"x"|"y"|"z"/);
    expect(lines[0]?.entry).toMatchObject({ tourId: "t1", nested: { ok: 1 } });
  });

  it("redact 는 깊이를 제한한다", () => {
    const deep = { a: { b: { c: { d: { e: { f: 1 } } } } } };
    expect(JSON.stringify(redact(deep))).toContain("[TRUNCATED]");
  });

  describe("operation", () => {
    it("성공하면 operationId, outcome, durationMs 를 남기고 결과를 돌려준다", async () => {
      const { log, lines } = capture();
      const result = await log.operation("story.publish", async () => 42, { target: "s1" });
      expect(result).toBe(42);
      expect(lines[0]?.entry).toMatchObject({ operation: "story.publish", outcome: "success", target: "s1" });
      expect(typeof lines[0]?.entry.operationId).toBe("string");
      expect(typeof lines[0]?.entry.durationMs).toBe("number");
    });

    it("실패하면 errorKind 를 남기고 오류를 다시 던진다", async () => {
      const { log, lines } = capture();
      await expect(
        log.operation("inquiry.submit", () => {
          throw new AppError("validation", "형식 오류");
        }),
      ).rejects.toThrow("형식 오류");
      expect(lines[0]?.level).toBe("error");
      expect(lines[0]?.entry).toMatchObject({ outcome: "failed", errorKind: "validation" });
    });

    it("알 수 없는 오류의 errorKind 는 unknown 이다", async () => {
      const { log, lines } = capture();
      await expect(
        log.operation("x", () => {
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
      expect(lines[0]?.entry).toMatchObject({ errorKind: "unknown" });
    });

    it("전달받은 operationId 를 그대로 쓴다", async () => {
      const { log, lines } = capture();
      await log.operation("x", ({ operationId }) => operationId, { operationId: "op-1" });
      expect(lines[0]?.entry.operationId).toBe("op-1");
    });
  });
});
