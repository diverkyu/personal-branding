import type { Metadata } from "next";
import { Suspense } from "react";
import { FreedivingTabs } from "@/components/site/FreedivingTabs";
import { TravelCard } from "@/components/site/TravelCard";
import { TravelList } from "@/components/site/TravelList";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TextLink } from "@/components/ui/TextLink";
import { travelConfig, travelCopy } from "@/config/travel";
import { listTravel } from "@/data/travel";
import { isStaleCheck, levelsOf, regionsOf } from "@/data/travelQueries";
import { kstDate } from "@/data/storyQueries";
import { getSiteSettings } from "@/settings/read";
import pages from "../../pages.module.css";

export const metadata: Metadata = { title: "여행 추천" };

/** 발행·취소·삭제 때 바로 갱신되고, 예약 시각은 최대 5분 안에 반영된다 */
export const revalidate = 300;

/**
 * TRAVEL 목록 (SCREEN-SPEC §5.16). 지역·난이도 필터는 URL(?region=, ?level=)에 남는다.
 * 공개된 글이 하나도 없으면(메뉴에서는 숨겨진다) 안내 문구만 보인다 (TRAVEL-09, 결정 T-2).
 */
export default async function TravelPage() {
  const travel = await listTravel();
  const settings = await getSiteSettings();
  const copy = travelCopy(settings);
  const today = kstDate(new Date());
  const items = travel.map((t) => ({
    id: t.slug,
    region: t.region,
    level: t.level,
    node: (
      <TravelCard
        href={`/freediving/travel/${t.slug}`}
        title={t.title}
        summary={t.summary || undefined}
        region={t.region}
        season={t.season}
        level={t.level}
        checkedAt={t.checkedAt}
        stale={isStaleCheck(t.checkedAt, today, travelConfig.staleMonths) === true}
        headingLevel={2}
      />
    ),
  }));

  return (
    <>
      <Section tone="dark" sub>
        <FreedivingTabs current="/freediving/travel" />
        <SectionHeader
          label={travelConfig.label}
          as="h1"
          size="h1"
          title={
            <>
              {copy.titleLines.map((line, i) => (
                <span key={i}>
                  {i > 0 ? <br /> : null}
                  {line}
                </span>
              ))}
            </>
          }
          description={copy.subtitle}
        />
      </Section>

      <Section tone="light" sub>
        {travel.length === 0 ? (
          <p className={pages.emptyLight}>{copy.empty}</p>
        ) : (
          <>
            <Suspense fallback={null}>
              <TravelList
                regions={regionsOf(travel).map((r) => ({ value: r, label: r }))}
                levels={levelsOf(travel)}
                items={items}
                listClassName={pages.grid3}
                pageSize={travelConfig.pageSize}
                noMatch={travelConfig.noMatch}
                noMatchClassName={pages.emptyLight}
              />
            </Suspense>
            <p style={{ marginTop: 48, fontSize: 13, lineHeight: 1.8, color: "var(--kyu-ink-sub)" }}>{travelConfig.notice}</p>
          </>
        )}
        <div className={pages.after}>
          <TextLink href="/freediving" surface="light">
            Freediving 으로 돌아가기
          </TextLink>
        </div>
      </Section>
    </>
  );
}
