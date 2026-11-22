/**
 * 개발 DB 시험 데이터: 사이트의 모든 영역을 가상 데이터로 채운다. 웹과 어드민에서 실제처럼 확인하는 용도다.
 *
 *   npm run dev:seed          # 시험 데이터 넣기 (이미 있으면 먼저 지우고 다시 넣는다)
 *   npm run dev:seed-clean    # 시험 데이터만 지우기
 *
 * 채우는 것: Story·Films·장비·여행 추천·투어(+신청·문의)·수강 후기·About·동의 문구·처리방침·미디어(이미지)
 * 와 상태별 예(임시저장·검토·예약·보관·수정 중 초안·휴지통).
 *
 * - 대상 DB 는 DATABASE_URL (.env.local) 이다. **개발(dev) DB 에서만 쓴다** (AGENTS §8).
 * - 모두 가상이다: 주소 이름 `test-` 로 시작, 글에는 "[시험]" 표시, 이메일 `…@example.com`, 연락처 010-0000-00xx, 이미지는 서버가 그린 색 그림.
 * - 이미지는 로컬 저장소(`app/.media-dev`)에 저장한다(`MEDIA_STORE=local` 이 자동으로 적용된다). 개발 서버가 이 그림을 보여 주려면
 *   `.env.local` 에도 `MEDIA_STORE=local` 이 있어야 한다. Preview(Vercel)에서는 이 로컬 이미지가 보이지 않는다.
 * - 안전장치: 시험이 아닌 발행 콘텐츠가 DB 에 있으면(운영 DB 일 가능성) 멈춘다. 개발 DB 임을 확인했다면 `--force` 로 넘어간다.
 * - 비밀번호·연결 주소는 입력받지도 출력하지도 않는다.
 */
import { and, eq, inArray, like, ne, sql } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { about, auditLog, consentVersions, contents, inquiries, media, publishJobs, reviewRevisions, reviews, siteSettings } from "../src/db/schema";
import { BUILTIN_VERSION } from "../src/settings/consent";
import { createContent, deleteContent, saveContent, transitionContent } from "../src/data/admin/contents";
import { saveAboutDraft, publishAbout } from "../src/data/admin/about";
import { publishHero, saveHeroDraft } from "../src/data/admin/homeHero";
import { addRegisteredTerm } from "../src/data/admin/taxonomyRegistry";
import { HERO_SETTING_KEY, readHeroState } from "../src/home/heroImage";
import { createReview, deleteReview, setReviewStatus, withdrawReview } from "../src/data/admin/reviews";
import { publishConsentVersion } from "../src/data/admin/settings";
import { deleteMedia } from "../src/data/admin/media";
import { storeUploadedImage } from "../src/data/admin/mediaUpload";
import type { AdminDb } from "../src/data/admin/db";
import type { AdminSession } from "../src/lib/auth/types";
import { getMediaStorage, type MediaStorage } from "../src/media/storage";
import type { BodyDoc } from "../src/content/body";
import { INSTAGRAM_SAMPLE, MARK, ORIGIN_NOTE, STORY_TAGS, SLUG_PREFIX as PREFIX, VIMEO_SAMPLE, YOUTUBE_SAMPLE, YOUTUBE_SAMPLE_2, artwork, code, doc, h2, h3, hr, img, longParagraphs, ol, p, quote, table, ul, video } from "./dev-seed-data";

const ACTOR: AdminSession = { userId: "dev-seed", name: "시험 데이터", email: "dev-seed@example.com" };
const DAY = 24 * 60 * 60 * 1000;

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/** 한국 시간 기준 오늘에서 n일 뒤의 날짜 (YYYY-MM-DD) */
function kstDay(offsetDays: number): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + offsetDays * DAY));
}

// ---------- 지우기 ----------

interface Cleaned {
  contents: number;
  reviews: number;
  inquiries: number;
  media: number;
}

