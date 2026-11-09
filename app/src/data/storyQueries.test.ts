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
import { kstDate, neighborsOf, queryLiveStories, queryLiveStory, tagsOf, thumbVariantFor } from "./storyQueries";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const admin: AdminSession = { userId: "admin-1", name: "시험 관리자", email: "admin@example.com" };
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
async function put(slug: string, over: Partial<Row> = {}) {
  await db.insert(contents).values({
    type: "story",
    slug,
    title: `제목 ${slug}`,
    body: bodyFromPlainText(`${slug} 본문 첫 문단\n\n둘째 문단`) as unknown as Record<string, unknown>,
    status: "published",
    publishedAt: new Date("2026-11-01T00:00:00Z"),
    createdBy: "x",
    updatedBy: "x",
    ...over,
  });
}

describe("공개되는 글의 기준", () => {
  it("발행된 글만 보이고, 임시저장·검토·보관·삭제된 글은 숨긴다", async () => {
    await put("live");
    await put("a-draft", { status: "draft", publishedAt: null });
    await put("a-review", { status: "review", publishedAt: null });
    await put("an-archived", { status: "archived" });
    await put("deleted", { deletedAt: new Date("2026-11-02T00:00:00Z") });
    const list = await queryLiveStories(db, NOW);
    expect(list.map((s) => s.slug)).toEqual(["live"]);
    for (const slug of ["a-draft", "a-review", "an-archived", "deleted"]) expect(await queryLiveStory(db, slug, NOW)).toBeNull();
    expect((await queryLiveStory(db, "live", NOW))?.title).toBe("제목 live");
  });

  it("예약 글은 시각이 지난 뒤에만 보인다 (크론이 늦어도 시각이 기준)", async () => {
    await put("past", { status: "scheduled", publishAt: new Date("2026-11-10T01:00:00Z"), publishedAt: null });
    await put("future", { status: "scheduled", publishAt: new Date("2026-11-10T09:00:00Z"), publishedAt: null });
    expect((await queryLiveStories(db, NOW)).map((s) => s.slug)).toEqual(["past"]);
    expect(await queryLiveStory(db, "future", NOW)).toBeNull();
    expect(await queryLiveStory(db, "future", new Date("2026-11-10T10:00:00Z"))).not.toBeNull();
  });

  it("다른 유형의 글은 스토리에 나오지 않는다", async () => {
    await put("a-video", { type: "video" });
    expect(await queryLiveStories(db, NOW)).toEqual([]);
    expect(await queryLiveStory(db, "a-video", NOW)).toBeNull();
  });

  it("발행된 글을 고치는 중인 내용(draft 칸)은 공개에 새지 않는다", async () => {
    await put("editing", { title: "공개 제목", draft: { title: "수정 중 제목", body: bodyFromPlainText("수정 중 본문") as unknown as Record<string, unknown> } });
    const s = await queryLiveStory(db, "editing", NOW);
    expect(s?.title).toBe("공개 제목");
    expect(JSON.stringify(s)).not.toContain("수정 중");
  });
});

