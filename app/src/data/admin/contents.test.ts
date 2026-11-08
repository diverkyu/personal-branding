import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, contents, publishJobs } from "@/db/schema";
import { bodyFromPlainText } from "@/content/body";
import type { AdminSession } from "@/lib/auth/types";
import { MAX_ATTEMPTS, runDuePublishJobs } from "@/data/publishJobs";
import { listAudit } from "./audit";
import {
  contentDashboard,
  createContent,
  deleteContent,
  discardDraft,
  editableView,
  getContent,
  listContents,
  listSchedule,
  parseContentQuery,
  publishDraft,
  retryPublishJob,
  saveContent,
  transitionContent,
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
  await db.delete(auditLog);
});

const edit = (over: Partial<ContentEdit> = {}): ContentEdit => ({
  title: "첫 이야기",
  slug: "first-story",
  summary: "",
  body: bodyFromPlainText("본문 첫 문단\n\n둘째 문단"),
  tags: ["다이빙"],
  answers: [],
  seoTitle: "",
  seoDescription: "",
  origin: "manual",
  originNote: "",
  ...over,
});

async function make(title = "My Story", over: Partial<ContentEdit> = {}) {
  const row = await createContent(db, admin, { type: "story", title });
  const saved = await saveContent(db, admin, row.id, row.version, edit({ title, slug: row.slug, ...over }));
  return { id: row.id, slug: row.slug, version: saved.version };
}

const FUTURE = new Date("2026-12-01T00:00:00Z");
const NOW = new Date("2026-11-10T00:00:00Z");

describe("만들기·저장", () => {
  it("제목에서 주소 이름을 만들고(중복이면 번호), 한글 제목은 대체 이름을 쓴다", async () => {
    const a = await createContent(db, admin, { type: "story", title: "Dive Notes" });
    const b = await createContent(db, admin, { type: "story", title: "Dive Notes" });
    const c = await createContent(db, admin, { type: "story", title: "제주 바다 이야기" });
    expect(a.slug).toBe("dive-notes");
    expect(b.slug).toBe("dive-notes-2");
    expect(c.slug).toMatch(/^story-\d{8}$/);
    expect(a).toMatchObject({ status: "draft", version: 1, origin: "manual" });
  });

  it("알 수 없는 유형·빈 제목·긴 제목은 거부한다", async () => {
    await expect(createContent(db, admin, { type: "hack", title: "x" })).rejects.toThrow("유형");
    await expect(createContent(db, admin, { type: "story", title: "  " })).rejects.toThrow("제목");
    await expect(createContent(db, admin, { type: "story", title: "가".repeat(81) })).rejects.toThrow("80자");
  });

  it("저장은 version 이 맞을 때만 되고, 어긋나면 덮어쓰지 않고 충돌로 알린다", async () => {
    const c = await make("충돌 시험");
    await saveContent(db, admin, c.id, c.version, edit({ title: "먼저 저장", slug: c.slug }));
    await expect(saveContent(db, admin, c.id, c.version, edit({ title: "나중 저장", slug: c.slug }))).rejects.toThrow("다른 곳에서 먼저 저장");
    expect((await getContent(db, admin, c.id))?.title).toBe("먼저 저장");
  });

  it("검증: 태그·질문 개수와 길이, 주소 이름 규칙·예약어, 같은 주소 이름 중복, 본문 형식", async () => {
    const c = await make("검증");
    const v = c.version;
    await expect(saveContent(db, admin, c.id, v, edit({ slug: c.slug, tags: ["a", "b", "c", "d", "e", "f"] }))).rejects.toThrow("5개");
    await expect(saveContent(db, admin, c.id, v, edit({ slug: c.slug, tags: ["가".repeat(21)] }))).rejects.toThrow("20자");
    await expect(saveContent(db, admin, c.id, v, edit({ slug: "Admin Page" }))).rejects.toThrow();
    await expect(saveContent(db, admin, c.id, v, edit({ slug: "admin" }))).rejects.toThrow("사용할 수 없는");
    await expect(saveContent(db, admin, c.id, v, edit({ slug: c.slug, body: { type: "doc", content: [{ type: "script" }] } }))).rejects.toThrow("지원하지 않는");
    await expect(saveContent(db, admin, c.id, v, edit({ slug: c.slug, origin: "hacked" as never }))).rejects.toThrow("제작 방식");
    const other = await make("다른 글");
    await expect(saveContent(db, admin, other.id, other.version, edit({ slug: c.slug }))).rejects.toThrow("이미 있습니다");
  });

  it("저장은 활동 기록에 남지만 본문·제목 내용은 남지 않는다", async () => {
    await make("비밀 제목 시험", { summary: "비밀 요약" });
    const { items } = await listAudit(db, admin, 1);
    expect(items.map((i) => i.action)).toContain("content.save");
    expect(JSON.stringify(items)).not.toMatch(/비밀|본문/);
  });
});

