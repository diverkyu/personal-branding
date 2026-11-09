import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { bodyFromPlainText } from "@/content/body";
import { contents, media } from "@/db/schema";
import type { AdminSession } from "@/lib/auth/types";
import type { AdminDb } from "./admin/db";
import { createMedia } from "./admin/media";
import { queryLiveStories } from "./storyQueries";
import { openOf, pastOf, queryLiveTour, queryLiveTours, upcomingOf } from "./tourQueries";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const admin: AdminSession = { userId: "admin-1", name: "시험 관리자", email: "admin@example.com" };
/** 한국 시간 2026-11-10 12:00 */
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
  await db.delete(media);
});

type Row = typeof contents.$inferInsert;
const fields = (over: Record<string, unknown> = {}) => ({ startDate: "2026-12-05", endDate: "2026-12-07", place: "제주 서귀포", recruit: "recruiting", capacity: 8, feeNote: "", gallery: [], videos: [], ...over });

async function put(slug: string, over: Partial<Row> & { f?: Record<string, unknown> } = {}) {
  const { f, ...rest } = over;
  await db.insert(contents).values({
    type: "tour",
    slug,
    title: `투어 ${slug}`,
    body: bodyFromPlainText(`${slug} 소개 첫 문단`) as unknown as Record<string, unknown>,
    fields: fields(f),
    status: "published",
    publishedAt: new Date("2026-11-01T00:00:00Z"),
    createdBy: "x",
    updatedBy: "x",
    ...rest,
  });
}

describe("공개되는 투어의 기준", () => {
  it("발행된 투어만 보이고, 임시저장·검토·보관·삭제는 숨긴다", async () => {
    await put("live");
    await put("a-draft", { status: "draft", publishedAt: null });
    await put("a-review", { status: "review", publishedAt: null });
    await put("an-archived", { status: "archived" });
    await put("deleted", { deletedAt: new Date() });
    expect((await queryLiveTours(db, NOW)).map((t) => t.slug)).toEqual(["live"]);
    for (const slug of ["a-draft", "a-review", "an-archived", "deleted"]) expect(await queryLiveTour(db, slug, NOW)).toBeNull();
  });

  it("예약 투어는 시각이 지난 뒤에만 보인다", async () => {
    await put("past", { status: "scheduled", publishAt: new Date("2026-11-10T01:00:00Z"), publishedAt: null });
    await put("future", { status: "scheduled", publishAt: new Date("2026-11-10T09:00:00Z"), publishedAt: null });
    expect((await queryLiveTours(db, NOW)).map((t) => t.slug)).toEqual(["past"]);
    expect(await queryLiveTour(db, "future", NOW)).toBeNull();
  });

  it("다른 유형(스토리)은 투어에 나오지 않고, 투어는 스토리 목록에 나오지 않는다", async () => {
    await put("a-story", { type: "story" });
    await put("a-tour");
    expect((await queryLiveTours(db, NOW)).map((t) => t.slug)).toEqual(["a-tour"]);
    expect(await queryLiveTour(db, "a-story", NOW)).toBeNull();
    expect((await queryLiveStories(db, NOW)).map((s) => s.slug)).toEqual(["a-story"]);
  });

  it("수정 중인 내용(draft 칸)은 공개에 새지 않는다 — 일정·장소도 마찬가지", async () => {
    await put("editing", { draft: { title: "수정 중 제목", fields: fields({ place: "수정 중 장소", startDate: "2027-01-01", endDate: "2027-01-02" }), body: bodyFromPlainText("수정 중 소개") } });
    const t = await queryLiveTour(db, "editing", NOW);
    expect(t).toMatchObject({ title: "투어 editing", place: "제주 서귀포", startDate: "2026-12-05" });
    expect(JSON.stringify(t)).not.toContain("수정 중");
  });

  it("일정·장소가 비었거나 깨진 투어는 숨긴다", async () => {
    await put("no-place", { f: { place: "" } });
    await put("no-dates", { f: { startDate: "", endDate: "" } });
    await put("broken", { fields: "not-an-object" as never });
    await put("ok");
    expect((await queryLiveTours(db, NOW)).map((t) => t.slug)).toEqual(["ok"]);
    expect(await queryLiveTour(db, "no-place", NOW)).toBeNull();
  });

  it("본문 검사를 통과하지 못하는 투어는 숨긴다", async () => {
    await put("bad-body", { body: { type: "doc", content: [{ type: "script" }] } as never });
    expect(await queryLiveTour(db, "bad-body", NOW)).toBeNull();
  });
});

