import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { bodyFromPlainText } from "@/content/body";
import { contents, media } from "@/db/schema";
import type { AdminSession } from "@/lib/auth/types";
import { isoDuration } from "@/lib/video";
import type { AdminDb } from "./admin/db";
import { createMedia } from "./admin/media";
import { featuredOf, neighborsOf, queryLiveFilm, queryLiveFilms, tagsOf } from "./filmQueries";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const admin: AdminSession = { userId: "admin-1", name: "시험 관리자", email: "admin@example.com" };
const NOW = new Date("2026-11-10T03:00:00Z");
const YT = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
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

const photo = (key: string, alt: string | undefined) => createMedia(db, admin, { storage: "local", storageKey: `media/2026/11/${key}.webp`, url: `/media-dev/${key}.webp`, bytes: 1000, width: 1280, height: 720, alt });
type Row = typeof contents.$inferInsert;

async function put(slug: string, poster: string | null, over: Partial<Row> = {}, fields: Record<string, unknown> = {}) {
  await db.insert(contents).values({
    type: "video",
    slug,
    title: `작품 ${slug}`,
    summary: `설명 ${slug}`,
    body: bodyFromPlainText("") as unknown as Record<string, unknown>,
    fields: { videoUrl: YT, duration: "1:00", hasCaptions: true, posterMediaId: poster, cutLabel: "", featured: false, sceneIntent: "", promptNotes: "", editNotes: "", ...fields },
    status: "published",
    publishedAt: new Date("2026-11-01T00:00:00Z"),
    createdBy: "x",
    updatedBy: "x",
    ...over,
  });
}

describe("공개 기준", () => {
  it("발행됨과 예약 시각이 지난 예약만 보이고, 임시저장·검토·보관·삭제·예약 전·다른 유형은 보이지 않는다", async () => {
    const p = await photo("a".repeat(32), "포스터");
    await put("pub", p.id);
    await put("sched-past", p.id, { status: "scheduled", publishedAt: null, publishAt: new Date("2026-11-09T00:00:00Z") });
    await put("sched-future", p.id, { status: "scheduled", publishedAt: null, publishAt: new Date("2026-11-20T00:00:00Z") });
    await put("draft", p.id, { status: "draft", publishedAt: null });
    await put("review", p.id, { status: "review", publishedAt: null });
    await put("archived", p.id, { status: "archived" });
    await put("deleted", p.id, { deletedAt: new Date() });
    await put("story-like", p.id, { type: "story" });
    expect((await queryLiveFilms(db, NOW)).map((f) => f.slug).sort()).toEqual(["pub", "sched-past"]);
    for (const slug of ["sched-future", "draft", "review", "archived", "deleted", "story-like"]) expect(await queryLiveFilm(db, slug, NOW)).toBeNull();
  });

  it("공개 내용은 본문 칸이다 — 수정 중인 내용(draft)은 읽지 않는다", async () => {
    const p = await photo("b".repeat(32), "포스터");
    await put("edited", p.id, { draft: { title: "고치는 중 제목", summary: "새 요약", fields: { promptNotes: "공개하면 안 되는 프롬프트", videoUrl: YT } } }, { promptNotes: "" });
    const f = await queryLiveFilm(db, "edited", NOW);
    expect(f?.title).toBe("작품 edited");
    expect(JSON.stringify(f)).not.toContain("공개하면 안 되는");
    expect(JSON.stringify(f)).not.toContain("고치는 중");
    expect(f?.notes.promptNotes).toBe("");
  });

  it("공개 응답에는 화면에 필요한 값만 있다 (제작 방식·메모 같은 기록용 값은 없다)", async () => {
    const p = await photo("c".repeat(32), "포스터");
    await put("clean", p.id, { origin: "ai_assisted", originNote: "비공개 메모", seoTitle: "검색 제목" });
    const f = await queryLiveFilm(db, "clean", NOW);
    const json = JSON.stringify(f);
    expect(json).not.toContain("비공개 메모");
    expect(json).not.toContain("ai_assisted");
    expect(f).toMatchObject({ seoTitle: "검색 제목", duration: "1:00", hasCaptions: true });
  });
});

