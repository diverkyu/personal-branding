/** 콘텐츠 스키마 (PRD 데이터 모델의 화면용 형태). 저장소(DB)가 정해지면 같은 모양으로 읽어 온다. */
import type { ThumbVariant } from "@/components/ui/Thumb";

export type TourStatus = "recruiting" | "upcoming" | "closed" | "ended";

export interface Story {
  slug: string;
  title: string;
  summary: string;
  /** ISO 날짜 (YYYY-MM-DD) */
  publishedAt: string;
  tags: string[];
  /** 본문 단락. 리치 텍스트 편집기가 생기기 전까지 단락 배열로 둔다 */
  body: string[];
  /** "이 글이 답하는 질문" (0~10) */
  questions?: string[];
  thumbVariant: ThumbVariant;
}

export interface Tour {
  slug: string;
  title: string;
  status: TourStatus;
  startDate: string;
  endDate: string;
  place: string;
  capacity?: number;
  summary: string;
  description: string[];
  /** 참가비·포함 사항 안내 (결제 기능 없음) */
  feeNote?: string;
  /** 종료 투어의 부가 자료 표시 */
  extras?: string[];
  thumbVariant: ThumbVariant;
}

export type EquipmentActionType = "external" | "inquiry" | "none";

export interface Equipment {
  slug: string;
  name: string;
  category: string;
  brand?: string;
  /** 한 줄 추천 이유 (카드) */
  reason: string;
  /** 상세 추천 이유 */
  reasonDetail?: string[];
  features?: string[];
  priceNote?: string;
  /** 정보 확인일 (ISO) */
  checkedAt?: string;
  action: EquipmentActionType;
  /** action 이 external 이면 외부 주소 */
  externalUrl?: string;
  affiliate?: boolean;
  thumbVariant: ThumbVariant;
}

export interface Review {
  id: string;
  /** 원문 그대로. 가공하지 않는다 */
  text: string;
  author: string;
  writtenAt: string;
  tourSlug?: string;
  featured: boolean;
}