async function clean(db: AdminDb, storage: MediaStorage | null): Promise<Cleaned> {
  const gone = await db.delete(inquiries).where(like(inquiries.tourSlug, `${PREFIX}%`)).returning({ id: inquiries.id });

  const revIds = (await db.select({ id: reviews.id }).from(reviews).where(like(reviews.body, `${MARK}%`))).map((r) => r.id);
  if (revIds.length > 0) await db.delete(reviewRevisions).where(inArray(reviewRevisions.reviewId, revIds));
  const revs = revIds.length > 0 ? await db.delete(reviews).where(inArray(reviews.id, revIds)).returning({ id: reviews.id }) : [];

  const ids = (await db.select({ id: contents.id }).from(contents).where(like(contents.slug, `${PREFIX}%`))).map((r) => r.id);
  if (ids.length > 0) await db.delete(publishJobs).where(inArray(publishJobs.contentId, ids));
  const cts = ids.length > 0 ? await db.delete(contents).where(inArray(contents.id, ids)).returning({ id: contents.id }) : [];

  // About·동의 문구 (시험 표시가 있는 것만)
  await db.delete(about).where(and(eq(about.id, "main"), like(about.headline, `${MARK}%`)));
  await db.delete(consentVersions).where(like(consentVersions.body, `${MARK}%`));

  // 이미지: 시험 데이터가 만든 것(만든 사람이 시험 계정)만. 파일도 함께 지운다
  const files = await db.select({ id: media.id, key: media.storageKey }).from(media).where(eq(media.createdBy, ACTOR.userId));
  // 홈 히어로가 시험 이미지를 쓰고 있으면 기본 일러스트로 되돌린다 (사람이 고른 이미지는 건드리지 않는다)
  const [hero] = await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, HERO_SETTING_KEY)).limit(1);
  if (hero) {
    const state = readHeroState(hero.value);
    const seedIds = new Set(files.map((f) => f.id));
    if ((state.published && seedIds.has(state.published)) || (state.draft?.mediaId && seedIds.has(state.draft.mediaId))) await db.delete(siteSettings).where(eq(siteSettings.key, HERO_SETTING_KEY));
  }
  for (const f of files) await storage?.remove(f.key).catch(() => undefined);
  if (files.length > 0) await db.delete(media).where(inArray(media.id, files.map((f) => f.id)));

  await db.delete(auditLog).where(eq(auditLog.actorId, ACTOR.userId));
  return { contents: cts.length, reviews: revs.length, inquiries: gone.length, media: files.length };
}

// ---------- 이미지 ----------

interface Images {
  cover: string[];
  poster: string[];
  gear: string[];
  profile: string;
  hero: string;
  fillerCount: number;
}

async function putImage(db: AdminDb, storage: MediaStorage, w: number, h: number, i: number, alt: string): Promise<string> {
  const buf = await artwork(w, h, i);
  const row = await storeUploadedImage(db, ACTOR, storage, { size: buf.length, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer }, alt);
  return row.id;
}

async function makeImages(db: AdminDb, storage: MediaStorage): Promise<Images> {
  const cover: string[] = [];
  for (let i = 0; i < 8; i++) cover.push(await putImage(db, storage, 1200, 800, i, `${MARK} 바다 풍경 그림 ${i + 1} (가상 이미지)`));
  const poster: string[] = [];
  for (let i = 0; i < 5; i++) poster.push(await putImage(db, storage, 720, 1280, 10 + i, `${MARK} 세로 영상 포스터 그림 ${i + 1} (가상 이미지)`));
  const gear: string[] = [];
  for (let i = 0; i < 7; i++) gear.push(await putImage(db, storage, 800, 800, 20 + i, `${MARK} 장비 사진 자리 그림 ${i + 1} (가상 이미지)`));
  const profile = await putImage(db, storage, 800, 1000, 30, `${MARK} 프로필 사진 자리 그림 (가상 이미지, 실제 사람이 아님)`);
  const hero = await putImage(db, storage, 1280, 1560, 35, `${MARK} 홈 히어로 시험 그림 (가상 이미지)`);
  // 미디어 보관함이 한 쪽(24장)을 넘어 쪽 이동이 보이도록 작은 그림을 더한다
  const fillerCount = 26;
  for (let i = 0; i < fillerCount; i++) await putImage(db, storage, 400, 300, 40 + i, `${MARK} 보관함 확인용 그림 ${i + 1}`);
  return { cover, poster, gear, profile, hero, fillerCount };
}

// ---------- 콘텐츠 ----------

type Final = "published" | "draft" | "review" | "scheduled" | "archived" | "trashed";

interface Spec {
  type: "story" | "video" | "equipment" | "travel" | "tour";
  slug: string;
  title: string;
  summary: string;
  body?: BodyDoc;
  tags?: string[];
  answers?: string[];
  fields?: unknown;
  final: Final;
  /** 발행 뒤 수정 중인 초안(공개 내용은 그대로)을 남기려면 */
  draftTitle?: string;
}