describe("발행 상태 전이", () => {
  it("임시저장 → 검토 → 발행: 점검을 통과해야 하고 발행 시각이 기록된다", async () => {
    const empty = await createContent(db, admin, { type: "story", title: "빈 글" });
    await expect(transitionContent(db, admin, empty.id, "published", { version: empty.version })).rejects.toThrow("본문");
    const c = await make("발행 시험");
    const r = await transitionContent(db, admin, c.id, "review", { version: c.version, now: NOW });
    const p = await transitionContent(db, admin, c.id, "published", { version: r.version, now: NOW });
    expect(p.status).toBe("published");
    const row = (await getContent(db, admin, c.id))!;
    expect(row.publishedAt?.toISOString()).toBe(NOW.toISOString());
    expect(row.publishAt).toBeNull();
  });

  it("허용되지 않은 전이는 거부한다 (보관 → 발행, 발행 → 예약)", async () => {
    const c = await make("전이");
    const a = await transitionContent(db, admin, c.id, "archived", { version: c.version });
    await expect(transitionContent(db, admin, c.id, "published", { version: a.version })).rejects.toThrow("바꿀 수 없습니다");
    const d = await transitionContent(db, admin, c.id, "draft", { version: a.version });
    const p = await transitionContent(db, admin, c.id, "published", { version: d.version });
    await expect(transitionContent(db, admin, c.id, "scheduled", { version: p.version, publishAt: FUTURE, now: NOW })).rejects.toThrow("바꿀 수 없습니다");
  });

  it("자동으로 만든 글은 검토를 거쳐야 발행·예약할 수 있다", async () => {
    const c = await make("자동 글", { origin: "automated" });
    await expect(transitionContent(db, admin, c.id, "published", { version: c.version })).rejects.toThrow("검토");
    await expect(transitionContent(db, admin, c.id, "scheduled", { version: c.version, publishAt: FUTURE, now: NOW })).rejects.toThrow("검토");
    const r = await transitionContent(db, admin, c.id, "review", { version: c.version });
    expect((await transitionContent(db, admin, c.id, "published", { version: r.version })).status).toBe("published");
  });

  it("오래된 화면(version 불일치)에서의 전이는 거부한다", async () => {
    const c = await make("낡은 화면");
    await transitionContent(db, admin, c.id, "review", { version: c.version });
    await expect(transitionContent(db, admin, c.id, "published", { version: c.version })).rejects.toThrow();
  });

  it("예약: 시각 검사, 작업 생성, 예약 취소 시 작업 취소", async () => {
    const c = await make("예약 시험");
    await expect(transitionContent(db, admin, c.id, "scheduled", { version: c.version, now: NOW })).rejects.toThrow("예약 시각");
    await expect(transitionContent(db, admin, c.id, "scheduled", { version: c.version, publishAt: new Date("2026-11-01T00:00:00Z"), now: NOW })).rejects.toThrow("지금보다 뒤");
    const s = await transitionContent(db, admin, c.id, "scheduled", { version: c.version, publishAt: FUTURE, now: NOW });
    const jobs = await db.select().from(publishJobs);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ state: "pending", contentId: c.id });
    expect(jobs[0]!.runAt.toISOString()).toBe(FUTURE.toISOString());
    expect((await getContent(db, admin, c.id))?.status).toBe("scheduled");
    // 예약 취소 = 임시저장
    await transitionContent(db, admin, c.id, "draft", { version: s.version });
    expect((await db.select().from(publishJobs))[0]?.state).toBe("cancelled");
    expect((await getContent(db, admin, c.id))?.publishAt).toBeNull();
  });

  it("DB 제약: 예약인데 시각이 없거나 발행인데 발행 시각이 없는 행은 만들 수 없다", async () => {
    const c = await make("제약");
    await expect(client.query(`update contents set status='scheduled' where id=$1`, [c.id])).rejects.toThrow();
    await expect(client.query(`update contents set status='published' where id=$1`, [c.id])).rejects.toThrow();
    await expect(client.query(`update contents set status='weird' where id=$1`, [c.id])).rejects.toThrow();
  });
});

