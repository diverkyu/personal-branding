import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { auditLog, inquiries } from "@/db/schema";
import type { AdminSession } from "@/lib/auth/types";
import { listAudit } from "./audit";
import { toCsv, csvCell } from "./csv";
import type { AdminDb } from "./db";
import {
  deleteInquiry,
  getInquiry,
  inquiryDashboard,
  listInquiries,
  listInquiriesForExport,
  updateInquiryMemo,
  updateInquiryStatus,
} from "./inquiries";
import { parseInquiryQuery } from "./inquiryQuery";

/** 실제 Postgres 엔진(PGlite)에 실제 마이그레이션을 적용해 어드민 데이터 함수를 시험한다. 가상 데이터만 쓴다. */
const MIGRATIONS = path.resolve(__dirname, "../../../drizzle");
const admin: AdminSession = { userId: "admin-1", name: "시험 관리자", email: "admin@example.com" };

let client: PGlite;
let db: AdminDb;

beforeAll(async () => {
  client = new PGlite();
  const d = drizzle({ client });
  await migrate(d, { migrationsFolder: MIGRATIONS });
  db = d as unknown as AdminDb;
});

afterAll(async () => {
  await client.close();
});

beforeEach(async () => {
  await db.delete(auditLog);
  await db.delete(inquiries);
});

const at = (iso: string) => new Date(iso);

async function seed(overrides: Partial<typeof inquiries.$inferInsert> = {}) {
  const [row] = await db
    .insert(inquiries)
    .values({
      kind: "reservation",
      tourSlug: "sample-recruiting",
      name: "홍길동",
      email: "t1@example.com",
      phone: "010-0000-0000",
      people: 2,
      consentAt: at("2026-11-08T03:00:00Z"),
      consentVersion: "v1",
      receivedAt: at("2026-11-08T03:00:00Z"),
      ...overrides,
    })
    .returning();
  return row!;
}

describe("마이그레이션 0002: 이전 상태값 변환", () => {
  it("in_progress·done 이던 행이 새 상태값으로 옮겨지고 새 제약이 적용된다", async () => {
    const old = new PGlite();
    const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
    const run = async (file: string) => {
      for (const stmt of readFileSync(path.join(MIGRATIONS, file), "utf8").split("--> statement-breakpoint")) await old.exec(stmt);
    };
    // 0002 가 상태 제약을 바꾸므로, 그 직전까지 적용한 상태에서 옛 값을 넣고 0002 를 적용한다
    for (const f of files.filter((f) => !f.startsWith("0002"))) await run(f);
    const ins = (kind: string, status: string, email: string) =>
      old.query(
        `insert into inquiries (kind, tour_slug, name, email, consent_at, consent_version, status) values ($1,'t','가상',$2,now(),'v1',$3)`,
        [kind, email, status],
      );
    await ins("reservation", "in_progress", "a@example.com");
    await ins("reservation", "done", "b@example.com");
    await ins("notice", "done", "c@example.com");
    await ins("reservation", "new", "d@example.com");
    await run(files.find((f) => f.startsWith("0002"))!);
    const { rows } = await old.query<{ email: string; status: string }>("select email, status from inquiries order by email");
    expect(rows).toEqual([
      { email: "a@example.com", status: "checked" },
      { email: "b@example.com", status: "confirmed" },
      { email: "c@example.com", status: "notified" },
      { email: "d@example.com", status: "new" },
    ]);
    await expect(ins("notice", "confirmed", "e@example.com")).rejects.toThrow();
    await expect(ins("reservation", "notified", "f@example.com")).rejects.toThrow();
    await old.close();
  });
});

