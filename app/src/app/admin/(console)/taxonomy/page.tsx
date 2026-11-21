import { adminDb } from "@/data/admin/dbServer";
import { listCategories, listTags, TAG_MAX, type TaxonomyEntry } from "@/data/admin/taxonomy";
import { requireAdmin } from "@/lib/auth/session";
import { addTermAction, removeTagAction, renameCategoryAction, renameTagAction, unregisterTermAction } from "../../taxonomyActions";
import styles from "../../admin.module.css";

export const metadata = { title: "태그·카테고리 · KYU 어드민" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

function AddForm({ kind, max }: { kind: "tag" | "category"; max: number }) {
  const noun = kind === "tag" ? "태그" : "카테고리";
  return (
    <form action={addTermAction} className={styles.row} aria-label={`새 ${noun} 미리 등록`} style={{ marginBottom: 12 }}>
      <input type="hidden" name="kind" value={kind} />
      <input type="text" name="name" aria-label={`새 ${noun} 이름`} placeholder={`새 ${noun} 이름`} maxLength={max + 5} className={styles.select} style={{ maxWidth: 240 }} required />
      <button type="submit" className={styles.smallButton}>
        {noun} 추가
      </button>
    </form>
  );
}

function Table({ kind, entries, rename, max }: { kind: "tag" | "category"; entries: TaxonomyEntry[]; rename: (formData: FormData) => Promise<void>; max: number }) {
  const noun = kind === "tag" ? "태그" : "카테고리";
  const unit = kind === "tag" ? "글" : "장비";
  if (entries.length === 0) {
    return (
      <div className={styles.panel}>
        <p className={styles.note} style={{ margin: 0 }}>
          아직 {noun}가 없습니다. 위에서 새 {noun}를 추가해 보세요.
        </p>
      </div>
    );
  }
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">{noun}</th>
          <th scope="col">쓰는 {unit}</th>
          <th scope="col">이름 바꾸기·합치기</th>
          <th scope="col">지우기</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.name}>
            <td data-label={noun}>{e.name}</td>
            <td data-label={`쓰는 ${unit}`}>{e.count === 0 ? "0개 (미리 등록)" : `${e.count}개`}</td>
            <td data-label="이름 바꾸기·합치기">
              {e.count === 0 ? (
                <span className={styles.note}>쓰는 {unit}가 없어 바꿀 수 없습니다. 지우고 새로 추가하세요.</span>
              ) : (
                <form action={rename} className={styles.row}>
                  <input type="hidden" name="from" value={e.name} />
                  <input type="text" name="to" aria-label={`${e.name}의 새 이름`} placeholder="새 이름" maxLength={max + 5} className={styles.select} style={{ maxWidth: 180 }} required />
                  <button type="submit" className={styles.smallButton}>
                    바꾸기
                  </button>
                </form>
              )}
            </td>
            <td data-label="지우기">
              {e.count === 0 ? (
                <form action={unregisterTermAction}>
                  <input type="hidden" name="kind" value={kind} />
                  <input type="hidden" name="name" value={e.name} />
                  <button type="submit" className={styles.smallButton} aria-label={`${e.name} 목록에서 지우기`}>
                    목록에서 지우기
                  </button>
                </form>
              ) : kind === "tag" ? (
                <details>
                  <summary className={styles.dangerLink}>지우기</summary>
                  <form action={removeTagAction} className={styles.dangerBox}>
                    <input type="hidden" name="from" value={e.name} />
                    <p className={styles.note} style={{ margin: 0 }}>
                      {e.count}개 글에서 이 태그가 빠집니다. 글은 그대로입니다.
                    </p>
                    <label>
                      <input type="checkbox" name="confirm" value="yes" required /> 확인했습니다
                    </label>
                    <p style={{ margin: 0 }}>
                      <button type="submit" className={styles.smallButton}>
                        태그 지우기
                      </button>
                    </p>
                  </form>
                </details>
              ) : (
                <span className={styles.note}>쓰고 있어 지울 수 없습니다</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function TaxonomyPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const db = adminDb();
  const [tags, categories] = await Promise.all([listTags(db, admin), listCategories(db, admin)]);
  const error = one(params.error).slice(0, 300);
  const done = one(params.done);
  const changed = one(params.changed).slice(0, 6);
  const skipped = one(params.skipped).slice(0, 6);
  return (
    <>
      <h1 className={styles.h1}>태그·카테고리</h1>
      <p className={styles.note}>
        태그와 장비 카테고리를 한곳에서 정리합니다. <strong>새 이름은 여기서 미리 추가</strong>할 수 있고(글에서 아직 쓰지 않아도 됩니다), 글에서 새 이름을 직접 써도 됩니다. <strong>이미 있는 이름으로 바꾸면 두 이름이 합쳐집니다.</strong> 휴지통의 글은 건드리지 않고, 수정 중인 내용에도 함께 반영됩니다.
      </p>
      {error ? (
        <p role="alert" className={styles.alert} style={{ marginBottom: 16 }}>
          {error}
        </p>
      ) : null}
      {done ? (
        <p role="status" className={styles.alert} style={{ marginBottom: 16 }}>
          {done === "add"
            ? one(params.added) === "0"
              ? "이미 등록되어 있는 이름입니다."
              : `새 ${one(params.kind) === "category" ? "카테고리" : "태그"}를 추가했습니다. 글을 편집할 때 고를 수 있습니다.`
            : done === "unregister"
              ? "목록에서 지웠습니다."
              : `${done === "remove" ? "태그를 지웠습니다." : "이름을 바꿨습니다."} ${changed}개를 고쳤습니다.`}
          {skipped && skipped !== "0" ? ` 그 사이 다른 곳에서 고쳐진 ${skipped}개는 건너뛰었습니다. 한 번 더 눌러 주세요.` : ""}
        </p>
      ) : null}
      <h2 className={styles.h2}>태그</h2>
      <AddForm kind="tag" max={TAG_MAX} />
      <Table kind="tag" entries={tags} rename={renameTagAction} max={TAG_MAX} />
      <h2 className={styles.h2} style={{ marginTop: 32 }}>장비 카테고리</h2>
      <p className={styles.note}>카테고리는 장비를 발행하는 데 필요한 항목이라, <strong>쓰고 있는 카테고리는 지울 수 없고</strong> 이름 바꾸기·합치기만 합니다. 쓰는 장비가 없는 카테고리는 목록에서 지울 수 있습니다.</p>
      <AddForm kind="category" max={20} />
      <Table kind="category" entries={categories} rename={renameCategoryAction} max={20} />
    </>
  );
}
