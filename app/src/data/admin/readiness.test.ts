import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { inquiries } from "@/db/schema";
import { BUILTIN_VERSION } from "@/settings/consent";
import type { AdminSession } from "@/lib/auth/types";
import type { AdminDb } from "./db";
import { loadReadiness } from "./readiness";
import { publishConsentVersion } from "./settings";
import { inquiryUsage } from "./inquiries";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const admin: AdminSession = { userId: "admin-1", name: "시험 관리자", email: "admin@example.com" };
let client: PGlite;
let db: AdminDb;

beforeAll(async () => {
  client = new PGlite();
  const d = drizzle({ client });
  await migrate(d, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  db = d as unknown as AdminDb;
});
afterAll(async () => {
  await client.close();
});

const status = (items: Awaited<ReturnType<typeof loadReadiness>>, id: string) => items.find((i) => i.id === id)?.status;

describe("loadReadiness (DB)", () => {
  it("아무것도 게시하지 않은 DB 에서는 방침·동의 문구가 해야 할 일이고, 게시하면 완료로 바뀐다", async () => {
    // 폼이 열린 투어도, 받은 신청도 없으면 방침·동의 문구는 참고다("폼 없이 시작")
    expect(await inquiryUsage(db, admin)).toEqual({ formOpenTours: 0, received: 0, inUse: false });
    const quiet = await loadReadiness(db, admin, {});
    expect(status(quiet, "privacy")).toBe("info");
    expect(status(quiet, "consent")).toBe("info");

    // 받은 신청이 하나라도 있으면 쓰는 중이다 → 필수로 바뀐다
    await db.insert(inquiries).values({ kind: "notice", tourSlug: "t", name: "가상", email: "a@example.com", consentAt: new Date(), consentVersion: "notice:0" });
    expect((await inquiryUsage(db, admin)).inUse).toBe(true);
    const before = await loadReadiness(db, admin, {});
    expect(status(before, "privacy")).toBe("todo");
    expect(status(before, "consent")).toBe("todo");

    await publishConsentVersion(db, admin, "privacy", "개인정보 처리방침 시험 본문입니다.");
    await publishConsentVersion(db, admin, "reservation", "시험용 예약 동의 문구");
    const half = await loadReadiness(db, admin, {});
    expect(status(half, "privacy")).toBe("ok");
    expect(status(half, "consent")).toBe("todo"); // 소식 받기는 아직 기본 문구

    await publishConsentVersion(db, admin, "notice", "시험용 소식 동의 문구");
    expect(status(await loadReadiness(db, admin, {}), "consent")).toBe("ok");
    expect(BUILTIN_VERSION).toBeTruthy();
  });
});