describe("상태 계산과 정렬", () => {
  it("종료일이 한국 시간 오늘보다 앞서면 종료, 당일은 아직 종료가 아니다", async () => {
    await put("ended", { f: { startDate: "2026-11-01", endDate: "2026-11-09" } });
    await put("today", { f: { startDate: "2026-11-10", endDate: "2026-11-10" } });
    const byId = Object.fromEntries((await queryLiveTours(db, NOW)).map((t) => [t.slug, t.status]));
    expect(byId).toEqual({ ended: "ended", today: "recruiting" });
    // 한국 시간 자정이 지나면(UTC 15시) 그날 끝난 투어는 종료
    const after = Object.fromEntries((await queryLiveTours(db, new Date("2026-11-10T15:00:00Z"))).map((t) => [t.slug, t.status]));
    expect(after.today).toBe("ended");
  });

  it("모집 마감·예정 상태가 그대로 나온다", async () => {
    await put("closed", { f: { recruit: "closed" } });
    await put("soon", { f: { recruit: "upcoming" } });
    const byId = Object.fromEntries((await queryLiveTours(db, NOW)).map((t) => [t.slug, t.status]));
    expect(byId).toEqual({ closed: "closed", soon: "upcoming" });
  });

  it("진행 예정은 시작일이 가까운 순, 지난 투어는 종료일이 최근인 순, 모집 중·예정만 따로 고른다", async () => {
    await put("dec", { f: { startDate: "2026-12-20", endDate: "2026-12-22", recruit: "upcoming" } });
    await put("nov", { f: { startDate: "2026-11-20", endDate: "2026-11-22", recruit: "recruiting" } });
    await put("jan", { f: { startDate: "2027-01-10", endDate: "2027-01-12", recruit: "closed" } });
    await put("old1", { f: { startDate: "2026-09-01", endDate: "2026-09-03" } });
    await put("old2", { f: { startDate: "2026-10-01", endDate: "2026-10-03" } });
    const all = await queryLiveTours(db, NOW);
    expect(upcomingOf(all).map((t) => t.slug)).toEqual(["nov", "dec", "jan"]);
    expect(openOf(all).map((t) => t.slug)).toEqual(["nov", "dec"]);
    expect(pastOf(all).map((t) => t.slug)).toEqual(["old2", "old1"]);
  });
});

describe("내용", () => {
  it("요약이 비면 소개 앞부분을 쓰고, 있으면 그대로 쓴다", async () => {
    await put("no-summary", { summary: "" });
    await put("with-summary", { summary: "직접 쓴 요약" });
    const list = await queryLiveTours(db, NOW);
    expect(list.find((t) => t.slug === "no-summary")?.summary).toContain("no-summary 소개");
    expect(list.find((t) => t.slug === "with-summary")?.summary).toBe("직접 쓴 요약");
  });

  it("상세에는 본문·참가비·영상·검색 문구가 담기고 목록에는 본문이 없다", async () => {
    await put("detail", { seoTitle: "검색 제목", seoDescription: "검색 설명", f: { feeNote: "참가비 안내", videos: ["https://vimeo.com/123456"], capacity: 6 } });
    const d = await queryLiveTour(db, "detail", NOW);
    expect(d).toMatchObject({ seoTitle: "검색 제목", seoDescription: "검색 설명", feeNote: "참가비 안내", videos: ["https://vimeo.com/123456"], capacity: 6 });
    expect(d?.doc?.content.length).toBe(1);
    const item = (await queryLiveTours(db, NOW))[0] as unknown as Record<string, unknown>;
    expect(item.doc).toBeUndefined();
  });

  it("갤러리: 이미지 주소·대체 텍스트·설명을 읽고 첫 장이 대표 이미지가 되며, 삭제된 이미지는 빠진다", async () => {
    const a = await createMedia(db, admin, { storage: "local", storageKey: "media/2026/11/a.webp", url: "/media-dev/a.webp", bytes: 1000, width: 800, height: 600, alt: "바다 사진" });
    const gone = await createMedia(db, admin, { storage: "local", storageKey: "media/2026/11/b.webp", url: "/media-dev/b.webp", bytes: 1000, width: 800, height: 600, alt: "지운 사진" });
    await db.update(media).set({ deletedAt: new Date() }).where(eq(media.id, gone.id));
    await put("with-gallery", { f: { gallery: [{ mediaId: gone.id, caption: "" }, { mediaId: a.id, caption: "첫날" }] } });
    const d = await queryLiveTour(db, "with-gallery", NOW);
    expect(d?.gallery).toHaveLength(1);
    expect(d?.gallery?.[0]).toMatchObject({ src: "/media-dev/a.webp", alt: "바다 사진", caption: "첫날" });
    expect(d?.cover).toEqual({ src: "/media-dev/a.webp", alt: "바다 사진" });
    expect(d?.extras).toEqual(["갤러리 1장"]);
  });

  it("신청 접수는 지금의 모집 상태를 본다 (마감하면 바로 모집 중이 아니다)", async () => {
    await put("t1");
    expect((await queryLiveTours(db, NOW)).find((t) => t.slug === "t1")?.status).toBe("recruiting");
    await db.update(contents).set({ fields: fields({ recruit: "closed" }) }).where(eq(contents.slug, "t1"));
    expect((await queryLiveTours(db, NOW)).find((t) => t.slug === "t1")?.status).toBe("closed");
  });
});
