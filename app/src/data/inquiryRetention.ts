/**
 * 보유 기간이 지난 신청 자동 삭제 (SECURITY §8, ADMIN-DESIGN §42). 접수한 지 `inquiryRetentionDays` 가 지난 예약 문의·소식 받기를 영구 삭제한다.
 * 어드민 세션과 무관하다(Vercel Cron 이 부른다). 건수만 돌려주고 이름·연락처 등 내용은 로그에 남기지 않는다.
 *
 * **상태가 "확정"인 예약 문의는 지우지 않는다.** 확정은 실제 계약·결제로 이어졌을 수 있고, 그 기록의 보관 의무와 기간은 법무 확인이 필요하다
 * (LEGAL-SCOPE-CHECK). 확인 전까지는 운영자가 어드민에서 직접 정리한다.
 */
import { and, lt, not, or, eq } from "drizzle-orm";
import { inquiries } from "@/db/schema";
import { privacyConfig } from "@/config/privacy";
import type { AdminDb } from "./admin/db";

export interface InquiryPurgeSummary {
  reservations: number;
  notices: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function inquiryCutoff(now: Date, days: number = privacyConfig.inquiryRetentionDays): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

export async function purgeExpiredInquiries(db: AdminDb, now: Date = new Date(), days: number = privacyConfig.inquiryRetentionDays): Promise<InquiryPurgeSummary> {
  const cutoff = inquiryCutoff(now, days);
  const gone = await db
    .delete(inquiries)
    .where(and(lt(inquiries.receivedAt, cutoff), or(eq(inquiries.kind, "notice"), not(eq(inquiries.status, "confirmed")))))
    .returning({ kind: inquiries.kind });
  return { reservations: gone.filter((g) => g.kind === "reservation").length, notices: gone.filter((g) => g.kind === "notice").length };
}
