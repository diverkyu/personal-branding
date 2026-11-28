import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/site/JsonLd";
import { TravelDetailView } from "@/components/site/TravelDetailView";
import { resolveSiteUrl } from "@/config/env";
import { contactConfig } from "@/config/site";
import { travelConfig } from "@/config/travel";
import { getTravel, getTravelNeighbors, listTravel } from "@/data/travel";
import { isStaleCheck } from "@/data/travelQueries";
import { kstDate } from "@/data/storyQueries";
import { articleLd, breadcrumbLd } from "@/lib/structured";
import { getSiteSettings } from "@/settings/read";
import { PAGE_AUTHORS, pageMeta } from "@/lib/seo";
import { collectMediaIds } from "@/content/body";
import type { TravelDetail } from "@/data/travelQueries";

function coverOf(item: TravelDetail) {
  const firstId = item.doc ? collectMediaIds(item.doc)[0] : undefined;
  const image = item.media.find((m) => m.id === firstId);
  return image ? { src: image.url, alt: image.alt } : undefined;
}

interface Props {
  params: Promise<{ slug: string }>;
}

/** 새로 발행된 글은 처음 열릴 때 만들어지고(dynamicParams), 발행·취소·삭제 때 캐시가 갱신된다. 최대 5분 안에는 반드시 새 내용을 읽는다 */
export const revalidate = 300;

export async function generateStaticParams() {
  return (await listTravel()).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getTravel((await params).slug);
  if (!item) return {};
  const cover = coverOf(item);
  return pageMeta(`/freediving/travel/${item.slug}`, {
    title: item.seoTitle || `${item.title} | 프리다이빙 여행`,
    description: item.seoDescription || item.summary || `${item.region} ${item.place}의 프리다이빙 여행 정보를 소개합니다.${item.season ? ` 추천 시기는 ${item.season}입니다.` : ""} 공개된 준비 정보와 확인일을 살펴보세요.`,
    authors: PAGE_AUTHORS,
    openGraph: { type: "article", publishedTime: item.publishedAtIso, modifiedTime: item.publishedAtIso, authors: ["/about"], ...(cover ? { images: [{ url: cover.src, alt: cover.alt }] } : {}) },
  });
}

/** TRAVEL-D 상세 (SCREEN-SPEC §5.17). 존재하지 않거나 공개 전인 글은 404. */
export default async function TravelDetailPage({ params }: Props) {
  const item = await getTravel((await params).slug);
  if (!item) notFound();
  const { newer, older } = await getTravelNeighbors(item.slug);
  const origin = resolveSiteUrl(process.env).url.origin;
  const settings = await getSiteSettings();
  const stale = isStaleCheck(item.checkedAt, kstDate(new Date()), travelConfig.staleMonths);
  return (
    <>
      <JsonLd data={articleLd(origin, { ...item, tags: [], cover: coverOf(item) }, `/freediving/travel/${item.slug}`)} />
      <JsonLd
        data={breadcrumbLd(origin, [
          { name: "Freediving", path: "/freediving" },
          { name: "여행 추천", path: "/freediving/travel" },
          { name: item.title, path: `/freediving/travel/${item.slug}` },
        ])}
      />
      <TravelDetailView item={item} stale={stale} newer={newer} older={older} email={settings["contact.email"] ?? contactConfig.email} />
    </>
  );
}
