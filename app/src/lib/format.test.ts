import { describe, expect, it } from "vitest";
import { formatDate, formatDateTimeKst, formatPeriod } from "./format";

describe("날짜 표기", () => {
  it("날짜를 2026.11.08 로 쓴다", () => {
    expect(formatDate("2026-11-08")).toBe("2026.11.08");
  });

  it("같은 해 기간은 끝을 월.일로, 해가 다르면 전체를 쓴다", () => {
    expect(formatPeriod("2026-11-08", "2026-11-10")).toBe("2026.11.08 – 11.10");
    expect(formatPeriod("2026-11-28", "2026-12-02")).toBe("2026.11.28 – 12.02");
    expect(formatPeriod("2026-12-30", "2027-01-02")).toBe("2026.12.30 – 2027.01.02");
    expect(formatPeriod("2026-11-08", "2026-11-08")).toBe("2026.11.08");
  });

  it("형식이 틀리면 오류를 낸다", () => {
    expect(() => formatDate("2026/11/08")).toThrow();
  });
});

describe('formatDateTimeKst', () => {
  it('한국 시간(UTC+9)으로 표기한다', () => {
    expect(formatDateTimeKst('2026-11-08T03:05:00Z')).toBe('2026.11.08 12:05');
    expect(formatDateTimeKst(new Date('2026-11-04T16:00:00Z'))).toBe('2026.11.05 01:00');
  });
});
