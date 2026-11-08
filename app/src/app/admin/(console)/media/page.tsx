import Link from "next/link";
import { adminDb } from "@/data/admin/dbServer";
import { listMedia } from "@/data/admin/media";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTimeKst } from "@/lib/format";
import { mediaStoreKind } from "@/media/storage";
import styles from "../../admin.module.css";
import { AltForm, DeleteMediaForm, UploadForm } from "./MediaForms";

export const metadata = { title: "미디어 · KYU 어드민" };

function kb(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const admin = await requireAdmin();
  const { page: rawPage } = await searchParams;
  const configured = mediaStoreKind() !== null;
  const { items, total, page, pageSize, missingAlt } = await listMedia(adminDb(), admin, Number.parseInt(rawPage ?? "1", 10));
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <>
      <h1 className={styles.h1}>미디어</h1>
      <p className={styles.note}>콘텐츠에 쓸 이미지를 올리고 관리합니다. 올린 이미지는 위치정보가 제거되고 긴 변 2400px 이하의 WebP 로 저장됩니다. 영상은 올리지 않고 YouTube·Vimeo 링크로 넣습니다.</p>

      {!configured ? (
        <p role="status" className={styles.alert} style={{ marginBottom: 16 }}>
          이미지 저장소가 아직 연결되지 않아 올릴 수 없습니다. 연결 방법은 INFRASTRUCTURE 문서의 이미지 저장소 항목을 따릅니다. 이미 올린 이미지는 아래에 그대로 보입니다.
        </p>
      ) : null}

      <section className={styles.panel} style={{ marginBottom: 24 }} aria-labelledby="upload-title">
        <h2 id="upload-title" className={styles.h2} style={{ marginTop: 0 }}>
          이미지 올리기
        </h2>
        <UploadForm disabled={!configured} />
      </section>

      <p className={styles.note}>
        {total}개{missingAlt > 0 ? ` · 대체 텍스트가 없는 이미지 ${missingAlt}개 (콘텐츠의 대표 이미지로 쓰려면 입력해야 합니다)` : ""}
        {pages > 1 ? ` · ${page}/${pages}쪽` : ""}
      </p>

      {items.length === 0 ? (
        <div className={styles.panel}>
          <p className={styles.note} style={{ margin: 0 }}>
            아직 올린 이미지가 없습니다.
          </p>
        </div>
      ) : (
        <ul className={styles.mediaGrid}>
          {items.map((item) => (
            <li key={item.id} className={styles.mediaCard}>
              {/* 관리 화면의 미리보기. 공개 화면에서는 콘텐츠가 대체 텍스트와 함께 쓴다 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.alt ?? ""} width={item.width} height={item.height} loading="lazy" className={styles.mediaThumb} />
              <p className={styles.mediaMeta}>
                {item.width}×{item.height} · {kb(item.bytes)} · {formatDateTimeKst(item.createdAt).slice(0, 10)}
              </p>
              {!item.alt ? <span className={styles.statusTag}>대체 텍스트 없음</span> : null}
              <AltForm id={item.id} alt={item.alt ?? ""} />
              <DeleteMediaForm id={item.id} />
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav className={styles.row} aria-label="쪽 이동" style={{ marginTop: 16 }}>
          {page > 1 ? (
            <Link href={`/admin/media?page=${page - 1}`} className={styles.smallButton}>
              이전
            </Link>
          ) : null}
          {page < pages ? (
            <Link href={`/admin/media?page=${page + 1}`} className={styles.smallButton}>
              다음
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