async function put(db: AdminDb, s: Spec): Promise<string> {
  const created = await createContent(db, ACTOR, { type: s.type, title: s.title });
  const saved = await saveContent(db, ACTOR, created.id, created.version, {
    title: s.title,
    slug: s.slug,
    summary: s.summary,
    body: s.body ?? doc(p(`${MARK} 이 글은 개발 DB 시험용 가상 데이터입니다. 실제 내용이 아닙니다.`)),
    tags: s.tags ?? [],
    answers: s.answers ?? [],
    seoTitle: "",
    seoDescription: "",
    origin: "manual",
    originNote: ORIGIN_NOTE,
    fields: s.fields,
  });
  let version = saved.version;
  const step = async (to: "review" | "published" | "scheduled" | "archived", publishAt?: Date) => {
    const r = await transitionContent(db, ACTOR, created.id, to, { version, publishAt });
    version = r.version;
  };
  if (s.final === "review") await step("review");
  if (s.final === "published" || s.final === "archived") await step("published");
  if (s.final === "archived") await step("archived");
  if (s.final === "scheduled") await step("scheduled", new Date(Date.now() + 7 * DAY));
  if (s.draftTitle && s.final === "published") {
    await saveContent(db, ACTOR, created.id, version, {
      title: s.draftTitle,
      slug: s.slug,
      summary: s.summary,
      body: s.body ?? doc(p(`${MARK} 수정 중인 내용입니다.`)),
      tags: s.tags ?? [],
      answers: s.answers ?? [],
      seoTitle: "",
      seoDescription: "",
      origin: "manual",
      originNote: ORIGIN_NOTE,
      fields: s.fields,
    });
  }
  if (s.final === "trashed") await deleteContent(db, ACTOR, created.id);
  return created.id;
}

async function seedStories(db: AdminDb, im: Images): Promise<number> {
  const c = im.cover;
  const specs: Spec[] = [
    {
      type: "story",
      slug: `${PREFIX}story-ai-guide`,
      title: `${MARK} AI 영상 제작 가이드 샘플 (표·복사 상자·영상 포함)`,
      summary: "표, 복사 상자, 영상, 이미지가 모두 들어간 긴 가이드 글의 가상 샘플입니다.",
      tags: ["AI영상"],
      answers: ["AI 영상은 어떤 순서로 만드나요?", "프롬프트는 어떻게 쓰나요?"],
      body: doc(
        p(`${MARK} 이 글은 사이트의 본문 서식이 모두 보이는지 확인하는 가상 샘플입니다.`),
        h2("1. 준비물"),
        ul("캐릭터 기준 그림 한 장", "배경이 될 공간 그림 한 장", "15초 길이의 장면 구성"),
        img(c[0]!),
        h2("2. 장면 표"),
        table([
          ["시간", "행동", "대사"],
          ["0–3초", "카메라를 보며 시작", "첫 문장"],
          ["3–8초", "표정이 바뀜", "없음"],
          ["8–15초", "화면이 넓어짐", "마지막 문장"],
        ]),
        h2("3. 프롬프트 (복사 상자)"),
        code("15초 길이의 세로 영상을 만들어 줘.\n사진 1의 인물을 기준으로 사용해.\n배경음악과 자막은 넣지 마."),
        quote("표와 복사 상자는 가로로 넘치지 않고 안에서만 움직여야 합니다."),
        h2("4. 결과 영상"),
        video(YOUTUBE_SAMPLE),
        h3("참고"),
        ol("먼저 짧게 시험 생성", "마음에 드는 컷만 이어 붙이기", "소리와 함께 확인"),
        p(`${MARK} 끝.`),
      ),
      final: "published",
    },
    {
      type: "story",
      slug: `${PREFIX}story-freediving-notes`,
      title: `${MARK} 프리다이빙 기록: 숨 고르기와 평정심`,
      summary: "대표 이미지를 두 번째 이미지로 고른 글의 가상 샘플입니다. 발행 뒤 수정 중인 초안도 남겨 두었습니다.",
      tags: ["프리다이빙", "일상"],
      body: doc(p(`${MARK} 가상 기록입니다.`), img(c[1]!), h2("숨 고르기"), p(`${MARK} 숨을 고르는 방법에 대한 가상 문단입니다.`), img(c[2]!), p(`${MARK} 끝.`)),
      fields: { coverMediaId: c[2] },
      final: "published",
      draftTitle: `${MARK} 프리다이빙 기록: 숨 고르기와 평정심 (수정 중)`,
    },
    {
      type: "story",
      slug: `${PREFIX}story-coffee`,
      title: `${MARK} 오늘의 커피 기록 (이미지 없는 글)`,
      summary: "커피 일상 기록의 가상 샘플입니다. 본문에 이미지가 없어 카드가 색 배경으로 보입니다.",
      tags: ["커피", "일상"],
      body: doc(p(`${MARK} 하루를 여는 커피 한 잔에 대한 가상 기록입니다.`), h2("오늘 마신 것"), ul("원두: 가상 원두", "추출: 핸드드립 (가상)", "한 줄 감상: 시험 문장"), p(`${MARK} 이미지가 없는 글은 대표 이미지 없이 색 배경 카드로 보입니다.`)),
      final: "published",
    },
    {
      type: "story",
      slug: `${PREFIX}story-long`,
      title: `${MARK} 바다와 커피 사이에서 만난 사람들 (긴 글)`,
      summary: "사람 이야기를 담은 긴 글의 가상 샘플입니다. 스크롤과 가독성 확인용입니다.",
      tags: ["사람", "일상"],
      body: doc(img(c[3]!), h2("1부"), ...longParagraphs("1부", 5), h2("2부"), ...longParagraphs("2부", 5), hr(), h2("3부"), ...longParagraphs("3부", 5)),
      fields: { coverMediaId: c[3] },
      final: "published",
    },
    {
      type: "story",
      slug: `${PREFIX}story-community`,
      title: `${MARK} 커뮤니티 모임을 마치고`,
      summary: "커뮤니티 활동 기록의 가상 샘플입니다.",
      tags: ["커뮤니티", "사람"],
      body: doc(p(`${MARK} 여러 사람이 모인 저녁에 대한 가상 기록입니다. 실제 모임이나 사람을 담고 있지 않습니다.`), img(c[5]!), h2("기억에 남은 것"), p(`${MARK} 가상 문단입니다.`)),
      fields: { coverMediaId: c[5] },
      final: "published",
    },
    { type: "story", slug: `${PREFIX}story-host-short`, title: `${MARK} SMCC 호스트 기록 한 줄`, summary: "호스트 활동을 남기는 짧은 글의 가상 샘플입니다.", tags: ["SMCC 호스트", "커뮤니티"], body: doc(p(`${MARK} 호스트로 보낸 하루를 한 줄로 남기는 가상 기록입니다.`)), final: "published" },
    { type: "story", slug: `${PREFIX}story-draft`, title: `${MARK} 임시저장 글`, summary: "임시저장 상태의 가상 글입니다.", tags: ["일상"], final: "draft" },
    { type: "story", slug: `${PREFIX}story-review`, title: `${MARK} 검토 중인 글`, summary: "검토 상태의 가상 글입니다.", tags: ["일상"], body: doc(img(c[4]!), p(`${MARK} 검토 중.`)), fields: { coverMediaId: c[4] }, final: "review" },
    { type: "story", slug: `${PREFIX}story-scheduled`, title: `${MARK} 예약 발행 글 (7일 뒤)`, summary: "예약 상태의 가상 글입니다. 7일 뒤에 공개되도록 예약되어 있습니다.", tags: ["일상"], final: "scheduled" },
    { type: "story", slug: `${PREFIX}story-archived`, title: `${MARK} 보관한 글`, summary: "보관 상태의 가상 글입니다.", tags: ["일상"], final: "archived" },
    { type: "story", slug: `${PREFIX}story-trashed`, title: `${MARK} 휴지통의 글`, summary: "휴지통에 있는 가상 글입니다.", tags: ["일상"], final: "trashed" },
  ];
  for (const s of specs) await put(db, s);
  return specs.length;
}

