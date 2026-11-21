import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { inquiries } from "@/db/schema";
import { privacyConfig } from "@/config/privacy";
import type { AdminDb } from "./admin/db";
import { inquiryCutoff, purgeExpiredInquiries } from "./inquiryRetention";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-11-10T03:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);
let client: PGlite;
let db: AdminDb;

beforeAll(async () => {
  client = new PGlite();
  const d = drizzle({ client });
  await migrate(d, { migrationsFolder: path.resolve(__dirname, "../../drizzle") });
  db = d as unknown as AdminDb;
});
afterAll(async () => {
  await client.close();
});
beforeEach(async () => {
  await db.delete(inquiries);
});

async function put(name: string, kind: "reservation" | "notice", receivedDaysAgo: number, status = "new") {
  await db.insert(inquiries).values({
    kind,
    tourSlug: "sample-tour",
    name,
    email: "visitor@example.com",
    phone: kind === "reservation" ? "010-0000-0000" : null,
    people: kind === "reservation" ? 2 : null,
    consentAt: ago(receivedDaysAgo),
    consentVersion: "v1",
    receivedAt: ago(receivedDaysAgo),
    status,
  });
}
const names = async () => (await db.select({ name: inquiries.name }).from(inquiries)).map((r) => r.name).sort();

describe("보유 기간이 지난 신청 자동 삭제", () => {
  const days = privacyConfig.inquiryRetentionDays;

  it("기간이 지난 예약 문의·소식 받기만 지우고, 기간 안의 것은 남긴다", async () => {
    await put("오래된 예약", "reservation", days + 1);
    await put("오래된 소식", "notice", days + 30);
    await put("최근 예약", "reservation", days - 1);
    await put("최근 소식", "notice", 3);
    const summary = await purgeExpiredInquiries(db, NOW);
    expect(summary).toEqual({ reservations: 1, notices: 1 });
    expect(await names()).toEqual(["최근 소식", "최근 예약"]);
  });

  it("기준 시각 바로 안쪽은 남기고 바로 바깥은 지운다", async () => {
    await put("딱 기간", "reservation", days);
    await put("하루 넘음", "reservation", days + 1);
    await purgeExpiredInquiries(db, NOW);
    expect(await names()).toEqual(["딱 기간"]);
  });

  it("상태가 '확정'인 예약 문의는 기간이 지나도 지우지 않는다 (법무 확인 전)", async () => {
    await put("확정 예약", "reservation", days + 100, "confirmed");
    await put("취소 예약", "reservation", days + 100, "cancelled");
    await put("확인 예약", "reservation", days + 100, "checked");
    expect(await purgeExpiredInquiries(db, NOW)).toEqual({ reservations: 2, notices: 0 });
    expect(await names()).toEqual(["확정 예약"]);
  });

  it("소식 받기는 상태와 상관없이 기간이 지나면 지운다", async () => {
    await put("안내 완료 소식", "notice", days + 5, "notified");
    await put("신규 소식", "notice", days + 5, "new");
    expect(await purgeExpiredInquiries(db, NOW)).toEqual({ reservations: 0, notices: 2 });
    expect(await names()).toEqual([]);
  });

  it("지울 것이 없으면 0건이고, 비어 있는 표에서도 동작한다", async () => {
    expect(await purgeExpiredInquiries(db, NOW)).toEqual({ reservations: 0, notices: 0 });
    await put("최근", "notice", 1);
    expect(await purgeExpiredInquiries(db, NOW)).toEqual({ reservations: 0, notices: 0 });
    expect(await names()).toEqual(["최근"]);
  });

  it("보유 일수는 설정에서 오고(초안 365일), 기간을 직접 줄 수도 있다", async () => {
    expect(days).toBe(365);
    expect(inquiryCutoff(NOW).toISOString()).toBe(ago(365).toISOString());
    await put("31일 전", "notice", 31);
    expect(await purgeExpiredInquiries(db, NOW, 30)).toEqual({ reservations: 0, notices: 1 });
  });
});
