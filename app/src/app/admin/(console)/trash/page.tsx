import { adminDb } from "@/data/admin/dbServer";
import { listTrash, TRASH_KEEP_DAYS, type TrashKind } from "@/data/admin/trash";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTimeKst } from "@/lib/format";
import { purgeTrashAction, restoreTrashAction } from "../../trashActions";
import styles from "../../admin.module.css";

export const metadata = { title: "휴지통 · KYU 어드민" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const KIND_LABELS: Record<TrashKind, string> = { content: "콘텐츠", review: "수강 후기", media: "이미지" };
const TYPE_LABELS: Record<string, string> = { story: "스토리", tour: "투어", equipment: "장비" };

const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

export default async function TrashPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const items = await listTrash(adminDb(), admin);
  const error = one(params.error).slice(0, 200);
  const restored = one(params.restored);
  const purged = one(params.purged);
  return (
    <>
      <h1 className={styles.h1}>휴지통</h1>
      <p className={styles.note}>
        삭제한 콘텐츠·후기·이미지가 {TRASH_KEEP_DAYS}일 동안 여기에 남고, 그 뒤에는 자동으로 영구 삭제됩니다. 복원한 콘텐츠와 후기는 <strong>비공개(임시저장)로</strong> 돌아오며, 복원만으로 공개 화면에 다시 나타나지 않습니다.
      </p>
      {error ? (
        <p role="alert" className={styles.alert} style={{ marginBottom: 16 }}>
          {error}
        </p>
      ) : null}
      {restored ? (
        <p role="status" className={styles.alert} style={{ marginBottom: 16 }}>
          복원했습니다{restored === "media" ? "." : ". 비공개 상태입니다."}
        </p>
      ) : null}
      {purged ? (
        <p role="status" className={styles.alert} style={{ marginBottom: 16 }}>
          영구 삭제했습니다.
        </p>
      ) : null}
      {items.length === 0 ? (
        <div className={styles.panel}>
          <p className={styles.note} style={{ margin: 0 }}>
            휴지통이 비어 있습니다.
          </p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">종류</th>
              <th scope="col">이름</th>
              <th scope="col">삭제한 때</th>
              <th scope="col">영구 삭제 예정</th>
              <th scope="col">작업</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.kind}-${item.id}`}>
                <td data-label="종류">
                  {KIND_LABELS[item.kind]}
                  {item.kind === "content" ? ` · ${TYPE_LABELS[item.detail] ?? item.detail}` : ""}
                </td>
                <td data-label="이름">{item.label}</td>
                <td data-label="삭제한 때">{formatDateTimeKst(item.deletedAt)}</td>
                <td data-label="영구 삭제 예정">{formatDateTimeKst(item.purgeAt)}</td>
                <td data-label="작업">
                  <div className={styles.row}>
                    <form action={restoreTrashAction}>
                      <input type="hidden" name="kind" value={item.kind} />
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className={styles.smallButton}>
                        복원
                      </button>
                    </form>
                    <details>
                      <summary className={styles.dangerLink}>영구 삭제</summary>
                      <form action={purgeTrashAction} className={styles.dangerBox}>
                        <input type="hidden" name="kind" value={item.kind} />
                        <input type="hidden" name="id" value={item.id} />
                        <p className={styles.note} style={{ margin: "0 0 8px" }}>
                          {item.kind === "review" ? "수정 이력까지 함께 지워집니다. " : item.kind === "media" ? "이미지 파일도 함께 지워집니다. " : ""}
                          <strong>되돌릴 수 없습니다.</strong>
                        </p>
                        <label>
                          <input type="checkbox" name="confirm" value="yes" required /> 되돌릴 수 없음을 확인했습니다
                        </label>
                        <p style={{ margin: "8px 0 0" }}>
                          <button type="submit" className={styles.smallButton}>
                            영구 삭제하기
                          </button>
                        </p>
                      </form>
                    </details>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