describe("신청·문의 목록", () => {
  it("최신순으로 페이지(20건)를 나누고 총 개수와 새 신청 수를 돌려준다", async () => {
    for (let i = 0; i < 25; i++) await seed({ email: `u${i}@example.com`, receivedAt: new Date(Date.UTC(2026, 10, 1, 0, i)) });
    const first = await listInquiries(db, admin, parseInquiryQuery({}));
    expect(first.total).toBe(25);
    expect(first.items).toHaveLength(20);
    expect(first.newCount).toBe(25);
    expect(first.items[0]!.email).toBe("u24@example.com");
    const second = await listInquiries(db, admin, parseInquiryQuery({ page: "2" }));
    expect(second.items).toHaveLength(5);
  });

  it("유형·상태·투어·기간·검색으로 거르고, 검색어의 와일드카드는 글자로 취급한다", async () => {
    await seed({ name: "김가나", email: "a@example.com", tourSlug: "tour-a", receivedAt: at("2026-11-01T01:00:00Z") });
    await seed({ name: "박다라", email: "b@example.com", tourSlug: "tour-b", kind: "notice", phone: null, people: null, receivedAt: at("2026-11-05T01:00:00Z") });
    await seed({ name: "100%할인", email: "c@example.com", tourSlug: "tour-a", status: "checked", receivedAt: at("2026-11-07T01:00:00Z") });
    const f = (p: Record<string, string>) => listInquiries(db, admin, parseInquiryQuery(p)).then((r) => r.items.map((i) => i.email).sort());
    expect(await f({ kind: "notice" })).toEqual(["b@example.com"]);
    expect(await f({ status: "checked" })).toEqual(["c@example.com"]);
    expect(await f({ tour: "tour-a" })).toEqual(["a@example.com", "c@example.com"]);
    expect(await f({ q: "김가" })).toEqual(["a@example.com"]);
    expect(await f({ q: "%" })).toEqual(["c@example.com"]);
    expect(await f({ q: "_" })).toEqual([]);
    expect(await f({ from: "2026-11-05", to: "2026-11-06" })).toEqual(["b@example.com"]);
    // 기간은 한국 시간 기준: UTC 11-04 16:00 은 한국 11-05 01:00
    await seed({ email: "d@example.com", receivedAt: at("2026-11-04T16:00:00Z") });
    expect(await f({ from: "2026-11-05", to: "2026-11-05" })).toEqual(["b@example.com", "d@example.com"]);
  });

  it("목록 조회는 개인정보 상세(연락처·문의 내용)를 돌려주지 않는다", async () => {
    await seed({ message: "비밀 문의", phone: "010-1234-5678" });
    const { items } = await listInquiries(db, admin, parseInquiryQuery({}));
    expect(Object.keys(items[0]!).sort()).toEqual(["email", "id", "kind", "name", "notifyStatus", "receivedAt", "status", "tourSlug"]);
  });

  it("대시보드는 새 신청 수와 최근 5건을 돌려준다", async () => {
    for (let i = 0; i < 7; i++) await seed({ email: `u${i}@example.com`, status: i < 2 ? "checked" : "new", receivedAt: new Date(Date.UTC(2026, 10, 1, 0, i)) });
    const d = await inquiryDashboard(db, admin);
    expect(d.newCount).toBe(5);
    expect(d.recent).toHaveLength(5);
  });

  it("대시보드는 알림 메일이 실패했고 아직 신규인 신청 수를 센다 (처리한 것은 제외)", async () => {
    await seed({ email: "f1@example.com", notifyStatus: "failed" });
    await seed({ email: "f2@example.com", notifyStatus: "failed", status: "checked" });
    await seed({ email: "ok@example.com", notifyStatus: "sent" });
    expect((await inquiryDashboard(db, admin)).notifyFailed).toBe(1);
  });
});

