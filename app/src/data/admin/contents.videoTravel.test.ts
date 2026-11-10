import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, contents, media, publishJobs } from "@/db/schema";
import { bodyFromPlainText } from "@/content/body";
import type { AdminSession } from "@/lib/auth/types";
import { queryLiveStories } from "../storyQueries";
import { queryLiveTours } from "../tourQueries";
import { queryLiveEquipment } from "../equipmentQueries";
import { createContent, getContent, publishProblems, saveContent, transitionContent, type ContentEdit } from "./contents";
import { createMedia, deleteMedia, mediaUsageCount } from "./media";
import type { AdminDb } from "./db";

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
beforeEach(async () => {
  await db.delete(publishJobs);
  await db.delete(contents);
  await db.delete(media);
  await db.delete(auditLog);
});

const photo = (key: string, alt: string | undefined) => createMedia(db, admin, { storage: "local", storageKey: `media/2026/11/${key}.webp`, url: `/media-dev/${key}.webp`, bytes: 1000, width: 1280, height: 720, alt });
const YT = "https://youtu.be/dQw4w9WgXcQ";

const edit = (slug: string, over: Partial<ContentEdit> = {}): ContentEdit => ({ title: "제목", slug, summary: "소개", body: bodyFromPlainText("본문"), tags: [], answers: [], seoTitle: "", seoDescription: "", origin: "manual", originNote: "", ...over });

describe("영상", () => {
  it("빈 영상 항목으로 시작하고, 본문은 없어도 된다. 영상 주소가 없으면 발행할 수 없다", async () => {
    const row = await createContent(db, admin, { type: "video", title: "바다 영상" });
    expect(row).toMatchObject({ type: "video", status: "draft" });
    expect(row.fields).toMatchObject({ videoUrl: "", duration: "", hasCaptions: false });
    const saved = await saveContent(db, admin, row.id, row.version, edit(row.slug, { title: "바다 영상", summary: "", body: bodyFromPlainText(""), fields: { videoUrl: "" } }));
    const current = (await getContent(db, admin, row.id))!;
    const problems = await publishProblems(db, admin, current, false);
    expect(problems.join(" ")).toContain("영상 주소");
    expect(problems.join(" ")).not.toContain("본문");
    await expect(transitionContent(db, admin, row.id, "published", { version: saved.version })).rejects.toThrow("영상 주소");
  });

  it("영상 주소를 넣으면 발행되고, 허용 밖 주소는 저장되지 않는다", async () => {
    const row = await createContent(db, admin, { type: "video", title: "바다 영상" });
    await expect(saveContent(db, admin, row.id, row.version, edit(row.slug, { fields: { videoUrl: "https://example.com/v" } }))).rejects.toThrow("YouTube 또는 Vimeo");
    const poster = await photo("a".repeat(32), "바다 장면");
    const saved = await saveContent(db, admin, row.id, row.version, edit(row.slug, { fields: { videoUrl: YT, duration: "3:25", hasCaptions: "on", posterMediaId: poster.id } }));
    await transitionContent(db, admin, row.id, "published", { version: saved.version });
    expect(await getContent(db, admin, row.id)).toMatchObject({ status: "published", fields: { videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: "3:25", hasCaptions: true, posterMediaId: poster.id } });
  });
});