describe("발행된 글 수정 (초안 칸)", () => {
  it("공개 내용은 그대로 두고 수정은 초안에 쌓이며, 반영하면 공개 내용이 바뀐다", async () => {
    const c = await make("원래 제목");
    const p = await transitionContent(db, admin, c.id, "published", { version: c.version, now: NOW });
    const saved = await saveContent(db, admin, c.id, p.version, edit({ title: "바꾼 제목", slug: c.slug, body: bodyFromPlainText("바뀐 본문") }));
    expect(saved.savedAsDraft).toBe(true);
    let row = (await getContent(db, admin, c.id))!;
    expect(row.title).toBe("원래 제목");
    expect(row.status).toBe("published");
    expect(editableView(row)).toMatchObject({ title: "바꾼 제목", hasDraft: true });
    expect((await listContents(db, admin, parseContentQuery({}))).items[0]?.hasDraft).toBe(true);
    await publishDraft(db, admin, c.id, saved.version);
    row = (await getContent(db, admin, c.id))!;
    expect(row.title).toBe("바꾼 제목");
    expect(row.draft).toBeNull();
    expect(row.publishedAt?.toISOString()).toBe(NOW.toISOString()); // 처음 공개된 시각은 유지
  });

  it("수정 내용을 버릴 수 있고, 발행된 글의 주소 이름은 바꿀 수 없다", async () => {
    const c = await make("버리기");
    const p = await transitionContent(db, admin, c.id, "published", { version: c.version, now: NOW });
    await expect(saveContent(db, admin, c.id, p.version, edit({ slug: "changed-slug" }))).rejects.toThrow("주소 이름은 바꿀 수 없습니다");
    const s = await saveContent(db, admin, c.id, p.version, edit({ title: "임시 수정", slug: c.slug }));
    await discardDraft(db, admin, c.id, s.version);
    expect(editableView((await getContent(db, admin, c.id))!)).toMatchObject({ title: "버리기", hasDraft: false });
    await expect(discardDraft(db, admin, c.id, s.version + 1)).rejects.toThrow("버릴 수정 내용이 없습니다");
  });

  it("수정 내용 반영도 발행 점검을 다시 거친다 (본문을 비우면 반영 불가)", async () => {
    const c = await make("점검");
    const p = await transitionContent(db, admin, c.id, "published", { version: c.version, now: NOW });
    const s = await saveContent(db, admin, c.id, p.version, edit({ slug: c.slug, body: bodyFromPlainText("") }));
    await expect(publishDraft(db, admin, c.id, s.version)).rejects.toThrow("본문");
  });
});

