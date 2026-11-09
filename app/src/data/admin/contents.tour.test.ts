import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, contents, media, publishJobs } from "@/db/schema";
import { bodyFromPlainText } from "@/content/body";
import { cleanTourFields } from "@/content/tourFields";
import type { AdminSession } from "@/lib/auth/types";
import { listAudit } from "./audit";
import { createMedia, deleteMedia, mediaUsageCount } from "./media";
import {
  createContent,
  editableView,
  getContent,
  listTourOptions,
  parseContentQuery,
  publishDraft,
  publishProblems,
  saveContent,
  setRecruitStatus,
  transitionContent,
  listContents,
  type ContentEdit,
} from "./contents";
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

const tourFields = (over: Record<string, unknown> = {}) => ({ startDate: "2026-12-05", endDate: "2026-12-07", place: "제주 서귀포", recruit: "recruiting", capacity: "8", feeNote: "", videos: [] as string[], gallery: [] as unknown[], ...over });
const edit = (slug: string, over: Partial<ContentEdit> = {}): ContentEdit => ({
  title: "제주 투어",
  slug,
  summary: "",
  body: bodyFromPlainText("투어 소개 문단"),
  tags: [],
  answers: [],
  seoTitle: "",
  seoDescription: "",
  origin: "manual",
  originNote: "",
  fields: tourFields(),
  ...over,
});

async function makeTour(title = "Jeju Tour", over: Partial<ContentEdit> = {}) {
  const row = await createContent(db, admin, { type: "tour", title });
  const saved = await saveContent(db, admin, row.id, row.version, edit(row.slug, { title, ...over }));
  return { id: row.id, slug: row.slug, version: saved.version };
}
const photo = (alt: string | undefined, key: string) => createMedia(db, admin, { storage: "local", storageKey: `media/2026/11/${key}.webp`, url: `/media-dev/${key}.webp`, bytes: 1000, width: 800, height: 600, alt });

