import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { bodyFromPlainText } from "@/content/body";
import { contents } from "@/db/schema";
import type { AdminDb } from "./admin/db";
import { isStaleCheck, levelsOf, neighborsOf, queryLiveTravel, queryLiveTravelItem, regionsOf } from "./travelQueries";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const NOW = new Date("2026-11-10T03:00:00Z");
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
  await db.delete(contents);
});

type Row = typeof contents.$inferInsert;

async function put(slug: string, over: Partial<Row> = {}, fields: Record<string, unknown> = {}) {
  await db.insert(contents).values({
    type: "travel",
    slug,
    title: `여행 ${slug}`,
    summary: `소개 ${slug}`,
    body: bodyFromPlainText("본문입니다") as unknown as Record<string, unknown>,
    fields: { region: "제주", place: "문섬 인근", season: "5~10월", level: "beginner", budget: "참고 예산", checkedAt: "2026-10-01", ...fields },
    status: "published",
    publishedAt: new Date("2026-11-01T00:00:00Z"),
    createdBy: "x",
    updatedBy: "x",
    ...over,
  });
}

describe("공개 기준", () => {
  it("발행됨과 예약 시각이 지난 예약만 보이고, 임시저장·검토·보관·삭제·예약 전·다른 유형은 보이지 않는다", async () => {
    await put("pub");
    await put("sched-past", { status: "scheduled", publishedAt: null, publishAt: new Date("2026-11-09T00:00:00Z") });
    await put("sched-future", { status: "scheduled", publishedAt: null, publishAt: new Date("2026-11-20T00:00:00Z") });
    await put("draft", { status: "draft", publishedAt: null });
    await put("review", { status: "review", publishedAt: null });
    await put("archived", { status: "archived" });
    await put("deleted", { deletedAt: new Date() });
    await put("story-like", { type: "story" });
    expect((await queryLiveTravel(db, NOW)).map((t) => t.slug).sort()).toEqual(["pub", "sched-past"]);
    for (const slug of ["sched-future", "draft", "review", "archived", "deleted", "story-like"]) expect(await queryLiveTravelItem(db, slug, NOW)).toBeNull();
  });

  it("목록은 최신 공개 순이다", async () => {
    await put("old", { publishedAt: new Date("2026-10-01T00:00:00Z") });
    await put("new", { publishedAt: new Date("2026-11-05T00:00:00Z") });
    expect((await queryLiveTravel(db, NOW)).map((t) => t.slug)).toEqual(["new", "old"]);
  });

  it("지역 또는 장소가 비어 있는 글은 숨긴다(저장소가 손상돼도 화면이 깨지지 않는다)", async () => {
    await put("ok");
    await put("no-region", {}, { region: "" });
    await put("no-place", {}, { place: "" });
    expect((await queryLiveTravel(db, NOW)).map((t) => t.slug)).toEqual(["ok"]);
    expect(await queryLiveTravelItem(db, "no-region", NOW)).toBeNull();
  });

  it("수정 중인 내용(draft 칸)은 읽지 않는다", async () => {
    await put("pub", { draft: { title: "고치는 중인 제목", fields: { region: "비밀 지역" } } as unknown as Row["draft"] });
    const item = await queryLiveTravelItem(db, "pub", NOW);
    expect(item?.title).toBe("여행 pub");
    expect(item?.region).toBe("제주");
  });
});

describe("항목과 본문", () => {
  it("공개 항목을 그대로 돌려주고 비운 항목은 빈 값이다", async () => {
    await put("full");
    await put("sparse", {}, { season: "", level: "", budget: "", checkedAt: "" });
    const full = await queryLiveTravelItem(db, "full", NOW);
    expect(full).toMatchObject({ region: "제주", place: "문섬 인근", season: "5~10월", level: "beginner", budget: "참고 예산", checkedAt: "2026-10-01", publishedAt: "2026-11-01" });
    expect(full?.doc).not.toBeNull();
    const sparse = await queryLiveTravelItem(db, "sparse", NOW);
    expect(sparse).toMatchObject({ season: "", level: "", budget: "", checkedAt: "" });
  });

  it("본문이 비어 있으면 doc 은 null 이고 글은 보인다", async () => {
    await put("nobody", { body: bodyFromPlainText("") as unknown as Record<string, unknown> });
    const item = await queryLiveTravelItem(db, "nobody", NOW);
    expect(item).not.toBeNull();
    expect(item?.doc).toBeNull();
  });

  it("허용되지 않는 서식이 든 본문은 본문만 빠지고 글은 보인다", async () => {
    await put("bad", { body: { type: "doc", content: [{ type: "script", content: [] }] } as unknown as Record<string, unknown> });
    const item = await queryLiveTravelItem(db, "bad", NOW);
    expect(item).not.toBeNull();
    expect(item?.doc).toBeNull();
  });

  it("목록에는 본문이 없다(가볍게 유지)", async () => {
    await put("a");
    expect(Object.keys((await queryLiveTravel(db, NOW))[0]!)).not.toContain("doc");
  });
});

describe("목록 도우미", () => {
  it("지역은 많이 쓰인 순, 같으면 가나다 순이다", () => {
    const list = ["제주", "필리핀 보홀", "제주", "이집트 다합"].map((region) => ({ region }));
    expect(regionsOf(list)).toEqual(["제주", "이집트 다합", "필리핀 보홀"]);
  });

  it("난이도는 입문·중급·상급 순이고 쓴 글이 없으면 빈 목록이다", () => {
    expect(levelsOf([{ level: "advanced" }, { level: "beginner" }, { level: "" }]).map((l) => l.label)).toEqual(["입문", "상급"]);
    expect(levelsOf([{ level: "" }])).toEqual([]);
  });

  it("이전·다음 글은 최신 공개 순 목록에서 찾는다", () => {
    const list = [{ slug: "c" }, { slug: "b" }, { slug: "a" }];
    expect(neighborsOf(list, "b")).toEqual({ newer: { slug: "c" }, older: { slug: "a" } });
    expect(neighborsOf(list, "c")).toEqual({ newer: null, older: { slug: "b" } });
    expect(neighborsOf(list, "a")).toEqual({ newer: { slug: "b" }, older: null });
    expect(neighborsOf(list, "none")).toEqual({ newer: null, older: null });
  });
});

describe("오래된 정보 (12개월)", () => {
  it("확인일 + 12개월이 오늘보다 앞이면 오래된 것이다", () => {
    expect(isStaleCheck("2025-11-09", "2026-11-10", 12)).toBe(true);
    expect(isStaleCheck("2025-11-10", "2026-11-10", 12)).toBe(false); // 정확히 12개월은 아직 아니다
    expect(isStaleCheck("2026-10-01", "2026-11-10", 12)).toBe(false);
  });

  it("확인일이 없거나 잘못되면 판단하지 않는다(null)", () => {
    expect(isStaleCheck("", "2026-11-10", 12)).toBeNull();
    expect(isStaleCheck("2026/10/01", "2026-11-10", 12)).toBeNull();
    expect(isStaleCheck("abc", "2026-11-10", 12)).toBeNull();
  });

  it("윤년·월말 경계를 처리한다", () => {
    expect(isStaleCheck("2024-02-29", "2025-03-02", 12)).toBe(true);
    expect(isStaleCheck("2024-02-29", "2025-02-28", 12)).toBe(false);
  });
});