describe("숨기는 작품 — 화면이 깨지거나 대체 텍스트 없는 이미지가 공개되지 않게", () => {
  it("포스터가 없거나 삭제됐거나 대체 텍스트가 없으면 숨긴다", async () => {
    const ok = await photo("d".repeat(32), "포스터");
    const noAlt = await photo("e".repeat(32), undefined);
    const gone = await photo("f".repeat(32), "삭제될 포스터");
    await db.update(media).set({ deletedAt: new Date() }).where(eq(media.id, gone.id));
    await put("ok", ok.id);
    await put("no-poster", null);
    await put("no-alt", noAlt.id);
    await put("deleted-poster", gone.id);
    expect((await queryLiveFilms(db, NOW)).map((f) => f.slug)).toEqual(["ok"]);
    for (const slug of ["no-poster", "no-alt", "deleted-poster"]) expect(await queryLiveFilm(db, slug, NOW)).toBeNull();
  });

  it("영상 주소가 없거나 허용 도메인이 아니면 숨긴다", async () => {
    const p = await photo("1".repeat(32), "포스터");
    await put("good", p.id);
    await put("no-url", p.id, {}, { videoUrl: "" });
    await put("bad-url", p.id, {}, { videoUrl: "https://example.com/video.mp4" });
    expect((await queryLiveFilms(db, NOW)).map((f) => f.slug)).toEqual(["good"]);
    expect(await queryLiveFilm(db, "bad-url", NOW)).toBeNull();
  });
});

describe("제작 노트와 영상 소개", () => {
  it("제작 노트는 글자 그대로 읽는다 (줄바꿈·띄어쓰기·HTML 모양 글자 유지)", async () => {
    const p = await photo("2".repeat(32), "포스터");
    const prompt = "A <b>crab</b> <script>alert(1)</script>\n\n두  칸";
    await put("notes", p.id, {}, { sceneIntent: "첫 줄\n둘째 줄", promptNotes: prompt, editNotes: "" });
    const f = await queryLiveFilm(db, "notes", NOW);
    expect(f?.notes).toEqual({ sceneIntent: "첫 줄\n둘째 줄", promptNotes: prompt, editNotes: "" });
  });

  it("영상 소개가 비어 있으면 null, 있으면 본문과 본문 이미지를 준다", async () => {
    const poster = await photo("3".repeat(32), "포스터");
    const inBody = await photo("4".repeat(32), "본문 이미지");
    await put("no-intro", poster.id);
    await put("intro", poster.id, {
      body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "소개" }] }, { type: "image", attrs: { mediaId: inBody.id } }] } as unknown as Record<string, unknown>,
    });
    expect((await queryLiveFilm(db, "no-intro", NOW))?.doc).toBeNull();
    const f = await queryLiveFilm(db, "intro", NOW);
    expect(f?.doc).not.toBeNull();
    expect(f?.media.map((m) => m.id)).toEqual([inBody.id]);
  });

  it("영상 소개가 검사를 통과하지 못하면 소개만 빼고 작품은 보인다", async () => {
    const p = await photo("5".repeat(32), "포스터");
    await put("bad-body", p.id, { body: { type: "doc", content: [{ type: "script", content: [] }] } as unknown as Record<string, unknown> });
    const f = await queryLiveFilm(db, "bad-body", NOW);
    expect(f).not.toBeNull();
    expect(f?.doc).toBeNull();
  });
});

describe("정렬·대표 작품·이전/다음·태그", () => {
  it("최신 공개 순으로 정렬한다", async () => {
    const p = await photo("6".repeat(32), "포스터");
    await put("old", p.id, { publishedAt: new Date("2026-10-01T00:00:00Z") });
    await put("new", p.id, { publishedAt: new Date("2026-11-05T00:00:00Z") });
    await put("mid", p.id, { publishedAt: new Date("2026-10-20T00:00:00Z") });
    expect((await queryLiveFilms(db, NOW)).map((f) => f.slug)).toEqual(["new", "mid", "old"]);
  });

  it("대표 작품은 체크한 것 중 가장 최근, 없으면 가장 최근 공개작", async () => {
    const mk = (slug: string, featured: boolean) => ({ slug, featured });
    expect(featuredOf([mk("a", false), mk("b", true), mk("c", true)])?.slug).toBe("b");
    expect(featuredOf([mk("a", false), mk("b", false)])?.slug).toBe("a");
    expect(featuredOf([])).toBeNull();
  });

  it("이전(더 오래된)·다음(더 새로운) 작품과 태그 목록", () => {
    const list = [{ slug: "n" }, { slug: "m" }, { slug: "o" }];
    expect(neighborsOf(list, "m")).toEqual({ newer: { slug: "n" }, older: { slug: "o" } });
    expect(neighborsOf(list, "n")).toEqual({ newer: null, older: { slug: "m" } });
    expect(neighborsOf(list, "o")).toEqual({ newer: { slug: "m" }, older: null });
    expect(neighborsOf(list, "x")).toEqual({ newer: null, older: null });
    expect(tagsOf([{ tags: ["b", "a"] }, { tags: ["a"] }, { tags: ["c", "a"] }])).toEqual(["a", "b", "c"]);
  });

  it("길이를 ISO 8601 로 바꾼다", () => {
    expect(isoDuration("3:25")).toBe("PT3M25S");
    expect(isoDuration("0:09")).toBe("PT0M9S");
    expect(isoDuration("1:02:30")).toBe("PT1H2M30S");
    expect(isoDuration("")).toBeNull();
    expect(isoDuration("3:75")).toBeNull();
  });
});