describe("영상 7a: 포스터·제작 노트", () => {
  it("포스터가 없으면 발행할 수 없고, 대체 텍스트가 없으면 점검에 걸린다", async () => {
    const row = await createContent(db, admin, { type: "video", title: "포스터 점검" });
    const noPoster = await saveContent(db, admin, row.id, row.version, edit(row.slug, { fields: { videoUrl: YT } }));
    expect((await publishProblems(db, admin, (await getContent(db, admin, row.id))!, false)).join(" ")).toContain("포스터 이미지를 골라");
    await expect(transitionContent(db, admin, row.id, "published", { version: noPoster.version })).rejects.toThrow("포스터");
    const noAlt = await photo("c".repeat(32), undefined);
    const withPoster = await saveContent(db, admin, row.id, noPoster.version, edit(row.slug, { fields: { videoUrl: YT, posterMediaId: noAlt.id } }));
    expect((await publishProblems(db, admin, (await getContent(db, admin, row.id))!, false)).join(" ")).toContain("포스터 이미지 1개에 대체 텍스트가 없습니다");
    await expect(transitionContent(db, admin, row.id, "published", { version: withPoster.version })).rejects.toThrow("대체 텍스트");
  });

  it("삭제되었거나 없는 이미지는 포스터로 저장할 수 없고, 포스터로 쓰이는 이미지는 삭제할 수 없다", async () => {
    const row = await createContent(db, admin, { type: "video", title: "포스터 삭제" });
    const gone = await photo("d".repeat(32), "사진");
    await deleteMedia(db, admin, gone.id);
    await expect(saveContent(db, admin, row.id, row.version, edit(row.slug, { fields: { posterMediaId: gone.id } }))).rejects.toThrow("삭제되었거나 없는 이미지");
    await expect(saveContent(db, admin, row.id, row.version, edit(row.slug, { fields: { posterMediaId: "22222222-2222-4222-8222-222222222222" } }))).rejects.toThrow("삭제되었거나 없는 이미지");
    const live = await photo("e".repeat(32), "사진");
    await saveContent(db, admin, row.id, row.version, edit(row.slug, { fields: { posterMediaId: live.id } }));
    expect(await mediaUsageCount(db, admin, live.id)).toBe(1);
    await expect(deleteMedia(db, admin, live.id)).rejects.toThrow("쓰이고");
  });

  it("표시 문구·대표 작품·제작 노트가 저장되고 다시 읽힌다 (줄바꿈 유지, 비워도 발행 가능)", async () => {
    const row = await createContent(db, admin, { type: "video", title: "노트" });
    const poster = await photo("f".repeat(32), "장면");
    const notes = "첫 줄\n둘째 줄  (띄어쓰기 두 칸)";
    const saved = await saveContent(db, admin, row.id, row.version, edit(row.slug, { fields: { videoUrl: YT, posterMediaId: poster.id, cutLabel: "ROUGH CUT", featured: "on", sceneIntent: notes, promptNotes: "", editNotes: "" } }));
    expect((await getContent(db, admin, row.id))?.fields).toMatchObject({ cutLabel: "ROUGH CUT", featured: true, sceneIntent: notes, promptNotes: "", editNotes: "" });
    await transitionContent(db, admin, row.id, "published", { version: saved.version });
    expect((await getContent(db, admin, row.id))?.status).toBe("published");
  });

  it("발행된 영상을 고치면 수정 중인 내용(draft)에 쌓이고 공개 내용은 바뀌지 않는다", async () => {
    const row = await createContent(db, admin, { type: "video", title: "발행 후 수정" });
    const poster = await photo("9".repeat(32), "장면");
    const saved = await saveContent(db, admin, row.id, row.version, edit(row.slug, { fields: { videoUrl: YT, posterMediaId: poster.id, promptNotes: "공개 전 프롬프트" } }));
    await transitionContent(db, admin, row.id, "published", { version: saved.version });
    const cur = (await getContent(db, admin, row.id))!;
    await saveContent(db, admin, row.id, cur.version, edit(row.slug, { fields: { videoUrl: YT, posterMediaId: poster.id, promptNotes: "고친 프롬프트" } }));
    const after = (await getContent(db, admin, row.id))!;
    expect(after.fields).toMatchObject({ promptNotes: "공개 전 프롬프트" });
    expect(after.draft).toMatchObject({ fields: { promptNotes: "고친 프롬프트" } });
  });

  it("너무 긴 노트·제어 문자는 저장되지 않는다", async () => {
    const row = await createContent(db, admin, { type: "video", title: "검증" });
    await expect(saveContent(db, admin, row.id, row.version, edit(row.slug, { fields: { sceneIntent: "가".repeat(1501) } }))).rejects.toThrow("1500자");
    await expect(saveContent(db, admin, row.id, row.version, edit(row.slug, { fields: { editNotes: "a\u0000b" } }))).rejects.toThrow("쓸 수 없는 문자");
    expect((await getContent(db, admin, row.id))?.version).toBe(row.version);
  });
});

describe("여행 추천", () => {
  it("한 줄 소개·지역·장소가 있어야 발행된다", async () => {
    const row = await createContent(db, admin, { type: "travel", title: "제주 문섬" });
    expect(row.fields).toMatchObject({ region: "", place: "", level: "" });
    const empty = await saveContent(db, admin, row.id, row.version, edit(row.slug, { summary: "", fields: {} }));
    const problems = (await publishProblems(db, admin, (await getContent(db, admin, row.id))!, false)).join(" ");
    expect(problems).toContain("지역");
    expect(problems).toContain("장소");
    expect(problems).toContain("한 줄 소개");
    await expect(transitionContent(db, admin, row.id, "published", { version: empty.version })).rejects.toThrow();
    const full = await saveContent(db, admin, row.id, empty.version, edit(row.slug, { summary: "맑은 물과 부드러운 조류", fields: { region: "제주", place: "서귀포 문섬", season: "5~10월", level: "beginner", budget: "1인 약 80만 원", checkedAt: "2026-11-01" } }));
    await transitionContent(db, admin, row.id, "published", { version: full.version });
    expect((await getContent(db, admin, row.id))?.status).toBe("published");
  });

  it("알 수 없는 난이도는 거부한다", async () => {
    const row = await createContent(db, admin, { type: "travel", title: "제주" });
    await expect(saveContent(db, admin, row.id, row.version, edit(row.slug, { fields: { level: "expert" } }))).rejects.toThrow("난이도");
  });
});

describe("공개 화면 누출 방지 — 공개 화면이 없는 유형은 어떤 공개 조회에도 나오지 않는다", () => {
  it("발행된 영상·여행 추천이 스토리·투어·장비 조회에 섞이지 않는다", async () => {
    const v = await createContent(db, admin, { type: "video", title: "발행 영상" });
    const poster = await photo("b".repeat(32), "포스터");
    const sv = await saveContent(db, admin, v.id, v.version, edit(v.slug, { fields: { videoUrl: YT, posterMediaId: poster.id } }));
    await transitionContent(db, admin, v.id, "published", { version: sv.version });
    const t = await createContent(db, admin, { type: "travel", title: "발행 여행" });
    const st = await saveContent(db, admin, t.id, t.version, edit(t.slug, { fields: { region: "제주", place: "문섬" } }));
    await transitionContent(db, admin, t.id, "published", { version: st.version });
    expect(await queryLiveStories(db)).toEqual([]);
    expect(await queryLiveTours(db)).toEqual([]);
    expect(await queryLiveEquipment(db)).toEqual([]);
  });
});