async function seedFilms(db: AdminDb, im: Images): Promise<number> {
  const P = im.poster;
  const notes = { sceneIntent: `${MARK} 장면 의도: 감정이 바뀌는 순간을 보여 주려 했습니다.`, promptNotes: `${MARK} 프롬프트 예시\n15초 길이의 세로 영상을 만들어 줘.\n배경음악은 넣지 마.`, editNotes: `${MARK} 편집 판단: 대사 전후의 기다림을 줄였습니다.` };
  const specs: Spec[] = [
    { type: "video", slug: `${PREFIX}film-youtube`, title: `${MARK} 대표 작품 (YouTube)`, summary: "대표 작품으로 표시된 가상 영상입니다.", tags: ["AI영상"], body: doc(p(`${MARK} 영상 소개 문단입니다.`)), fields: { videoUrl: YOUTUBE_SAMPLE, duration: "0:15", hasCaptions: true, posterMediaId: P[0], cutLabel: "FINAL CUT", featured: true, ...notes }, final: "published" },
    { type: "video", slug: `${PREFIX}film-vimeo`, title: `${MARK} Vimeo 영상`, summary: "Vimeo 주소를 쓴 가상 영상입니다. 자막은 없습니다.", tags: ["AI영상", "단편"], fields: { videoUrl: VIMEO_SAMPLE, duration: "1:02", hasCaptions: false, posterMediaId: P[1], cutLabel: "", featured: false, sceneIntent: notes.sceneIntent, promptNotes: "", editNotes: "" }, final: "published" },
    { type: "video", slug: `${PREFIX}film-instagram`, title: `${MARK} 인스타 릴스 영상`, summary: "인스타 릴스 주소를 쓴 가상 영상입니다(세로 영상 표시 확인).", tags: ["AI영상"], fields: { videoUrl: INSTAGRAM_SAMPLE, duration: "0:15", hasCaptions: true, posterMediaId: P[2], cutLabel: "ROUGH CUT", featured: false, ...notes }, final: "published" },
    { type: "video", slug: `${PREFIX}film-shorts`, title: `${MARK} YouTube Shorts 영상`, summary: "짧은 세로 영상의 가상 데이터입니다.", tags: ["AI영상"], fields: { videoUrl: YOUTUBE_SAMPLE_2, duration: "0:30", hasCaptions: false, posterMediaId: P[3], cutLabel: "", featured: false, ...notes }, final: "published" },
    { type: "video", slug: `${PREFIX}film-draft`, title: `${MARK} 포스터가 없는 영상 (임시저장)`, summary: "포스터가 없어 발행할 수 없는 상태의 가상 영상입니다.", fields: { videoUrl: YOUTUBE_SAMPLE, duration: "", hasCaptions: false, posterMediaId: null, cutLabel: "", featured: false, sceneIntent: "", promptNotes: "", editNotes: "" }, final: "draft" },
  ];
  for (const s of specs) await put(db, s);
  return specs.length;
}

