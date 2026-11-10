import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inquiries } from "@/db/schema";
import { CONSENT_VERSION } from "@/lib/forms/inquiry";
import { createPostgresInquiryStore } from "./postgresInquiryStore";

/**
 * 실제 Postgres 엔진(PGlite, 메모리)에 **실제 마이그레이션 SQL**을 적용해 저장 어댑터를 시험한다.
 * Neon 계정 없이 SQL·제약·인덱스·값 변환을 검증하지만, Neon 서버와의 연결 자체(네트워크·인증)는 이 시험의 범위 밖이다.
 */
let client: PGlite;
let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
  client = new PGlite();
  db = drizzle({ client });
  await migrate(db, { migrationsFolder: path.resolve(__dirname, "../../drizzle") });
});

afterAll(async () => {
  await client.close();
});

const at = "2026-11-08T03:00:00.000Z";

describe("Postgres 문의 저장소 (PGlite + 실제 마이그레이션)", () => {
  it("예약 문의를 저장하고 모든 칸·동의 정보·기본 상태를 되읽을 수 있다", async () => {
    const store = createPostgresInquiryStore(db);
    const { id } = await store.save({
      kind: "reservation",
      tourSlug: "sample-recruiting",
      receivedAt: at,
      consentAt: at,
      consentVersion: CONSENT_VERSION,
      data: { name: "홍길동", phone: "010-0000-0000", email: "t1@example.com", people: 3, experience: "입문", message: "첫 줄\n둘째 줄" },
    });
    const [row] = await db.select().from(inquiries).where(eq(inquiries.id, id));
    expect(row).toMatchObject({
      kind: "reservation",
      tourSlug: "sample-recruiting",
      name: "홍길동",
      phone: "010-0000-0000",
      email: "t1@example.com",
      people: 3,
      experience: "입문",
      message: "첫 줄\n둘째 줄",
      consentVersion: CONSENT_VERSION,
      status: "new",
      memo: null,
    });
    expect(row?.consentAt.toISOString()).toBe(at);
  });

  it("소식 받기는 연락처·인원 등을 비워 둔다", async () => {
    const store = createPostgresInquiryStore(db);
    const { id } = await store.save({ kind: "notice", tourSlug: "sample-upcoming", receivedAt: at, consentAt: at, consentVersion: CONSENT_VERSION, data: { name: "홍길동", email: "t2@example.com" } });
    const [row] = await db.select().from(inquiries).where(eq(inquiries.id, id));
    expect(row).toMatchObject({ kind: "notice", phone: null, people: null, experience: null, message: null });
  });

  it("빈 선택 항목(경험·문의)은 빈 문자열이 아니라 null 로 저장한다", async () => {
    const store = createPostgresInquiryStore(db);
    const { id } = await store.save({
      kind: "reservation",
      tourSlug: "sample-recruiting",
      receivedAt: at,
      consentAt: at,
      consentVersion: CONSENT_VERSION,
      data: { name: "홍길동", phone: "010-0000-0000", email: "t3@example.com", people: 1, experience: "", message: "" },
    });
    const [row] = await db.select().from(inquiries).where(eq(inquiries.id, id));
    expect(row?.experience).toBeNull();
    expect(row?.message).toBeNull();
  });

  it("SQL 을 닮은 입력은 값으로만 저장된다 (파라미터 바인딩)", async () => {
    const store = createPostgresInquiryStore(db);
    const evil = "'); drop table inquiries; --";
    const { id } = await store.save({
      kind: "reservation",
      tourSlug: "sample-recruiting",
      receivedAt: at,
      consentAt: at,
      consentVersion: CONSENT_VERSION,
      data: { name: evil, phone: "010-0000-0000", email: "t4@example.com", people: 1, experience: "", message: evil },
    });
    const [row] = await db.select().from(inquiries).where(eq(inquiries.id, id));
    expect(row?.name).toBe(evil);
    expect((await db.select().from(inquiries)).length).toBeGreaterThanOrEqual(4); // 표가 그대로 있다
  });

  it("DB 제약이 서버 검증의 마지막 방어선이다: 잘못된 유형·인원·상태는 거부한다", async () => {
    const base = { tourSlug: "x", name: "a", email: "a@example.com", consentAt: new Date(at), consentVersion: CONSENT_VERSION };
    await expect(db.insert(inquiries).values({ ...base, kind: "other" })).rejects.toThrow();
    await expect(db.insert(inquiries).values({ ...base, kind: "reservation", people: 11 })).rejects.toThrow();
    await expect(db.insert(inquiries).values({ ...base, kind: "reservation", people: 0 })).rejects.toThrow();
    await expect(db.insert(inquiries).values({ ...base, kind: "notice", status: "weird" })).rejects.toThrow();
  });
});

describe("제출 처리 + Postgres 저장소 (통합)", () => {
  it("검증·중복 방지를 거친 제출이 한 행으로 저장된다", async () => {
    const { processSubmission } = await import("@/lib/forms/process");
    const { createDuplicateGuard, createRateLimiter } = await import("@/lib/forms/rateLimit");
    const deps = { store: createPostgresInquiryStore(db), limiter: createRateLimiter({ limit: 50, windowMs: 1000 }), duplicates: createDuplicateGuard({ windowMs: 1000 }) };
    const tour = { slug: "int-tour", title: "t", status: "recruiting" as const, startDate: "2026-12-05", endDate: "2026-12-07", place: "p", capacity: 8, summary: "", description: [], thumbVariant: "sea-a" as const };
    const f = new FormData();
    for (const [k, v] of Object.entries({ name: "홍길동", phone: "010-0000-0000", email: "int@example.com", people: "2", consent: "on" })) f.set(k, v);

    expect((await processSubmission("reservation", tour, f, "9.9.9.9", deps)).status).toBe("success");
    expect((await processSubmission("reservation", tour, f, "9.9.9.9", deps)).status).toBe("success"); // 같은 내용 연속 제출
    const rows = await db.select().from(inquiries).where(eq(inquiries.tourSlug, "int-tour"));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.consentVersion).toBe(CONSENT_VERSION);
  });

  it("알림 메일 결과(sent·failed)를 남기고, 다른 값은 DB 제약이 막는다", async () => {
    const store = createPostgresInquiryStore(db);
    const { id } = await store.save({ kind: "notice", tourSlug: "notify-tour", receivedAt: at, consentAt: at, consentVersion: CONSENT_VERSION, data: { name: "홍길동", email: "n@example.com" } });
    expect((await db.select().from(inquiries).where(eq(inquiries.id, id)))[0]?.notifyStatus).toBeNull();
    await store.markNotify!(id, "failed");
    expect((await db.select().from(inquiries).where(eq(inquiries.id, id)))[0]?.notifyStatus).toBe("failed");
    await expect(db.update(inquiries).set({ notifyStatus: "maybe" }).where(eq(inquiries.id, id))).rejects.toThrow();
  });
});
