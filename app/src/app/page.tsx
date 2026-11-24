import Link from "next/link";
import { JsonLd } from "@/components/site/JsonLd";
import { resolveSiteUrl } from "@/config/env";
import { personLd, websiteLd } from "@/lib/structured";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { pageMeta } from "@/lib/seo";
import { socialLinksOf } from "@/settings/social";
import { HomeHeroSection } from "@/components/site/HomeHeroSection";
import { getPublicHeroImage } from "@/data/homeHero";
import { ContactSection } from "@/components/site/ContactSection";
import { contactPropsOf } from "@/settings/social";
import { StoryCard } from "@/components/site/StoryCard";
import { TourCard } from "@/components/site/TourCard";
import { ReviewCard } from "@/components/site/ReviewCard";
import { reviewCard, storyCard, tourCard } from "@/components/site/mappers";
import { Section } from "@/components/ui/Section";
import { SectionHeader, SectionLabel } from "@/components/ui/SectionHeader";
import { TextLink } from "@/components/ui/TextLink";
import { listFeaturedReviews, reviewTourOptions } from "@/data/reviews";
import { featuredOf } from "@/data/filmQueries";
import { listFilms } from "@/data/films";
import { filmsCopy } from "@/config/films";
import { HomeFilms } from "@/components/site/HomeFilms";
import { listOpenTours } from "@/data/tours";
import { listStories } from "@/data/stories";
import { getSiteSettings } from "@/settings/read";
import styles from "./page.module.css";
import pages from "./pages.module.css";

/** 발행·취소·삭제 때 바로 갱신되고, 예약 시각은 최대 5분 안에 반영된다 */
export const revalidate = 300;

/** 홈 제목·설명은 사이트 설정(검색·공유)에서 온다. layout 의 title.default 를 그대로 쓰고 정규 주소만 단다 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = settings["seo.title"] ?? siteConfig.defaultTitle;
  const description = settings["seo.description"] ?? siteConfig.description;
  return { ...pageMeta("/", { description, openGraph: { title, description } }) };
}

/** 홈 (SCREEN-SPEC §5.1). 섹션 순서: 히어로 → 구분 띠 → About 요약 → Story → Freediving → Films(작품이 있을 때만) → Contact. Story·투어는 어드민 콘텐츠, 후기는 아직 가상 데이터. */
export default async function HomePage() {
  const settings = await getSiteSettings();
  const heroImage = await getPublicHeroImage();
  const stories = (await listStories()).slice(0, 3);
  const tour = (await listOpenTours())[0];
  const reviews = await listFeaturedReviews(3);
  const tourOptions = await reviewTourOptions();
  const films = await listFilms();
  const featuredFilm = featuredOf(films);

  return (
    <>
      <JsonLd data={websiteLd(resolveSiteUrl(process.env).url.origin)} />
      <JsonLd data={personLd(resolveSiteUrl(process.env).url.origin, socialLinksOf(settings).map((l) => l.href))} />
      <HomeHeroSection settings={settings} image={heroImage} />

      <div className={styles.band} aria-hidden="true">
        ONE BREATH. ∞ ENDLESS POSSIBILITIES. ∞ ONE IDEA. ∞ NEW WORLDS.
      </div>

      <Section tone="light" labelledBy="home-about">
        <div className={styles.aboutGrid}>
          <SectionLabel surface="light">01 / ABOUT KYU</SectionLabel>
          <div>
            <h2 id="home-about" className={styles.aboutTitle}>
              서로 다른 두 세계.
              <br />
              <span className={styles.aboutMuted}>하나의 호기심.</span>
            </h2>
            <div className={styles.aboutCols}>
              <p>
                몸으로 경험하는 바다와 상상으로 만드는 세계.
                <br />
                프리다이빙과 AI 크리에이티브는
                <br />
                저를 소개하는 두 가지 언어입니다.
              </p>
              <p>
                물속의 고요함을 마주하는 순간부터
                <br />
                새로운 이미지를 만들어내는 순간까지.
                <br />
                저는 경계 너머의 가능성을 탐험합니다.
              </p>
            </div>
            <div className={styles.aboutFoot}>
              <span className={pages.signature} style={{ color: "var(--kyu-navy)", fontSize: 26 }}>
                이동규 aka. KYU
              </span>
              <TextLink href="/about" surface="light" icon="arrow-up-right">
                About 더 보기
              </TextLink>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="dark" labelledBy="home-story">
        <SectionHeader label="02 / STORY" titleId="home-story" title={<>한 호흡 사이에<br />떠오른 생각들.</>} description="바다와 창작 사이에서 기록합니다." />
        {stories.length === 0 ? (
          <p className={pages.empty}>아직 올린 글이 없습니다. 곧 첫 이야기를 올리겠습니다.</p>
        ) : (
          <>
            <ul className={pages.grid3} style={{ listStyle: "none", padding: 0 }}>
              {stories.map((s) => (
                <li key={s.slug}>
                  <StoryCard {...storyCard(s)} />
                </li>
              ))}
            </ul>
            <div className={pages.after}>
              <TextLink href="/story" surface="dark">
                스토리 전체 보기
              </TextLink>
            </div>
          </>
        )}
      </Section>

      <Section tone="light" labelledBy="home-freediving">
        <SectionHeader surface="light" label="03 / FREEDIVING" titleId="home-freediving" title="처음 물에 들어가는 날." description="바다를 만나고, 호흡에 집중하고, 물속에서 새로운 감각을 발견하는 시간." />
        <div className={styles.fdGrid}>
          <div>
            {tour ? (
              <TourCard {...tourCard(tour)} cta="투어 자세히 보기" />
            ) : (
              <p className={pages.emptyLight}>
                다음 투어를 준비하고 있습니다. 소식이 궁금하시면 <Link href="/contact">문의를 남겨주세요.</Link>
              </p>
            )}
          </div>
          {reviews.length > 0 ? (
            <div>
              <p className={styles.sideLabel}>REVIEWS · 수강 후기</p>
              <ul className={styles.reviewList}>
                {reviews.slice(0, 2).map((r) => (
                  <li key={r.id}>
                    <ReviewCard {...reviewCard(r, tourOptions)} />
                  </li>
                ))}
              </ul>
              <div className={pages.after}>
                <TextLink href="/freediving/reviews" surface="light">
                  후기 전체 보기
                </TextLink>
              </div>
            </div>
          ) : null}
        </div>
        <div className={pages.chips}>
          <Link href="/freediving/tours" className={pages.pill}>
            투어 보기
          </Link>
          <Link href="/freediving/equipment" className={pages.pill}>
            장비 추천 보기
          </Link>
          <Link href="/freediving/reviews" className={pages.pill}>
            수강 후기
          </Link>
        </div>
      </Section>

      {featuredFilm ? <HomeFilms film={featuredFilm} copy={filmsCopy(settings)} /> : null}

      <ContactSection withFilms={featuredFilm !== null} {...contactPropsOf(settings)} />
    </>
  );
}
