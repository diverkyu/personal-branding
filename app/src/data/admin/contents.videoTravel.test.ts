import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, contents, publishJobs } from "@/db/schema";
import { bodyFromPlainText } from "@/content/body";
import type { AdminSession } from "@/lib/auth/types";
import { queryLiveStories } from "../storyQueries";
import { queryLiveTours } from "../tourQueries";
import { queryLiveEquipment } from "../equipmentQueries";
import { createContent, getContent, publishProblems, saveContent, transitionContent, type ContentEdit } from "./contents";
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
  await db.delete(auditLog);
});

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
    const saved = await saveContent(db, admin, row.id, row.version, edit(row.slug, { fields: { videoUrl: "https://youtu.be/dQw4w9WgXcQ", duration: "3:25", hasCaptions: "on" } }));
    await transitionContent(db, admin, row.id, "published", { version: saved.version });
    expect(await getContent(db, admin, row.id)).toMatchObject({ status: "published", fields: { videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: "3:25", hasCaptions: true } });
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
    const sv = await saveContent(db, admin, v.id, v.version, edit(v.slug, { fields: { videoUrl: "https://youtu.be/dQw4w9WgXcQ" } }));
    await transitionContent(db, admin, v.id, "published", { version: sv.version });
    const t = await createContent(db, admin, { type: "travel", title: "발행 여행" });
    const st = await saveContent(db, admin, t.id, t.version, edit(t.slug, { fields: { region: "제주", place: "문섬" } }));
    await transitionContent(db, admin, t.id, "published", { version: st.version });
    expect(await queryLiveStories(db)).toEqual([]);
    expect(await queryLiveTours(db)).toEqual([]);
    expect(await queryLiveEquipment(db)).toEqual([]);
  });
});