async function seedEquipment(db: AdminDb, im: Images): Promise<number> {
  const G = im.gear;
  const base = { checkedAt: kstDay(-20), images: [] as string[] };
  const specs: Spec[] = [
    { type: "equipment", slug: `${PREFIX}gear-mask-a`, title: `${MARK} 시야가 넓은 마스크`, summary: "넓은 시야와 낮은 부피. 입문자에게 무난한 가상 장비입니다.", fields: { ...base, category: "마스크", brand: "시험 브랜드 A", features: ["넓은 시야", "저용량", "실리콘 스커트"], thumbMediaId: G[0], images: [G[1]!, G[2]!], priceNote: "10만원대", action: "external", externalUrl: "https://example.com/mask-a", buttonLabel: "구매하러 가기", affiliate: true, sortOrder: 1 }, final: "published" },
    { type: "equipment", slug: `${PREFIX}gear-mask-b`, title: `${MARK} 소형 마스크`, summary: "얼굴이 작은 사람을 위한 가상 장비입니다.", fields: { ...base, category: "마스크", brand: "시험 브랜드 B", features: ["소형", "저용량"], thumbMediaId: G[3], priceNote: "7만원대", action: "inquiry", externalUrl: "", buttonLabel: "문의하기", affiliate: false, sortOrder: 2 }, final: "published" },
    { type: "equipment", slug: `${PREFIX}gear-fins`, title: `${MARK} 롱핀 입문용`, summary: "부드러운 블레이드의 가상 핀입니다. 정보 확인일이 오래된 예시입니다.", fields: { category: "핀", brand: "시험 브랜드 C", features: ["부드러운 블레이드", "가벼움"], thumbMediaId: G[4], images: [], priceNote: "15만원대", checkedAt: kstDay(-500), action: "none", externalUrl: "", buttonLabel: "", affiliate: false, sortOrder: 3 }, final: "published" },
    { type: "equipment", slug: `${PREFIX}gear-suit`, title: `${MARK} 3mm 웻슈트`, summary: "수온이 높은 곳을 위한 가상 슈트입니다.", fields: { ...base, category: "슈트", brand: "시험 브랜드 D", features: ["3mm", "안쪽 기모"], thumbMediaId: G[5], priceNote: "20만원대", action: "external", externalUrl: "https://example.com/suit", buttonLabel: "자세히 보기", affiliate: true, sortOrder: 4 }, final: "published" },
    { type: "equipment", slug: `${PREFIX}gear-weight`, title: `${MARK} 웨이트 벨트`, summary: "부력 조절용 가상 벨트입니다.", fields: { ...base, category: "웨이트", brand: "시험 브랜드 E", features: ["고무 벨트"], thumbMediaId: G[6], priceNote: "5만원대", action: "none", externalUrl: "", buttonLabel: "", affiliate: false, sortOrder: 5 }, final: "published" },
    { type: "equipment", slug: `${PREFIX}gear-draft`, title: `${MARK} 이미지가 없는 장비 (임시저장)`, summary: "대표 이미지가 없어 발행할 수 없는 가상 장비입니다.", fields: { category: "컴퓨터", brand: "시험 브랜드 F", features: [], thumbMediaId: null, images: [], priceNote: "", checkedAt: "", action: "none", externalUrl: "", buttonLabel: "", affiliate: false, sortOrder: 6 }, final: "draft" },
  ];
  for (const s of specs) await put(db, s);
  return specs.length;
}

