import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EquipmentCard } from "./EquipmentCard";
import { FilmCard } from "./FilmCard";
import { FilmPlayer } from "./FilmPlayer";
import { ContactSection } from "./ContactSection";
import { HomeFilms } from "./HomeFilms";
import { filmsCopy } from "@/config/films";
import type { FilmItem } from "@/data/filmQueries";
import { MakingOf } from "./MakingOf";
import { InfoRow } from "./InfoRow";
import { ReviewCard } from "./ReviewCard";
import { StoryCard } from "./StoryCard";
import { TourArchiveCard } from "./TourArchiveCard";
import { TourCard } from "./TourCard";

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("StoryCard", () => {
  it("제목이 링크이고 날짜·요약을 보여 준다", () => {
    const out = html(<StoryCard href="/story/a" title="제목" summary="요약" dateLabel="2026.11.08" />);
    expect(out).toContain('<h3');
    expect(out).toMatch(/<a [^>]*href="\/story\/a"[^>]*>제목<\/a>/);
    expect(out).toContain("요약");
    expect(out).toContain("2026.11.08");
  });

  it("요약이 없으면 요약 문단을 그리지 않는다", () => {
    // 요약이 있을 때는 summary 클래스가 나온다는 것을 먼저 확인해 이 검사가 의미 없이 통과하지 않게 한다
    expect(html(<StoryCard href="/s" title="t" summary="x" dateLabel="d" />)).toMatch(/class="[^"]*summary/);
    expect(html(<StoryCard href="/s" title="t" dateLabel="d" />)).not.toMatch(/class="[^"]*summary/);
  });

  it("큰 카드는 data-featured 를 붙인다", () => {
    expect(html(<StoryCard featured href="/s" title="t" dateLabel="d" />)).toContain("data-featured");
  });
});

describe("TourCard", () => {
  const base = { href: "/t", title: "투어", status: "recruiting" as const, scheduleLabel: "2026.12.05", place: "제주" };

  it("상태 뱃지, 일정, 장소를 보여 준다", () => {
    const out = html(<TourCard {...base} />);
    expect(out).toContain("모집 중");
    expect(out).toContain("2026.12.05");
    expect(out).toContain("제주");
  });

  it("정원이 없으면 정원 항목을 숨긴다", () => {
    expect(html(<TourCard {...base} />)).not.toContain("정원");
    expect(html(<TourCard {...base} capacityLabel="8명" />)).toContain("8명");
  });

  it("CTA 문구는 장식이라 보조기기에 읽히지 않고 링크는 제목 하나뿐이다", () => {
    const out = html(<TourCard {...base} cta="자세히 보기" />);
    expect(out).toContain('aria-hidden="true"');
    expect(out.match(/<a /g)).toHaveLength(1);
  });
});

describe("TourArchiveCard", () => {
  it("종료와 추가 정보를 한 줄로 보여 준다", () => {
    const out = html(<TourArchiveCard href="/t" title="지난 투어" extras={["후기 연결됨", "갤러리"]} />);
    expect(out).toContain("종료 · 후기 연결됨 · 갤러리");
  });
});

