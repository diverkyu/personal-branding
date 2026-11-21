/**
 * 개발 DB 시험 데이터 (투어 4개 + 신청·문의). 어드민에서 투어 신청이 어떻게 보이는지 확인하는 용도다.
 *
 *   npm run dev:seed          # 시험 투어·신청 넣기 (이미 있으면 먼저 지우고 다시 넣는다)
 *   npm run dev:seed-clean    # 시험 데이터만 지우기
 *
 * - 대상 DB 는 DATABASE_URL (.env.local) 이다. **개발(dev) DB 에서만 쓴다** (AGENTS §8).
 * - 시험 데이터는 모두 가상이다: 주소 이름 `test-` 로 시작, 이름 "테스트 …", 이메일 `…@example.com`, 연락처 010-0000-00xx.
 * - 안전장치: 시험이 아닌 발행 콘텐츠가 DB 에 있으면(운영 DB 일 가능성) 멈춘다. 개발 DB 임을 확인했다면 `--force` 로 넘어간다.
 * - 비밀번호·연결 주소는 입력받지도 출력하지도 않는다.
 */
import { and, eq, like, ne, sql } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { auditLog, contents, inquiries } from "../src/db/schema";
import { bodyFromPlainText } from "../src/content/body";
import { BUILTIN_VERSION } from "../src/settings/consent";
import { createContent, saveContent, transitionContent } from "../src/data/admin/contents";
import type { AdminDb } from "../src/data/admin/db";
import type { AdminSession } from "../src/lib/auth/types";

const ACTOR: AdminSession = { userId: "dev-seed", name: "시험 데이터", email: "dev-seed@example.com" };
const PREFIX = "test-";
const DAY = 24 * 60 * 60 * 1000;

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/** 한국 시간 기준 오늘에서 n일 뒤의 날짜 (YYYY-MM-DD) */
function kstDay(offsetDays: number): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + offsetDays * DAY));
}

const TOURS = [
  { slug: `${PREFIX}tour-recruiting`, title: "[시험] 모집 중 투어", recruit: "recruiting", start: 45, end: 48, capacity: 8, place: "시험 해변 (가상 장소)", fee: "참가비는 시험용 문구입니다." },
  { slug: `${PREFIX}tour-upcoming`, title: "[시험] 모집 예정 투어", recruit: "upcoming", start: 90, end: 93, capacity: 6, place: "시험 섬 (가상 장소)", fee: "모집이 시작되면 안내합니다." },
  { slug: `${PREFIX}tour-closed`, title: "[시험] 모집 마감 투어", recruit: "closed", start: 20, end: 22, capacity: 6, place: "시험 만 (가상 장소)", fee: "마감된 시험 투어입니다." },
  { slug: `${PREFIX}tour-ended`, title: "[시험] 종료된 투어", recruit: "closed", start: -40, end: -37, capacity: 8, place: "시험 포구 (가상 장소)", fee: "종료된 시험 투어입니다." },
] as const;

interface SeedInquiry {
  kind: "reservation" | "notice";
  tour: string;
  status: string;
  daysAgo: number;
  memo?: string;
}

/** 어드민 화면에서 상태별 표시, 필터, 보유 기간 경과(자동 삭제 대상)를 볼 수 있게 섞어 둔다 */
const INQUIRIES: SeedInquiry[] = [
  { kind: "reservation", tour: "recruiting", status: "new", daysAgo: 0 },
  { kind: "reservation", tour: "recruiting", status: "new", daysAgo: 1 },
  { kind: "reservation", tour: "recruiting", status: "new", daysAgo: 3 },
  { kind: "reservation", tour: "recruiting", status: "checked", daysAgo: 6, memo: "시험 메모: 연락 완료" },
  { kind: "reservation", tour: "recruiting", status: "confirmed", daysAgo: 12, memo: "시험 메모: 참가 확정" },
  { kind: "reservation", tour: "recruiting", status: "cancelled", daysAgo: 20 },
  { kind: "reservation", tour: "closed", status: "confirmed", daysAgo: 30 },
  { kind: "reservation", tour: "ended", status: "confirmed", daysAgo: 60 },
  // 보유 기간(365일)이 지난 신청: 정기 정리가 돌면 지워지는 것(확정은 제외)을 확인하는 용도
  { kind: "reservation", tour: "ended", status: "checked", daysAgo: 400, memo: "시험: 보유 기간 경과(자동 삭제 대상)" },
  { kind: "reservation", tour: "ended", status: "confirmed", daysAgo: 400, memo: "시험: 보유 기간 경과이지만 확정이라 자동 삭제 제외" },
  { kind: "notice", tour: "upcoming", status: "new", daysAgo: 0 },
  { kind: "notice", tour: "upcoming", status: "new", daysAgo: 2 },
  { kind: "notice", tour: "upcoming", status: "notified", daysAgo: 9 },
  { kind: "notice", tour: "upcoming", status: "new", daysAgo: 400, memo: "시험: 보유 기간 경과(자동 삭제 대상)" },
];

