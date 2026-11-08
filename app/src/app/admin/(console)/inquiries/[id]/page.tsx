import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/data/admin/dbServer";
import { getInquiry } from "@/data/admin/inquiries";
import { KIND_LABELS, STATUS_LABELS, allowedStatuses, type InquiryKindFilter, type InquiryStatus } from "@/data/admin/inquiryQuery";
import { getTour } from "@/data";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTimeKst } from "@/lib/format";
import styles from "../../../admin.module.css";
import { DeleteForm, MemoForm, StatusForm } from "../InquiryForms";

export const metadata = { title: "신청·문의 상세 · KYU 어드민" };

export default async function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  // 열람은 활동 기록에 남는다. 없는 id·형식이 틀린 id 는 404
  const row = await getInquiry(adminDb(), admin, id);
  if (!row) notFound();
  const kind = row.kind as InquiryKindFilter;
  const options = allowedStatuses(kind).map((value) => ({ value, label: STATUS_LABELS[value as InquiryStatus] }));
  const rows: [string, string][] = [
    ["접수일시", formatDateTimeKst(row.receivedAt)],
    ["유형", KIND_LABELS[kind]],
    ["투어", getTour(row.tourSlug)?.title ?? row.tourSlug],
    ["이름", row.name],
    ["이메일", row.email],
    ...(kind === "reservation"
      ? ([
          ["연락처", row.phone ?? ""],
          ["인원", row.people ? `${row.people}명` : ""],
          ["경험·자격", row.experience ?? ""],
        ] as [string, string][])
      : []),
    ["동의 일시", formatDateTimeKst(row.consentAt)],
    ["동의 문구 버전", row.consentVersion],
  ];

  return (
    <>
      <p style={{ margin: "0 0 8px" }}>
        <Link href="/admin/inquiries" className={styles.linkButton}>
          ← 신청·문의 목록
        </Link>
      </p>
      <h1 className={styles.h1}>{row.name}</h1>
      <p className={styles.note}>개인정보가 포함된 화면입니다. 신청자가 입력한 원본은 수정할 수 없습니다.</p>

      <div className={styles.twoCol}>
        <div>
          <div className={styles.panel}>
            <dl className={styles.rows}>
              {rows.map(([label, value]) => (
                <div key={label} className={styles.rowPair}>
                  <dt>{label}</dt>
                  <dd>{value || "-"}</dd>
                </div>
              ))}
            </dl>
          </div>
          {kind === "reservation" ? (
            <div className={styles.panel} style={{ marginTop: 16 }}>
              <h2 className={styles.h2}>문의 내용</h2>
              <p className={styles.message}>{row.message || "-"}</p>
            </div>
          ) : null}
        </div>

        <div>
          <div className={styles.panel}>
            <StatusForm id={row.id} status={row.status} options={options} />
          </div>
          <div className={styles.panel} style={{ marginTop: 16 }}>
            <MemoForm id={row.id} memo={row.memo ?? ""} />
          </div>
          <div className={styles.panel} style={{ marginTop: 16 }}>
            <DeleteForm id={row.id} />
          </div>
        </div>
      </div>
    </>
  );
}
