/** 콘텐츠 데이터 → 카드 속성. 표시 문구(날짜 형식, 주소)를 한 곳에서 정한다. */
import { formatDate, formatPeriod } from "@/lib/format";
import type { Equipment, Review, Story, Tour } from "@/types/content";
import type { EquipmentCardData } from "./EquipmentCard";
import type { ReviewCardData } from "./ReviewCard";
import type { StoryCardData } from "./StoryCard";
import type { TourArchiveCardData } from "./TourArchiveCard";
import type { TourCardData } from "./TourCard";

export const storyHref = (s: Story) => `/story/${s.slug}`;
export const tourHref = (t: Tour) => `/freediving/tours/${t.slug}`;
export const equipmentHref = (e: Equipment) => `/freediving/equipment/${e.slug}`;

export function storyCard(s: Story): StoryCardData {
  return { href: storyHref(s), title: s.title, summary: s.summary, dateLabel: formatDate(s.publishedAt), thumbVariant: s.thumbVariant };
}

export function tourCard(t: Tour): TourCardData {
  return {
    href: tourHref(t),
    title: t.title,
    status: t.status,
    scheduleLabel: formatPeriod(t.startDate, t.endDate),
    place: t.place,
    capacityLabel: t.capacity ? `${t.capacity}명` : undefined,
    thumbVariant: t.thumbVariant,
  };
}

export function tourArchiveCard(t: Tour): TourArchiveCardData {
  return { href: tourHref(t), title: t.title, extras: t.extras, thumbVariant: t.thumbVariant };
}

export function equipmentCard(e: Equipment): EquipmentCardData {
  const action: EquipmentCardData["action"] =
    e.action === "external" && e.externalUrl ? { type: "external", href: e.externalUrl } : e.action === "inquiry" ? { type: "inquiry", href: "/contact" } : undefined;
  return { href: equipmentHref(e), name: e.name, category: e.category, reason: e.reason, action, affiliate: e.affiliate, thumbVariant: e.thumbVariant };
}

export function reviewCard(r: Review, tours: Tour[]): ReviewCardData {
  const tour = r.tourSlug ? tours.find((t) => t.slug === r.tourSlug) : undefined;
  return { text: r.text, author: r.author, dateLabel: formatDate(r.writtenAt), tour: tour ? { href: tourHref(tour), title: tour.title } : undefined };
}

/** 제휴 고지 문구 (사이트 설정 기본값, CONCEPT §7.4) */
export const AFFILIATE_NOTICE = "이 링크로 구매하시면 수수료를 받을 수 있습니다.";