async function seedTravel(db: AdminDb): Promise<number> {
  const body = doc(h2("가는 법"), p(`${MARK} 가상 여행 정보입니다. 실제 장소와 무관합니다.`), ul("현지 이동", "준비물", "주의할 점"));
  const specs: Spec[] = [
    { type: "travel", slug: `${PREFIX}travel-island`, title: `${MARK} 시험 섬: 맑은 물의 입문 포인트`, summary: "수온이 따뜻하고 시야가 좋은 가상 장소입니다.", tags: ["입문"], body, fields: { region: "시험 제도", place: "시험 섬 남쪽 만", season: "5~10월", level: "beginner", budget: "1인 약 80만 원 (가상)", checkedAt: kstDay(-30) }, final: "published" },
    { type: "travel", slug: `${PREFIX}travel-cave`, title: `${MARK} 시험 동굴 포인트`, summary: "중급자를 위한 가상 장소입니다. 정보 확인일이 오래되었습니다.", tags: ["중급"], body, fields: { region: "시험 제도", place: "시험 동굴", season: "6~9월", level: "intermediate", budget: "1인 약 120만 원 (가상)", checkedAt: kstDay(-600) }, final: "published" },
    { type: "travel", slug: `${PREFIX}travel-deep`, title: `${MARK} 시험 심해 포인트`, summary: "상급자를 위한 가상 장소입니다. 정보 확인일이 없습니다.", body, fields: { region: "시험 해협", place: "시험 해구", season: "연중", level: "advanced", budget: "문의", checkedAt: "" }, final: "published" },
    { type: "travel", slug: `${PREFIX}travel-draft`, title: `${MARK} 임시저장 여행 추천`, summary: "임시저장 상태의 가상 여행 추천입니다.", fields: { region: "", place: "", season: "", level: "", budget: "", checkedAt: "" }, final: "draft" },
  ];
  for (const s of specs) await put(db, s);
  return specs.length;
}

const TOURS = [
  { slug: `${PREFIX}tour-recruiting`, title: `${MARK} 모집 중 투어`, recruit: "recruiting", start: 45, end: 48, capacity: 8, place: "시험 해변 (가상 장소)", fee: "참가비는 시험용 문구입니다." },
  { slug: `${PREFIX}tour-upcoming`, title: `${MARK} 모집 예정 투어`, recruit: "upcoming", start: 90, end: 93, capacity: 6, place: "시험 섬 (가상 장소)", fee: "모집이 시작되면 안내합니다." },
  { slug: `${PREFIX}tour-closed`, title: `${MARK} 모집 마감 투어`, recruit: "closed", start: 20, end: 22, capacity: 6, place: "시험 만 (가상 장소)", fee: "마감된 시험 투어입니다." },
  { slug: `${PREFIX}tour-ended`, title: `${MARK} 종료된 투어`, recruit: "closed", start: -40, end: -37, capacity: 8, place: "시험 포구 (가상 장소)", fee: "종료된 시험 투어입니다." },
] as const;

async function seedTours(db: AdminDb, im: Images): Promise<number> {
  for (const [i, t] of TOURS.entries()) {
    const gallery = i === 0 || i === 3 ? [0, 1, 2].map((n) => ({ mediaId: im.cover[(i + n) % im.cover.length]!, caption: `${MARK} 투어 사진 ${n + 1}` })) : [];
    await put(db, {
      type: "tour",
      slug: t.slug,
      title: t.title,
      summary: "어드민에서 투어 신청이 어떻게 보이는지 확인하기 위한 가상 투어입니다.",
      body: doc(p("이 투어는 개발 DB 시험용 가상 데이터입니다."), p("실제 투어가 아닙니다.")),
      tags: ["시험"],
      fields: { startDate: kstDay(t.start), endDate: kstDay(t.end), place: t.place, recruit: t.recruit, capacity: t.capacity, feeNote: t.fee, videos: i === 3 ? [YOUTUBE_SAMPLE] : [], gallery },
      final: "published",
    });
  }
  return TOURS.length;
}

// ---------- 신청·문의 ----------

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

async function seedInquiries(db: AdminDb): Promise<number> {
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
  return rows.length;
}

// ---------- 후기·About·동의 문구 ----------

