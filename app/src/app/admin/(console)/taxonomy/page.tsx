import { adminDb } from "@/data/admin/dbServer";
import { listCategories, listTags, TAG_MAX, type TaxonomyEntry } from "@/data/admin/taxonomy";
import { requireAdmin } from "@/lib/auth/session";
import { removeTagAction, renameCategoryAction, renameTagAction } from "../../taxonomyActions";
import styles from "../../admin.module.css";

export const metadata = { title: "태그·카테고리 · KYU 어드민" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

function Table({ kind, entries, rename, removable, max }: { kind: "tag" | "category"; entries: TaxonomyEntry[]; rename: (formData: FormData) => Promise<void>; removable: boolean; max: number }) {
  const noun = kind === "tag" ? "태그" : "카테고리";
  const unit = kind === "tag" ? "글" : "장비";
  if (entries.length === 0) {
    return (
      <div className={styles.panel}>
        <p className={styles.note} style={{ margin: 0 }}>
          아직 {noun}가 없습니다.
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
          {removable ? <th scope="col">지우기</th> : null}
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.name}>
            <td data-label={noun}>{e.name}</td>
            <td data-label={`쓰는 ${unit}`}>{e.count}개</td>
            <td data-label="이름 바꾸기·합치기">
              <form action={rename} className={styles.row}>
                <input type="hidden" name="from" value={e.name} />
                <input type="text" name="to" aria-label={`${e.name}의 새 이름`} placeholder="새 이름" maxLength={max + 5} className={styles.select} style={{ maxWidth: 180 }} required />
                <button type="submit" className={styles.smallButton}>
                  바꾸기
                </button>
              </form>
            </td>
            {removable ? (
              <td data-label="지우기">
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
              </td>
            ) : null}
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
        글마다 적은 태그와 장비 카테고리를 한곳에서 정리합니다. <strong>이미 있는 이름으로 바꾸면 두 이름이 합쳐집니다.</strong> 휴지통의 글은 건드리지 않고, 수정 중인 내용에도 함께 반영됩니다.
      </p>
      {error ? (
        <p role="alert" className={styles.alert} style={{ marginBottom: 16 }}>
          {error}
        </p>
      ) : null}
      {done ? (
        <p role="status" className={styles.alert} style={{ marginBottom: 16 }}>
          {done === "remove" ? "태그를 지웠습니다." : "이름을 바꿨습니다."} {changed}개를 고쳤습니다.
          {skipped && skipped !== "0" ? ` 그 사이 다른 곳에서 고쳐진 ${skipped}개는 건너뛰었습니다. 한 번 더 눌러 주세요.` : ""}
        </p>
      ) : null}
      <h2 className={styles.h2}>태그</h2>
      <Table kind="tag" entries={tags} rename={renameTagAction} removable max={TAG_MAX} />
      <h2 className={styles.h2} style={{ marginTop: 32 }}>장비 카테고리</h2>
      <p className={styles.note}>카테고리는 장비를 발행하는 데 필요한 항목이라 지우기는 없고, 이름 바꾸기·합치기만 합니다.</p>
      <Table kind="category" entries={categories} rename={renameCategoryAction} removable={false} max={20} />
    </>
  );
}
