/**
 * 구조화 데이터(JSON-LD) 만들기 (SEO·GEO). 화면에 실제로 있는 내용만 담는다 — 보이지 않는 내용을 구조화 데이터로만 주지 않는다.
 * 주소는 모두 SITE_URL 기준 절대 주소다.
 */
import type { Story, Tour } from "@/types/content";
import { siteConfig } from "@/config/site";
import { profile } from "@/config/profile";
import { tourLocations } from "@/config/tourLocations";
import { isoDuration, parseVideoUrl } from "@/lib/video";

type Json = Record<string, unknown>;

const abs = (origin: string, path: string) => new URL(path, origin).toString();

export const authorIdentity = (origin: string) => ({ "@type": "Person", "@id": abs(origin, "/about#person"), name: siteConfig.ownerName, alternateName: siteConfig.name, url: abs(origin, "/about") });

export function websiteLd(origin: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: abs(origin, "/"),
    description: siteConfig.description,
    inLanguage: "ko",
    publisher: authorIdentity(origin),
  };
}

/**
 * 운영자 한 사람(이동규 · KYU)을 알리는 인물 정보 (GEO: 생성형 검색이 "누구인가"를 정확히 답하게).
 * 화면(About·푸터)에 있는 내용만: 이름·활동명·하는 일·SNS 주소. 이메일·연락처는 넣지 않는다.
 */
export function personLd(origin: string, sameAs: string[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": abs(origin, "/about#person"),
    name: siteConfig.ownerName,
    alternateName: siteConfig.name,
    url: abs(origin, "/about"),
    jobTitle: [...siteConfig.jobTitles],
    description: `${profile.teachingSince}년부터 프리다이빙을 가르치는 ${siteConfig.ownerName}(KYU). AIDA 마스터 강사·유소년 강사이자 AI 영상 크리에이터입니다.`,
    hasCredential: profile.credentials.map((name) => ({ "@type": "EducationalOccupationalCredential", name, credentialCategory: "강사 자격", recognizedBy: { "@type": "Organization", name: "AIDA" } })),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function articleLd(origin: string, story: Pick<Story, "slug" | "title" | "summary" | "publishedAt" | "tags"> & { publishedAtIso?: string; cover?: { src: string } }, path = `/story/${story.slug}`): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: story.title,
    description: story.summary,
    datePublished: story.publishedAtIso || story.publishedAt,
    // 현재 CMS는 재발행 때 publishedAt을 갱신한다. 임시 저장 updatedAt은 절대로 쓰지 않는다.
    dateModified: story.publishedAtIso || story.publishedAt,
    inLanguage: "ko",
    mainEntityOfPage: abs(origin, path),
    author: authorIdentity(origin),
    ...(story.cover?.src ? { image: abs(origin, story.cover.src) } : {}),
    keywords: story.tags.join(", "),
  };
}

/** 투어는 일정·장소만 담는다. 가격·결제 정보는 이 사이트에 없으므로 offers 를 만들지 않는다. */
export function eventLd(origin: string, tour: Tour & { cover?: { src: string } }): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: tour.title,
    description: tour.summary,
    startDate: tour.startDate,
    endDate: tour.endDate,
    // 모집 마감(closed)은 행사 취소가 아니다. 취소된 투어는 현재 CMS에서 비공개 처리한다.
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: tourLocations[tour.slug]?.map((place) => ({ "@type": "Place", name: place.name, address: { "@type": "PostalAddress", addressLocality: place.locality, addressRegion: place.region, addressCountry: place.country } })) ?? { "@type": "Place", name: tour.place },
    url: abs(origin, `/freediving/tours/${tour.slug}`),
    organizer: authorIdentity(origin),
    ...(tour.cover?.src ? { image: abs(origin, tour.cover.src) } : {}),
  };
}

export function breadcrumbLd(origin: string, items: Array<{ name: string; path: string }>): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: abs(origin, item.path) })),
  };
}

/** <script> 안에 넣어도 안전하도록 JSON 을 직렬화한다 (`</script>`·HTML 주석 시작을 이스케이프) */
export function safeJson(data: Json): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

/**
 * 영상 작품(Films)은 화면에 있는 내용만 담는다: 제목·설명·포스터·공개일·길이·재생 주소. 제작 노트는 담지 않는다.
 * 재생 주소(embedUrl)는 허용 도메인(YouTube nocookie·Vimeo·Instagram)의 임베드 주소다.
 */
export function videoLd(
  origin: string,
  film: { slug: string; title: string; summary: string; publishedAtIso: string; duration: string; videoUrl: string; poster: { src: string } },
): Json {
  const source = parseVideoUrl(film.videoUrl);
  const duration = isoDuration(film.duration);
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: film.title,
    description: film.summary || film.title,
    uploadDate: film.publishedAtIso,
    inLanguage: "ko",
    ...(film.poster.src ? { thumbnailUrl: abs(origin, film.poster.src) } : {}),
    ...(duration ? { duration } : {}),
    ...(source ? { embedUrl: source.embedUrl } : {}),
    url: abs(origin, `/films/${film.slug}`),
    author: authorIdentity(origin),
  };
}