async function seedReviews(db: AdminDb): Promise<number> {
  const base = { sourceNote: "", consentNote: "시험: 서면 동의 확인(가상)" };
  const items: { input: Parameters<typeof createReview>[2]; end: "public" | "private" | "withdrawn" | "trashed" }[] = [
    { input: { ...base, body: `${MARK} 처음이라 걱정했는데 차근차근 알려 주셔서 편하게 배웠어요. (가상 후기)`, authorLabel: "시험 수강생 A", labelKind: "nick", writtenOn: kstDay(-30), sourceKind: "instagram", tourSlug: `${PREFIX}tour-ended`, featured: true, featuredOrder: "1", consentConfirmed: true }, end: "public" },
    { input: { ...base, body: `${MARK} 물속에서 호흡을 고르는 법을 처음 알게 됐습니다. 줄바꿈 확인용으로\n두 번째 줄을 넣었습니다. (가상 후기)`, authorLabel: "시험 수강생 B", labelKind: "initial", writtenOn: kstDay(-60), sourceKind: "bluepebble", tourSlug: "", featured: true, featuredOrder: "2", consentConfirmed: true }, end: "public" },
    { input: { ...base, body: `${MARK} 사진도 많이 찍어 주셔서 좋았어요. (가상 후기)`, authorLabel: "시험 수강생 C", labelKind: "nick", writtenOn: kstDay(-90), sourceKind: "direct", tourSlug: `${PREFIX}tour-closed`, featured: false, featuredOrder: "", consentConfirmed: true }, end: "public" },
    { input: { ...base, body: `${MARK} 아주 긴 후기 확인용입니다. ${"가상 문장입니다. ".repeat(30)}`, authorLabel: "시험 수강생 D", labelKind: "real", writtenOn: kstDay(-120), sourceKind: "other", sourceNote: "시험: 메신저로 전달받음", tourSlug: "", featured: false, featuredOrder: "", consentConfirmed: true }, end: "public" },
    { input: { ...base, body: `${MARK} 아직 동의 확인 전이라 비공개인 후기입니다. (가상 후기)`, authorLabel: "시험 수강생 E", labelKind: "nick", writtenOn: kstDay(-10), sourceKind: "", tourSlug: "", featured: false, featuredOrder: "", consentConfirmed: false }, end: "private" },
    { input: { ...base, body: `${MARK} 공개했다가 철회한 후기입니다. (가상 후기)`, authorLabel: "시험 수강생 F", labelKind: "initial", writtenOn: kstDay(-50), sourceKind: "direct", tourSlug: "", featured: false, featuredOrder: "", consentConfirmed: true }, end: "withdrawn" },
    { input: { ...base, body: `${MARK} 휴지통에 있는 후기입니다. (가상 후기)`, authorLabel: "시험 수강생 G", labelKind: "nick", writtenOn: kstDay(-70), sourceKind: "", tourSlug: "", featured: false, featuredOrder: "", consentConfirmed: false }, end: "trashed" },
  ];
  for (const it of items) {
    const row = await createReview(db, ACTOR, it.input);
    if (it.end === "public" || it.end === "withdrawn") await setReviewStatus(db, ACTOR, row.id, row.version, "public");
    if (it.end === "withdrawn") await withdrawReview(db, ACTOR, row.id);
    if (it.end === "trashed") await deleteReview(db, ACTOR, row.id);
  }
  return items.length;
}

async function seedAbout(db: AdminDb, im: Images): Promise<void> {
  const body = doc(p(`${MARK} 이 소개는 개발 DB 시험용 가상 데이터입니다. 실제 이력이나 자격이 아닙니다.`), h2("하는 일"), ul("프리다이빙 (가상)", "AI 영상 (가상)"), p(`${MARK} 끝.`));
  const saved = await saveAboutDraft(db, ACTOR, 0, { headline: `${MARK} 가상 소개\n개발 DB 시험 데이터`, body, signature: `${MARK} 시험 서명`, photoMediaId: im.profile });
  await publishAbout(db, ACTOR, saved.version);
}

/** 홈 히어로를 시험 그림으로 바꿔 둔다. 사람이 이미 정한 히어로가 있으면 건드리지 않는다 */
async function seedHero(db: AdminDb, im: Images): Promise<boolean> {
  const [row] = await db.select({ value: siteSettings.value, version: siteSettings.version }).from(siteSettings).where(eq(siteSettings.key, HERO_SETTING_KEY)).limit(1);
  const state = readHeroState(row?.value);
  if (state.published || state.draft) return false;
  const saved = await saveHeroDraft(db, ACTOR, row?.version ?? 0, im.hero);
  await publishHero(db, ACTOR, saved.version);
  return true;
}

/** Story 태그를 미리 등록해 둔다. 이미 등록된 이름은 그대로 둔다. 등록 목록은 지우기(dev:seed-clean) 대상이 아니다(사람이 등록한 이름과 구분할 수 없어서) */
async function seedTagRegistry(db: AdminDb): Promise<number> {
  let added = 0;
  for (const name of STORY_TAGS) if ((await addRegisteredTerm(db, ACTOR, "tag", name)).added) added += 1;
  return added;
}