describe("EquipmentCard", () => {
  const base = { href: "/e", name: "핀", category: "핀", reason: "가볍다" };

  it("행동이 없으면 버튼을 그리지 않는다", () => {
    expect(html(<EquipmentCard {...base} />).match(/<a /g)).toHaveLength(1);
  });

  it("구매처 링크는 새 탭 + rel 이고 기본 라벨을 쓴다", () => {
    const out = html(<EquipmentCard {...base} action={{ type: "external", href: "https://shop.example" }} />);
    expect(out).toContain("구매처 보기");
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("문의하기는 사이트 안 링크이고 라벨을 바꿀 수 있다", () => {
    const out = html(<EquipmentCard {...base} action={{ type: "inquiry", href: "/contact", label: "물어보기" }} />);
    expect(out).toContain("물어보기");
    expect(out).not.toContain("_blank");
  });

  it("제휴 고지는 제휴 장비이고 문구가 있을 때만 보인다", () => {
    const action = { type: "external", href: "https://shop.example" } as const;
    const notice = "수수료를 받을 수 있습니다.";
    expect(html(<EquipmentCard {...base} action={action} affiliate affiliateNotice={notice} />)).toContain(notice);
    expect(html(<EquipmentCard {...base} action={action} affiliateNotice={notice} />)).not.toContain(notice);
    expect(html(<EquipmentCard {...base} action={action} affiliate />)).not.toContain("수수료");
  });
});

describe("ReviewCard", () => {
  it("후기 원문을 가공 없이 인용문으로 보여 준다", () => {
    const text = "첫 줄\n둘째 줄 & 특수문자 <b>";
    const out = html(<ReviewCard text={text} author="K" dateLabel="2026.10.21" />);
    expect(out).toContain("<blockquote");
    expect(out).toContain("첫 줄\n둘째 줄 &amp; 특수문자 &lt;b&gt;");
    expect(out).not.toContain("<b>");
  });

  it("평점(별점) 요소가 없다", () => {
    expect(html(<ReviewCard text="t" author="a" dateLabel="d" />)).not.toMatch(/별점|rating|star/i);
  });

  it("연결된 투어가 있을 때만 링크를 보여 준다", () => {
    expect(html(<ReviewCard text="t" author="a" dateLabel="d" />)).not.toContain("<a ");
    expect(html(<ReviewCard text="t" author="a" dateLabel="d" tour={{ href: "/t", title: "투어" }} />)).toContain('href="/t"');
  });
});

describe("InfoRow", () => {
  it("라벨과 값을 정의 목록으로 보여 준다", () => {
    const out = html(<InfoRow items={[{ label: "일정", value: "12.05" }, { label: "장소", value: "제주" }]} />);
    expect(out).toContain("<dl");
    expect(out).toContain("<dt");
    expect(out).toContain("12.05");
  });
});

describe("Films", () => {
  const notes = (over: Partial<Record<"sceneIntent" | "promptNotes" | "editNotes", string>> = {}) => ({ sceneIntent: "", promptNotes: "", editNotes: "", ...over });

  it("제작 노트는 비운 칸을 그리지 않고, 첫 칸만 펼쳐 둔다", () => {
    const out = html(<MakingOf notes={notes({ sceneIntent: "의도", editNotes: "편집" })} />);
    expect(out).toContain("장면 의도");
    expect(out).toContain("편집 판단");
    expect(out).not.toContain("프롬프트");
    expect(out.match(/<details/g)).toHaveLength(2);
    expect(out.match(/<details[^>]* open=""/g)).toHaveLength(1);
    expect(out).toContain('id="making-of"');
  });

  it("세 칸이 모두 비면 영역 전체를 그리지 않는다", () => {
    expect(html(<MakingOf notes={notes()} />)).toBe("");
  });

  it("제작 노트의 글은 글자로만 그린다 — HTML 모양 글자가 태그가 되지 않는다", () => {
    const out = html(<MakingOf notes={notes({ promptNotes: "A <b>crab</b> <script>alert(1)</script>" })} />);
    expect(out).toContain("&lt;b&gt;crab&lt;/b&gt;");
    expect(out).toContain("&lt;script&gt;");
    expect(out).not.toMatch(/<b>crab/);
    expect(out).not.toMatch(/<script>alert/);
    expect(out).toContain("<pre");
  });

  it("재생기는 누르기 전에는 iframe 도 외부 주소도 없다 (포스터와 재생 버튼, 원본 링크만)", () => {
    const out = html(<FilmPlayer videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ" title="작품" poster={{ src: "/media/p.webp", alt: "포스터" }} badge="ROUGH CUT" />);
    expect(out).not.toContain("<iframe");
    expect(out).not.toContain("youtube-nocookie");
    expect(out).toContain('aria-label="작품 재생"');
    expect(out).toContain("ROUGH CUT");
    expect(out).toContain('src="/media/p.webp"');
    expect(out).toContain('href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"');
    expect(out).toContain("원본 링크(YouTube)에서 보기");
  });

  it("허용 도메인이 아닌 영상 주소는 재생기를 그리지 않는다", () => {
    expect(html(<FilmPlayer videoUrl="https://example.com/v.mp4" title="작품" />)).toBe("");
    expect(html(<FilmPlayer videoUrl="javascript:alert(1)" title="작품" />)).toBe("");
  });

  it("작품 카드는 제목이 링크이고 길이·자막·날짜를 보여 준다", () => {
    const out = html(<FilmCard href="/films/a" title="작품" dateLabel="2026.11.08" duration="1:00" hasCaptions poster={{ src: "/p.webp", alt: "포스터" }} />);
    expect(out).toMatch(/<a [^>]*href="\/films\/a"[^>]*>작품<\/a>/);
    expect(out).toContain("1:00");
    expect(out).toContain("자막 있음");
    expect(out).toContain("2026.11.08");
  });
});

describe("홈 Films 구역·Contact 특강 링크 (7c)", () => {
  const film: FilmItem = {
    slug: "a", title: "작품", summary: "한 줄", publishedAt: "2026-11-01", publishedAtIso: "2026-11-01T00:00:00+09:00", tags: [], duration: "1:00", hasCaptions: false,
    cutLabel: "ROUGH CUT", featured: true, videoUrl: "https://youtu.be/dQw4w9WgXcQ", poster: { src: "/p.webp", alt: "포스터", width: 1280, height: 720 },
    notes: { sceneIntent: "", promptNotes: "", editNotes: "" },
  } as FilmItem;

  it("홈 구역은 재생기(iframe)를 두지 않고 상세로 보내며, 제작 노트가 없으면 '작품 보기'다", () => {
    const out = html(<HomeFilms film={film} copy={filmsCopy()} />);
    expect(out).not.toContain("<iframe");
    expect(out).toContain('href="/films/a"');
    expect(out).toContain("작품 보기");
    expect(out).not.toContain("제작 노트 보기");
    expect(out).toContain("Films 전체 보기");
    expect(out).toContain("04 / FILMS");
  });

  it("제작 노트가 있으면 첫 버튼이 #making-of 로 간다", () => {
    const out = html(<HomeFilms film={{ ...film, notes: { sceneIntent: "의도", promptNotes: "", editNotes: "" } }} copy={filmsCopy()} />);
    expect(out).toContain('href="/films/a#making-of"');
    expect(out).toContain("작품과 제작 노트 보기");
  });

  it("사이트 설정 문구가 기본값을 대신하고, 비면 기본값이다", () => {
    expect(filmsCopy({ "films.subtitle": "새 부제" }).subtitle).toBe("새 부제");
    expect(filmsCopy({ "films.subtitle": "  " }).subtitle).toContain("상상으로 만든");
    expect(filmsCopy({ "films.title": "한 줄\n두 줄" }).titleLines).toEqual(["한 줄", "두 줄"]);
  });

  it("Contact 는 Films 가 보일 때만 05 번호와 특강 링크를 가진다", () => {
    const off = html(<ContactSection email="a@b.co" />).replace(/<!-- -->/g, "");
    const on = html(<ContactSection email="a@b.co" withFilms />).replace(/<!-- -->/g, "");
    expect(off).toContain("04 / LET");
    expect(off).not.toContain("AI 영상 특강");
    expect(on).toContain("05 / LET");
    expect(on).toContain("AI 영상 특강 소식 요청하기");
    expect(on).toContain("mailto:a@b.co?subject=");
  });
});