async function clean(db: AdminDb): Promise<{ inquiries: number; tours: number }> {
  const gone = await db.delete(inquiries).where(like(inquiries.tourSlug, `${PREFIX}%`)).returning({ id: inquiries.id });
  const tours = await db.delete(contents).where(like(contents.slug, `${PREFIX}%`)).returning({ id: contents.id });
  await db.delete(auditLog).where(eq(auditLog.actorId, ACTOR.userId));
  return { inquiries: gone.length, tours: tours.length };
}

async function seed(db: AdminDb) {
  const removed = await clean(db);
  if (removed.tours + removed.inquiries > 0) process.stdout.write(`이전 시험 데이터를 지웠습니다 (투어 ${removed.tours}, 신청 ${removed.inquiries}).\n`);

  for (const t of TOURS) {
    const created = await createContent(db, ACTOR, { type: "tour", title: t.title });
    const saved = await saveContent(db, ACTOR, created.id, created.version, {
      title: t.title,
      slug: t.slug,
      summary: "어드민에서 투어 신청이 어떻게 보이는지 확인하기 위한 가상 투어입니다.",
      body: bodyFromPlainText("이 투어는 개발 DB 시험용 가상 데이터입니다.\n\n실제 투어가 아닙니다."),
      tags: ["시험"],
      answers: [],
      seoTitle: "",
      seoDescription: "",
      origin: "manual",
      originNote: "dev-seed 시험 데이터",
      fields: { startDate: kstDay(t.start), endDate: kstDay(t.end), place: t.place, recruit: t.recruit, capacity: t.capacity, feeNote: t.fee, videos: [], gallery: [] },
    });
    await transitionContent(db, ACTOR, created.id, "published", { version: saved.version });
  }

  const now = Date.now();
  const rows = INQUIRIES.map((q, i) => {
    const n = String(i + 1).padStart(2, "0");
    const at = new Date(now - q.daysAgo * DAY - i * 60_000);
    return {
      kind: q.kind,
      tourSlug: `${PREFIX}tour-${q.tour}`,
      name: `테스트 신청자 ${n}`,
      phone: q.kind === "reservation" ? `010-0000-00${n}` : null,
      email: `test-${n}@example.com`,
      people: q.kind === "reservation" ? (i % 3) + 1 : null,
      experience: q.kind === "reservation" ? "시험 입력: 프리다이빙 입문 과정 수료" : null,
      message: q.kind === "reservation" ? `시험 문의 내용 ${n}입니다. 실제 신청이 아닙니다.` : null,
      consentAt: at,
      consentVersion: BUILTIN_VERSION,
      receivedAt: at,
      status: q.status,
      memo: q.memo ?? null,
    };
  });
  await db.insert(inquiries).values(rows);
  process.stdout.write(`시험 데이터를 넣었습니다: 투어 ${TOURS.length}개, 신청 ${rows.length}건 (보유 기간 경과 3건 포함).\n`);
}

async function main() {
  const command = process.argv[2];
  if (command !== "seed" && command !== "clean") fail("사용법: dev:seed 또는 dev:seed-clean");
  const url = process.env.DATABASE_URL?.trim();
  if (!url) fail("DATABASE_URL 이 없습니다 (.env.local 확인)");
  if (process.env.VERCEL) fail("배포 환경에서는 실행하지 않습니다.");
  const db = getDb(url) as unknown as AdminDb;

  // 안전장치: 시험이 아닌 발행 콘텐츠가 있으면 운영 DB 일 수 있다
  const real = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(contents)
    .where(and(eq(contents.status, "published"), ne(contents.originNote, "dev-seed 시험 데이터")));
  const realCount = real[0]?.n ?? 0;
  if (realCount > 0 && !process.argv.includes("--force")) {
    fail(`시험이 아닌 발행 콘텐츠가 ${realCount}개 있습니다. 운영 DB 일 수 있어 멈춥니다. 개발 DB 임을 확인했다면 --force 를 붙여 주세요.`);
  }

  if (command === "clean") {
    const removed = await clean(db);
    process.stdout.write(`시험 데이터를 지웠습니다: 투어 ${removed.tours}개, 신청 ${removed.inquiries}건.\n`);
    return;
  }
  await seed(db);
}

main().then(
  () => process.exit(0),
  (error) => {
    process.stderr.write(`실패: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  },
);