async function seedConsent(db: AdminDb): Promise<void> {
  const privacy = [
    `${MARK} 개인정보 처리방침 (개발 DB 시험용 가상 문서)`,
    "이 문서는 개발 환경에서 화면을 확인하기 위한 가상 문구이며 법적 효력이 없습니다. 실제 처리방침이 아닙니다.",
    "1. 수집 항목: 이름, 연락처, 이메일 (시험)\n2. 이용 목적: 시험 문의 응대\n3. 보유 기간: 접수일로부터 1년 (시험)",
  ].join("\n\n");
  await publishConsentVersion(db, ACTOR, "privacy", privacy);
  await publishConsentVersion(db, ACTOR, "reservation", `${MARK} 시험용 동의 문구: 이름·연락처·이메일을 문의 응대에 쓰고 1년간 보관하는 데 동의합니다.`);
  await publishConsentVersion(db, ACTOR, "notice", `${MARK} 시험용 동의 문구: 모집 시작 안내를 이메일로 받는 데 동의합니다.`);
}

// ---------- 실행 ----------

async function seed(db: AdminDb, storage: MediaStorage) {
  const removed = await clean(db, storage);
  if (removed.contents + removed.inquiries + removed.media + removed.reviews > 0) {
    process.stdout.write(`이전 시험 데이터를 지웠습니다 (콘텐츠 ${removed.contents}, 신청 ${removed.inquiries}, 후기 ${removed.reviews}, 이미지 ${removed.media}).\n`);
  }
  const done: string[] = [];
  const im = await makeImages(db, storage);
  done.push(`이미지 ${im.cover.length + im.poster.length + im.gear.length + 2 + im.fillerCount}장`);
  done.push(`Story ${await seedStories(db, im)}`);
  done.push(`Story 태그 미리 등록 ${await seedTagRegistry(db)}`);
  done.push(`Films ${await seedFilms(db, im)}`);
  done.push(`장비 ${await seedEquipment(db, im)}`);
  done.push(`여행 추천 ${await seedTravel(db)}`);
  done.push(`투어 ${await seedTours(db, im)}`);
  done.push(`신청·문의 ${await seedInquiries(db)}`);
  done.push(`후기 ${await seedReviews(db)}`);
  await seedAbout(db, im);
  done.push("About 1");
  done.push((await seedHero(db, im)) ? "홈 히어로 이미지 1" : "홈 히어로 이미지(이미 정해져 있어 건드리지 않음)");
  await seedConsent(db);
  done.push("처리방침·동의 문구 3");
  // 삭제된(휴지통) 이미지 하나: 시험 이미지 중 사용하지 않는 것
  const [spare] = await db.select({ id: media.id }).from(media).where(and(eq(media.createdBy, ACTOR.userId), like(media.alt, `${MARK} 보관함 확인용 그림 1`))).limit(1);
  if (spare) await deleteMedia(db, ACTOR, spare.id);
  process.stdout.write(`시험 데이터를 넣었습니다: ${done.join(", ")}.\n`);
}

async function main() {
  const command = process.argv[2];
  if (command !== "seed" && command !== "clean") fail("사용법: dev:seed 또는 dev:seed-clean");
  const url = process.env.DATABASE_URL?.trim();
  if (!url) fail("DATABASE_URL 이 없습니다 (.env.local 확인)");
  if (process.env.VERCEL || process.env.NODE_ENV === "production") fail("배포·운영 환경에서는 실행하지 않습니다.");
  // 이미지는 로컬 폴더에 저장한다 (개발 전용)
  process.env.MEDIA_STORE = "local";
  const db = getDb(url) as unknown as AdminDb;

  // 안전장치: 시험이 아닌 발행 콘텐츠가 있으면 운영 DB 일 수 있다
  const real = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(contents)
    .where(and(eq(contents.status, "published"), ne(contents.originNote, ORIGIN_NOTE)));
  const realCount = real[0]?.n ?? 0;
  if (realCount > 0 && !process.argv.includes("--force")) {
    fail(`시험이 아닌 발행 콘텐츠가 ${realCount}개 있습니다. 운영 DB 일 수 있어 멈춥니다. 개발 DB 임을 확인했다면 --force 를 붙여 주세요.`);
  }

  const storage = await getMediaStorage();
  if (!storage) fail("로컬 이미지 저장소를 열 수 없습니다.");
  if (command === "clean") {
    const removed = await clean(db, storage);
    process.stdout.write(`시험 데이터를 지웠습니다: 콘텐츠 ${removed.contents}개, 신청 ${removed.inquiries}건, 후기 ${removed.reviews}건, 이미지 ${removed.media}장.\n`);
    return;
  }
  await seed(db, storage);
}

main().then(
  () => process.exit(0),
  (error) => {
    process.stderr.write(`실패: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  },
);