describe("목록·일정·삭제", () => {
  it("유형·상태·검색으로 거르고 상태별 개수를 돌려준다 (와일드카드는 글자)", async () => {
    await make("Alpha Dive");
    const b = await make("Beta 100% Story");
    await transitionContent(db, admin, b.id, "review", { version: b.version });
    const all = await listContents(db, admin, parseContentQuery({}));
    expect(all.total).toBe(2);
    expect(all.counts).toMatchObject({ draft: 1, review: 1, scheduled: 0, published: 0, archived: 0 });
    expect((await listContents(db, admin, parseContentQuery({ status: "review" }))).items.map((i) => i.title)).toEqual(["Beta 100% Story"]);
    expect((await listContents(db, admin, parseContentQuery({ q: "alpha" }))).items).toHaveLength(1);
    expect((await listContents(db, admin, parseContentQuery({ q: "%" }))).items.map((i) => i.title)).toEqual(["Beta 100% Story"]);
    expect((await listContents(db, admin, parseContentQuery({ q: "_" }))).items).toHaveLength(0);
    expect(parseContentQuery({ type: "constructor", status: "bad", page: "-1" })).toEqual({ type: undefined, status: undefined, q: undefined, page: 1 });
  });

  it("삭제하면 목록에서 사라지고 예약 작업이 취소되며, 같은 주소 이름을 다시 쓸 수 있다", async () => {
    const c = await make("삭제 시험");
    const s = await transitionContent(db, admin, c.id, "scheduled", { version: c.version, publishAt: FUTURE, now: NOW });
    void s;
    await deleteContent(db, admin, c.id);
    expect(await getContent(db, admin, c.id)).toBeNull();
    expect((await db.select().from(publishJobs))[0]?.state).toBe("cancelled");
    expect((await listContents(db, admin, parseContentQuery({}))).total).toBe(0);
    await expect(deleteContent(db, admin, c.id)).rejects.toThrow();
    const again = await createContent(db, admin, { type: "story", title: "삭제 시험" });
    expect(again.slug).toBe("story-" + new Date().toISOString().slice(0, 10).replace(/-/g, ""));
    const reused = await createContent(db, admin, { type: "story", title: "Reuse" });
    await deleteContent(db, admin, reused.id);
    expect((await createContent(db, admin, { type: "story", title: "Reuse" })).slug).toBe("reuse");
  });

  it("발행 일정과 대시보드 집계", async () => {
    const a = await make("일정 A");
    const b = await make("일정 B");
    await make("임시");
    await transitionContent(db, admin, a.id, "scheduled", { version: a.version, publishAt: FUTURE, now: NOW });
    await transitionContent(db, admin, b.id, "review", { version: b.version });
    const schedule = await listSchedule(db, admin, NOW);
    expect(schedule.upcoming.map((i) => i.content.title)).toEqual(["일정 A"]);
    expect(await contentDashboard(db, admin)).toEqual({ draft: 1, review: 1, scheduled: 1, failedJobs: 0 });
  });

  it("id 형식이 틀리면 null·거부", async () => {
    expect(await getContent(db, admin, "not-a-uuid")).toBeNull();
    await expect(saveContent(db, admin, "not-a-uuid", 1, edit())).rejects.toThrow();
    await expect(deleteContent(db, admin, "not-a-uuid")).rejects.toThrow();
  });
});

