/**
 * 구조화 데이터(JSON-LD) 만들기 (SEO·GEO). 화면에 실제로 있는 내용만 담는다 — 보이지 않는 내용을 구조화 데이터로만 주지 않는다.
 * 주소는 모두 SITE_URL 기준 절대 주소다.
 */
import type { Story, Tour } from "@/types/content";
import { siteConfig } from "@/config/site";

type Json = Record<string, unknown>;

const abs = (origin: string, path: string) => new URL(path, origin).toString();

export function websiteLd(origin: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: abs(origin, "/"),
    description: siteConfig.description,
    inLanguage: "ko",
    publisher: { "@type": "Person", name: siteConfig.ownerName, alternateName: "KYU" },
  };
}

export function articleLd(origin: string, story: Pick<Story, "slug" | "title" | "summary" | "publishedAt" | "tags">): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: story.title,
    description: story.summary,
    datePublished: story.publishedAt,
    inLanguage: "ko",
    mainEntityOfPage: abs(origin, `/story/${story.slug}`),
    author: { "@type": "Person", name: siteConfig.ownerName },
    keywords: story.tags.join(", "),
  };
}

/** 투어는 일정·장소만 담는다. 가격·결제 정보는 이 사이트에 없으므로 offers 를 만들지 않는다. */
export function eventLd(origin: string, tour: Tour): Json {
  const cancelled = false;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: tour.title,
    description: tour.summary,
    startDate: tour.startDate,
    endDate: tour.endDate,
    eventStatus: cancelled ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    location: { "@type": "Place", name: tour.place },
    url: abs(origin, `/freediving/tours/${tour.slug}`),
    organizer: { "@type": "Person", name: siteConfig.ownerName },
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