describe("목록·상세 내용", () => {
  it("최신 순으로 정렬하고, 같은 시각이면 만든 순서를 따른다", async () => {
    await put("old", { publishedAt: new Date("2026-10-01T00:00:00Z") });
    await put("new", { publishedAt: new Date("2026-11-05T00:00:00Z") });
    await put("mid", { publishedAt: new Date("2026-10-20T00:00:00Z") });
    expect((await queryLiveStories(db, NOW)).map((s) => s.slug)).toEqual(["new", "mid", "old"]);
  });

  it("날짜는 한국 시간 기준이다 (UTC 23시 = 한국 다음 날)", async () => {
    await put("late", { publishedAt: new Date("2026-11-01T23:30:00Z") });
    expect((await queryLiveStories(db, NOW))[0]?.publishedAt).toBe("2026-11-02");
    expect(kstDate(new Date("2026-11-01T14:59:00Z"))).toBe("2026-11-01");
  });

  it("요약이 비면 본문 앞부분을 쓰고, 있으면 그대로 쓴다", async () => {
    await put("no-summary", { summary: "" });
    await put("with-summary", { summary: "직접 쓴 요약", publishedAt: new Date("2026-11-02T00:00:00Z") });
    const list = await queryLiveStories(db, NOW);
    expect(list.find((s) => s.slug === "no-summary")?.summary).toContain("no-summary 본문 첫 문단");
    expect(list.find((s) => s.slug === "with-summary")?.summary).toBe("직접 쓴 요약");
    expect((await queryLiveStory(db, "no-summary", NOW))?.summary).toContain("본문 첫 문단");
  });

  it("상세에는 질문·검색 문구·태그·본문이 담기고, 목록에는 본문이 없다", async () => {
    await put("detail", { answers: ["질문 하나?"], seoTitle: "검색 제목", seoDescription: "검색 설명", tags: ["바다", "기록"], summary: "요약" });
    const d = await queryLiveStory(db, "detail", NOW);
    expect(d).toMatchObject({ questions: ["질문 하나?"], seoTitle: "검색 제목", seoDescription: "검색 설명", tags: ["바다", "기록"] });
    expect(d?.doc.content.length).toBe(2);
    const item = (await queryLiveStories(db, NOW))[0] as unknown as Record<string, unknown>;
    expect(item).not.toHaveProperty("doc");
    expect(item).not.toHaveProperty("body");
  });

  it("본문 검사를 통과하지 못하는 글은 숨긴다 (저장소가 손상돼도 위험한 내용이 나가지 않는다)", async () => {
    await put("broken", { body: { type: "doc", content: [{ type: "script", text: "x" }] } as never });
    await put("broken-with-summary", { body: { type: "doc", content: [{ type: "script" }] } as never, summary: "요약", publishedAt: new Date("2026-11-02T00:00:00Z") });
    expect((await queryLiveStories(db, NOW)).map((s) => s.slug)).toEqual(["broken-with-summary"]);
    expect(await queryLiveStory(db, "broken", NOW)).toBeNull();
    expect(await queryLiveStory(db, "broken-with-summary", NOW)).toBeNull();
  });

  it("본문 이미지의 주소·대체 텍스트를 함께 읽고, 삭제된 이미지는 빠진다", async () => {
    const live = await createMedia(db, admin, { storage: "local", storageKey: "media/2026/11/a.webp", url: "/media-dev/a.webp", bytes: 1000, width: 800, height: 600, alt: "바다 사진" });
    const gone = await createMedia(db, admin, { storage: "local", storageKey: "media/2026/11/b.webp", url: "/media-dev/b.webp", bytes: 1000, width: 800, height: 600, alt: "지운 사진" });
    await db.update(media).set({ deletedAt: new Date() }).where(eq(media.id, gone.id));
    await put("with-image", {
      body: {
        type: "doc",
        content: [
          { type: "image", attrs: { mediaId: live.id } },
          { type: "image", attrs: { mediaId: gone.id } },
        ],
      } as never,
    });
    const d = await queryLiveStory(db, "with-image", NOW);
    expect(d?.media.map((m) => m.id)).toEqual([live.id]);
    expect(d?.media[0]).toMatchObject({ url: "/media-dev/a.webp", alt: "바다 사진", width: 800, height: 600 });
  });
});

describe("보조 함수", () => {
  const item = (slug: string, tags: string[] = []) => ({ slug, title: slug, summary: "", publishedAt: "2026-11-01", publishedAtIso: "", tags, thumbVariant: "sea-a" as const });

  it("이전·다음 글은 최신 순 목록에서 이웃을 고른다", () => {
    const list = [item("c"), item("b"), item("a")];
    expect(neighborsOf(list, "b")).toMatchObject({ newer: { slug: "c" }, older: { slug: "a" } });
    expect(neighborsOf(list, "c").newer).toBeUndefined();
    expect(neighborsOf(list, "a").older).toBeUndefined();
    expect(neighborsOf(list, "zzz")).toEqual({});
  });

  it("태그는 중복 없이 모은다", () => {
    expect(tagsOf([item("a", ["바다", "기록"]), item("b", ["기록", "창작"])])).toEqual(["바다", "기록", "창작"]);
  });

  it("장식 색은 같은 주소에서 항상 같다", () => {
    expect(thumbVariantFor("same")).toBe(thumbVariantFor("same"));
    expect(["sea-a", "sea-b", "sea-c", "sea-d"]).toContain(thumbVariantFor("anything"));
  });
});