describe("상세·상태·메모·삭제와 활동 기록", () => {
  it("상세를 열면 활동 기록에 남고, 기록에는 개인정보가 없다", async () => {
    const row = await seed({ name: "비밀이름", email: "secret@example.com", message: "비밀 문의" });
    const got = await getInquiry(db, admin, row.id);
    expect(got?.name).toBe("비밀이름");
    const { items } = await listAudit(db, admin, 1);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ action: "inquiry.view", targetType: "inquiry", targetId: row.id, actorId: "admin-1" });
    expect(JSON.stringify(items)).not.toMatch(/비밀|secret@/);
  });

  it("형식이 틀린 id 와 없는 id 는 null 이다 (열람 기록도 없다)", async () => {
    expect(await getInquiry(db, admin, "not-a-uuid")).toBeNull();
    expect(await getInquiry(db, admin, "00000000-0000-4000-8000-000000000000")).toBeNull();
    expect((await listAudit(db, admin, 1)).total).toBe(0);
  });

  it("상태는 유형에 맞는 값으로만 바꿀 수 있고 변경이 기록된다", async () => {
    const r = await seed();
    const n = await seed({ kind: "notice", phone: null, people: null, email: "n@example.com" });
    expect(await updateInquiryStatus(db, admin, r.id, "confirmed")).toEqual({ from: "new", to: "confirmed" });
    await expect(updateInquiryStatus(db, admin, r.id, "notified")).rejects.toThrow("쓸 수 없는 상태");
    await expect(updateInquiryStatus(db, admin, r.id, "hacked")).rejects.toThrow();
    await expect(updateInquiryStatus(db, admin, n.id, "cancelled")).rejects.toThrow();
    await updateInquiryStatus(db, admin, n.id, "notified");
    const { items } = await listAudit(db, admin, 1);
    expect(items.filter((i) => i.action === "inquiry.status_change")).toHaveLength(2);
    expect(items.find((i) => i.targetId === r.id)?.meta).toEqual({ from: "new", to: "confirmed" });
  });

  it("메모는 저장되고 길이 제한이 있으며, 기록에는 내용이 아닌 길이만 남는다", async () => {
    const r = await seed();
    await updateInquiryMemo(db, admin, r.id, "  전화 완료\r\n내일 재확인  ");
    expect((await getInquiry(db, admin, r.id))?.memo).toBe("전화 완료\n내일 재확인");
    await expect(updateInquiryMemo(db, admin, r.id, "가".repeat(1001))).rejects.toThrow("1000자");
    await updateInquiryMemo(db, admin, r.id, "");
    expect((await getInquiry(db, admin, r.id))?.memo).toBeNull();
    const audit = (await listAudit(db, admin, 1)).items.filter((i) => i.action === "inquiry.memo_update");
    expect(JSON.stringify(audit)).not.toContain("전화 완료");
    expect(audit.map((a) => a.meta)).toContainEqual({ length: 0 });
  });

  it("삭제(파기)하면 행이 사라지고 기록에는 id 와 유형만 남는다", async () => {
    const r = await seed({ name: "지울이름" });
    await deleteInquiry(db, admin, r.id);
    expect(await db.select().from(inquiries)).toHaveLength(0);
    await expect(deleteInquiry(db, admin, r.id)).rejects.toThrow();
    const entry = (await listAudit(db, admin, 1)).items.find((i) => i.action === "inquiry.delete");
    expect(entry).toMatchObject({ targetId: r.id, meta: { kind: "reservation" } });
    expect(JSON.stringify(entry)).not.toContain("지울이름");
  });

  it("내보내기는 조건대로 행을 돌려주고 건수를 기록한다", async () => {
    await seed({ email: "a@example.com" });
    await seed({ email: "b@example.com", kind: "notice", phone: null, people: null });
    const rows = await listInquiriesForExport(db, admin, parseInquiryQuery({ kind: "notice" }));
    expect(rows.map((r) => r.email)).toEqual(["b@example.com"]);
    const entry = (await listAudit(db, admin, 1)).items.find((i) => i.action === "inquiry.export");
    expect(entry?.meta).toEqual({ count: 1, filtered: true });
  });
});

describe("호출 규칙: 어드민 데이터 함수는 확인된 관리자를 받아야 한다", () => {
  for (const file of ["inquiries.ts", "audit.ts", "settings.ts", "media.ts", "contents.ts", "reviews.ts", "trash.ts", "about.ts", "taxonomy.ts", "readiness.ts"]) {
    it(`${file} 의 내보낸 함수는 모두 admin: AdminSession 인자를 가진다`, () => {
      const source = readFileSync(path.join(__dirname, file), "utf8");
      const functions = [...source.matchAll(/export async function (\w+)\(([\s\S]*?)\)\s*:/g)];
      expect(functions.length).toBeGreaterThan(0);
      for (const [, name, params] of functions) expect(params, `${name} 에 admin: AdminSession 이 없습니다`).toMatch(/admin: AdminSession/);
    });
  }
});

describe("CSV", () => {
  it("쉼표·따옴표·줄바꿈을 감싸고, 수식으로 시작하는 값은 무력화한다", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("줄1\n줄2")).toBe('"줄1\n줄2"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@SUM(1)")).toBe("'@SUM(1)");
    expect(csvCell(null)).toBe("");
    expect(csvCell(3)).toBe("3");
  });
  it("BOM 과 CRLF 로 만든다", () => {
    const csv = toCsv(["이름", "메모"], [["가", "나"]]);
    expect(csv.startsWith("﻿이름,메모\r\n")).toBe(true);
    expect(csv.endsWith("가,나\r\n")).toBe(true);
  });
});

describe("parseInquiryQuery", () => {
  it("허용된 값만 받고 나머지는 버린다", () => {
    const q = parseInquiryQuery({ kind: "x", status: "new", tour: "../etc", q: "  가  ", from: "2026-13-40", to: "2026-11-08", page: "-3" });
    expect(q).toEqual({ kind: undefined, status: "new", tourSlug: undefined, q: "가", from: undefined, to: "2026-11-08", page: 1 });
    expect(parseInquiryQuery({ page: "99999" }).page).toBe(1000);
    expect(parseInquiryQuery({ q: "가".repeat(100) }).q).toHaveLength(60);
  });
});