describe("투어 만들기·저장", () => {
  it("새 투어는 투어 기본값(모집 예정, 빈 일정)으로 시작한다", async () => {
    const row = await createContent(db, admin, { type: "tour", title: "Jeju Tour" });
    expect(row).toMatchObject({ type: "tour", status: "draft", slug: "jeju-tour" });
    expect(row.fields).toMatchObject({ startDate: "", endDate: "", place: "", recruit: "upcoming", capacity: null });
  });

  it("임시저장은 일정이 비어 있어도 되고, 저장한 항목이 그대로 돌아온다", async () => {
    const t = await makeTour("Draft Tour", { fields: tourFields({ startDate: "", endDate: "", place: "" }) });
    expect((await getContent(db, admin, t.id))?.fields).toMatchObject({ startDate: "", place: "", capacity: 8 });
    const t2 = await makeTour("Full Tour", { fields: tourFields({ feeNote: "참가비 안내", videos: ["https://youtu.be/dQw4w9WgXcQ"] }) });
    expect((await getContent(db, admin, t2.id))?.fields).toMatchObject({ startDate: "2026-12-05", endDate: "2026-12-07", place: "제주 서귀포", capacity: 8, feeNote: "참가비 안내", videos: ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"] });
  });

  it("잘못된 투어 항목은 저장을 거부한다 (날짜 순서·모집 상태·영상 도메인·없는 이미지)", async () => {
    const row = await createContent(db, admin, { type: "tour", title: "Bad Tour" });
    const save = (fields: Record<string, unknown>) => saveContent(db, admin, row.id, row.version, edit(row.slug, { fields }));
    await expect(save(tourFields({ startDate: "2026-12-09" }))).rejects.toThrow("같거나 그 뒤");
    await expect(save(tourFields({ recruit: "ended" }))).rejects.toThrow("모집 상태");
    await expect(save(tourFields({ videos: ["https://evil.example/x"] }))).rejects.toThrow("YouTube 또는 Vimeo");
    await expect(save(tourFields({ gallery: [{ mediaId: "22222222-2222-4222-8222-222222222222", caption: "" }] }))).rejects.toThrow("삭제되었거나 없는 이미지");
    expect((await getContent(db, admin, row.id))?.version).toBe(row.version);
  });

  it("스토리에 투어 항목을 보내도 저장되지 않는다", async () => {
    const story = await createContent(db, admin, { type: "story", title: "A Story" });
    await saveContent(db, admin, story.id, story.version, edit(story.slug, { title: "A Story", fields: tourFields() }));
    expect((await getContent(db, admin, story.id))?.fields).toEqual({});
  });
});

describe("발행 점검", () => {
  it("일정·장소가 비어 있으면 발행·예약이 막히고, 채우면 통과한다", async () => {
    const t = await makeTour("Check Tour", { fields: tourFields({ startDate: "", endDate: "", place: "" }) });
    const row = (await getContent(db, admin, t.id))!;
    const problems = await publishProblems(db, admin, row, false);
    expect(problems).toEqual(expect.arrayContaining(["시작일을 입력해 주세요.", "종료일을 입력해 주세요.", "장소를 입력해 주세요."]));
    await expect(transitionContent(db, admin, t.id, "published", { version: t.version })).rejects.toThrow("장소를 입력해 주세요");
    const ok = await makeTour("Ready Tour");
    await expect(transitionContent(db, admin, ok.id, "published", { version: ok.version })).resolves.toMatchObject({ status: "published" });
  });

  it("갤러리 사진에 대체 텍스트가 없으면 발행이 막힌다", async () => {
    const noAlt = await photo(undefined, "noalt");
    const t = await makeTour("Photo Tour", { fields: tourFields({ gallery: [{ mediaId: noAlt.id, caption: "" }] }) });
    await expect(transitionContent(db, admin, t.id, "published", { version: t.version })).rejects.toThrow("갤러리 사진 1개에 대체 텍스트가 없습니다");
  });

  it("투어 소개(본문)가 비어 있으면 막힌다", async () => {
    const t = await makeTour("Empty Body Tour", { body: bodyFromPlainText("") });
    await expect(transitionContent(db, admin, t.id, "published", { version: t.version })).rejects.toThrow("본문");
  });
});

describe("발행된 투어 수정", () => {
  it("일정·장소를 고치면 draft 칸에 쌓이고, 수정 내용 발행 때 공개 내용이 바뀐다", async () => {
    const t = await makeTour("Live Tour");
    const published = await transitionContent(db, admin, t.id, "published", { version: t.version });
    const saved = await saveContent(db, admin, t.id, published.version, edit(t.slug, { title: "Live Tour", fields: tourFields({ place: "새 장소", startDate: "2027-01-10", endDate: "2027-01-12" }) }));
    expect(saved.savedAsDraft).toBe(true);
    let row = (await getContent(db, admin, t.id))!;
    expect(row.fields).toMatchObject({ place: "제주 서귀포", startDate: "2026-12-05" });
    expect(editableView(row).fields).toMatchObject({ place: "새 장소", startDate: "2027-01-10" });
    await publishDraft(db, admin, t.id, saved.version);
    row = (await getContent(db, admin, t.id))!;
    expect(row.fields).toMatchObject({ place: "새 장소", startDate: "2027-01-10", endDate: "2027-01-12" });
    expect(row.draft).toBeNull();
  });

  it("모집 상태는 수정 내용 발행 없이 바로 바뀌고, 수정 중인 내용 안의 값도 함께 바뀐다", async () => {
    const t = await makeTour("Recruit Tour");
    const published = await transitionContent(db, admin, t.id, "published", { version: t.version });
    const saved = await saveContent(db, admin, t.id, published.version, edit(t.slug, { title: "Recruit Tour", fields: tourFields({ place: "수정 중 장소" }) }));
    const r = await setRecruitStatus(db, admin, t.id, saved.version, "closed");
    const row = (await getContent(db, admin, t.id))!;
    expect(r.version).toBe(saved.version + 1);
    expect(row.fields).toMatchObject({ recruit: "closed", place: "제주 서귀포" });
    expect((row.draft as { fields: Record<string, unknown> }).fields).toMatchObject({ recruit: "closed", place: "수정 중 장소" });
    // 나중에 수정 내용을 발행해도 마감이 다시 열리지 않는다
    await publishDraft(db, admin, t.id, r.version);
    expect((await getContent(db, admin, t.id))?.fields).toMatchObject({ recruit: "closed", place: "수정 중 장소" });
    const log = await listAudit(db, admin, 1);
    expect(log.items.some((a) => a.action === "content.recruit_status")).toBe(true);
  });

  it("모집 상태 변경: 잘못된 값·스토리·낡은 version 은 거부한다", async () => {
    const t = await makeTour("Guard Tour");
    await expect(setRecruitStatus(db, admin, t.id, t.version, "ended")).rejects.toThrow("모집 상태");
    await expect(setRecruitStatus(db, admin, t.id, t.version + 5, "closed")).rejects.toThrow("다른 곳에서 먼저 저장");
    const story = await createContent(db, admin, { type: "story", title: "Story" });
    await expect(setRecruitStatus(db, admin, story.id, story.version, "closed")).rejects.toThrow("찾을 수 없습니다");
    expect((await getContent(db, admin, t.id))?.fields).toMatchObject({ recruit: "recruiting" });
  });
});

describe("이미지 사용·목록", () => {
  it("갤러리에 쓰이는 이미지는 삭제할 수 없고, 빼면 삭제할 수 있다", async () => {
    const m = await photo("바다", "gal");
    const t = await makeTour("Gallery Tour", { fields: tourFields({ gallery: [{ mediaId: m.id, caption: "" }] }) });
    expect(await mediaUsageCount(db, admin, m.id)).toBe(1);
    await expect(deleteMedia(db, admin, m.id)).rejects.toThrow("쓰이고 있어 삭제할 수 없습니다");
    await saveContent(db, admin, t.id, t.version, edit(t.slug, { title: "Gallery Tour", fields: tourFields({ gallery: [] }) }));
    expect(await mediaUsageCount(db, admin, m.id)).toBe(0);
    await expect(deleteMedia(db, admin, m.id)).resolves.toBeDefined();
  });

  it("수정 중인 내용에서만 쓰는 이미지도 삭제할 수 없다", async () => {
    const m = await photo("수정 중 사진", "draftgal");
    const t = await makeTour("Draft Gallery Tour");
    const published = await transitionContent(db, admin, t.id, "published", { version: t.version });
    await saveContent(db, admin, t.id, published.version, edit(t.slug, { title: "Draft Gallery Tour", fields: tourFields({ gallery: [{ mediaId: m.id, caption: "" }] }) }));
    expect(await mediaUsageCount(db, admin, m.id)).toBe(1);
  });

  it("유형으로 목록을 거른다", async () => {
    await createContent(db, admin, { type: "story", title: "Only Story" });
    await makeTour("Only Tour");
    const tours = await listContents(db, admin, parseContentQuery({ type: "tour" }));
    expect(tours.items.map((i) => i.title)).toEqual(["Only Tour"]);
    expect(parseContentQuery({ type: "hack" }).type).toBeUndefined();
  });

  it("신청 화면용 투어 이름 목록에는 공개 전·종료된 투어도 들어가고 삭제된 투어는 빠진다", async () => {
    await makeTour("Old Tour", { fields: tourFields({ startDate: "2025-01-01", endDate: "2025-01-02" }) });
    await makeTour("New Tour", { fields: tourFields({ startDate: "2027-01-01", endDate: "2027-01-02" }) });
    await createContent(db, admin, { type: "story", title: "A Story" });
    const opts = await listTourOptions(db, admin);
    expect(opts.map((o) => o.title)).toEqual(["New Tour", "Old Tour"]);
  });
});

describe("cleanTourFields 와 같은 규칙", () => {
  it("저장된 항목은 다시 검사해도 같다 (왕복 동일)", async () => {
    const t = await makeTour("Round Trip", { fields: tourFields({ videos: ["https://vimeo.com/123456"], feeNote: "안내" }) });
    const stored = (await getContent(db, admin, t.id))!.fields;
    expect(cleanTourFields(stored)).toEqual(stored);
  });
});
