import { adminDb } from "@/data/admin/dbServer";
import { toCsv } from "@/data/admin/csv";
import { listInquiriesForExport } from "@/data/admin/inquiries";
import { KIND_LABELS, STATUS_LABELS, parseInquiryQuery, type InquiryKindFilter, type InquiryStatus } from "@/data/admin/inquiryQuery";
import { getTour } from "@/data";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTimeKst } from "@/lib/format";

/**
 * 신청·문의 CSV 내보내기 (개인정보). 관리자만, 현재 목록의 검색 조건 그대로, 내보냄은 활동 기록에 남는다.
 * 문의 본문과 메모는 내보내지 않는다. 응답은 캐시하지 않는다.
 */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const rows = await listInquiriesForExport(adminDb(), admin, parseInquiryQuery(params));
  const csv = toCsv(
    ["접수일시", "유형", "투어", "이름", "연락처", "이메일", "인원", "상태"],
    rows.map((r) => [
      formatDateTimeKst(r.receivedAt),
      KIND_LABELS[r.kind as InquiryKindFilter] ?? r.kind,
      getTour(r.tourSlug)?.title ?? r.tourSlug,
      r.name,
      r.phone,
      r.email,
      r.people,
      STATUS_LABELS[r.status as InquiryStatus] ?? r.status,
    ]),
  );
  const stamp = formatDateTimeKst(new Date()).replace(/\D/g, "").slice(0, 8);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inquiries-${stamp}.csv"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
