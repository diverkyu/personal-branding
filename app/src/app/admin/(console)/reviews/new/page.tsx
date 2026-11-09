import Link from "next/link";
import { listTourOptions } from "@/data/admin/contents";
import { adminDb } from "@/data/admin/dbServer";
import { kstDate } from "@/data/storyQueries";
import { requireAdmin } from "@/lib/auth/session";
import styles from "../../../admin.module.css";
import { ReviewForm } from "../ReviewForms";

export const metadata = { title: "새 후기 · KYU 어드민" };

export default async function NewReviewPage() {
  const admin = await requireAdmin();
  const tours = await listTourOptions(adminDb(), admin);
  const today = kstDate(new Date());
  return (
    <>
      <p style={{ margin: "0 0 8px" }}>
        <Link href="/admin/reviews" className={styles.linkButton}>
          ← 수강 후기
        </Link>
      </p>
      <h1 className={styles.h1}>새 후기</h1>
      <p className={styles.note}>처음에는 항상 비공개로 저장됩니다. 공개 동의를 확인해 체크한 뒤, 저장한 다음 “공개하기”를 누르면 공개됩니다.</p>
      <div className={styles.panel} style={{ maxWidth: 760 }}>
        <ReviewForm
          mode="create"
          tours={tours}
          today={today}
          initial={{ body: "", authorLabel: "", labelKind: "", writtenOn: today, sourceKind: "", sourceNote: "", tourSlug: "", featured: false, featuredOrder: "", consentConfirmed: false, consentNote: "" }}
        />
      </div>
    </>
  );
}