describe("예약 발행 실행 (runDuePublishJobs)", () => {
  async function scheduled(title: string, at: Date) {
    const c = await make(title);
    await transitionContent(db, admin, c.id, "scheduled", { version: c.version, publishAt: at, now: NOW });
    return c;
  }

  it("시각이 된 것만 발행하고 발행 시각은 예약 시각으로 기록한다", async () => {
    const due = await scheduled("지금 나갈 글", new Date("2026-11-12T00:00:00Z"));
    const later = await scheduled("나중 글", new Date("2026-11-20T00:00:00Z"));
    const summary = await runDuePublishJobs(db, new Date("2026-11-12T00:05:00Z"));
    expect(summary).toMatchObject({ published: 1, skipped: 0, failed: 0 });
    const dueRow = (await getContent(db, admin, due.id))!;
    expect(dueRow.status).toBe("published");
    expect(dueRow.publishedAt?.toISOString()).toBe("2026-11-12T00:00:00.000Z");
    expect(dueRow.publishAt).toBeNull();
    expect((await getContent(db, admin, later.id))?.status).toBe("scheduled");
    const jobs = await db.select().from(publishJobs).where(eq(publishJobs.contentId, due.id));
    expect(jobs[0]?.state).toBe("done");
    const audit = (await listAudit(db, admin, 1)).items.find((i) => i.action === "content.publish_scheduled");
    expect(audit).toMatchObject({ actorId: "system", targetId: due.id });
  });

  it("같은 작업이 두 번 실행돼도 한 번만 발행된다 (멱등, 동시 실행 포함)", async () => {
    const c = await scheduled("멱등", new Date("2026-11-12T00:00:00Z"));
    const at = new Date("2026-11-12T01:00:00Z");
    const [r1, r2] = await Promise.all([runDuePublishJobs(db, at), runDuePublishJobs(db, at)]);
    expect(r1.published + r2.published).toBe(1);
    const again = await runDuePublishJobs(db, at);
    expect(again).toEqual({ published: 0, skipped: 0, retried: 0, failed: 0 });
    const audits = (await listAudit(db, admin, 1)).items.filter((i) => i.action === "content.publish_scheduled");
    expect(audits).toHaveLength(1);
    expect((await getContent(db, admin, c.id))?.version).toBeGreaterThan(1);
  });

  it("예약이 취소됐거나 삭제된 글은 발행하지 않고 작업을 정리한다", async () => {
    const a = await scheduled("취소될 글", new Date("2026-11-12T00:00:00Z"));
    const b = await scheduled("삭제될 글", new Date("2026-11-12T00:00:00Z"));
    const row = (await getContent(db, admin, a.id))!;
    await transitionContent(db, admin, a.id, "draft", { version: row.version });
    await deleteContent(db, admin, b.id);
    const summary = await runDuePublishJobs(db, new Date("2026-11-13T00:00:00Z"));
    expect(summary.published).toBe(0);
    expect((await getContent(db, admin, a.id))?.status).toBe("draft");
  });

  it("실패하면 5분 뒤 다시 시도하고, 횟수를 넘으면 failed 로 두며, 다시 시도를 눌러 되살릴 수 있다", async () => {
    const c = await scheduled("실패 시험", new Date("2026-11-12T00:00:00Z"));
    // 발행 단계에서 오류가 나도록 본문을 깨뜨려 두는 대신, 업데이트를 막는 트리거를 건다
    await client.exec(`create or replace function block_publish() returns trigger as $$ begin if new.status = 'published' then raise exception 'blocked'; end if; return new; end; $$ language plpgsql; create trigger block_publish_trg before update on contents for each row execute function block_publish();`);
    try {
      let t = new Date("2026-11-12T00:00:00Z");
      const s1 = await runDuePublishJobs(db, t);
      expect(s1.retried).toBe(1);
      let job = (await db.select().from(publishJobs).where(eq(publishJobs.contentId, c.id)))[0]!;
      expect(job).toMatchObject({ state: "pending", attempts: 1, lastErrorKind: "unknown" });
      expect(job.runAt.getTime()).toBe(t.getTime() + 5 * 60 * 1000);
      expect((await runDuePublishJobs(db, new Date(t.getTime() + 60_000))).retried).toBe(0); // 아직 재시도 시각 전
      for (let i = 1; i < MAX_ATTEMPTS; i++) {
        t = new Date(t.getTime() + 6 * 60 * 1000);
        await runDuePublishJobs(db, t);
      }
      job = (await db.select().from(publishJobs).where(eq(publishJobs.contentId, c.id)))[0]!;
      expect(job).toMatchObject({ state: "failed", attempts: MAX_ATTEMPTS });
      expect((await contentDashboard(db, admin)).failedJobs).toBe(1);
      expect((await listSchedule(db, admin, t)).failed).toHaveLength(1);
      expect((await getContent(db, admin, c.id))?.status).toBe("scheduled");
    } finally {
      await client.exec(`drop trigger block_publish_trg on contents; drop function block_publish();`);
    }
    const failed = (await db.select().from(publishJobs))[0]!;
    await retryPublishJob(db, admin, failed.id);
    const ok = await runDuePublishJobs(db, new Date("2026-11-13T00:00:00Z"));
    expect(ok.published).toBe(1);
    expect((await getContent(db, admin, c.id))?.status).toBe("published");
    await expect(retryPublishJob(db, admin, failed.id)).rejects.toThrow("다시 시도할 작업이 없습니다");
  });

  it("실행이 중간에 끊겨 running 으로 남은 작업을 다시 시도 대상으로 돌린다", async () => {
    const c = await scheduled("끊긴 작업", new Date("2026-11-12T00:00:00Z"));
    await client.query(`update publish_jobs set state='running', attempts=1, claimed_at=$1 where content_id=$2`, [new Date("2026-11-12T00:00:00Z"), c.id]);
    const summary = await runDuePublishJobs(db, new Date("2026-11-12T00:30:00Z"));
    expect(summary.published).toBe(1);
  });
});

describe("호출 규칙", () => {
  it("활성 예약 작업은 콘텐츠마다 하나만 만들 수 있다 (DB 제약)", async () => {
    const c = await make("중복 작업");
    await transitionContent(db, admin, c.id, "scheduled", { version: c.version, publishAt: FUTURE, now: NOW });
    await expect(client.query(`insert into publish_jobs (content_id, run_at) values ($1, now())`, [c.id])).rejects.toThrow();
  });
});
