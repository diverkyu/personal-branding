import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getHomeHero } from "@/data/admin/homeHero";
import { adminDb } from "@/data/admin/dbServer";
import { listMediaForPicker } from "@/data/admin/media";
import { HERO_RECOMMENDED } from "@/home/heroImage";
import { requireAdmin } from "@/lib/auth/session";
import { discardHeroAction, publishHeroAction, resetHeroAction, saveHeroAction } from "../../heroActions";
import styles from "../../admin.module.css";
import { HeroPicker } from "./HeroPicker";

export const metadata = { title: "홈 히어로 이미지 · KYU 어드민" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

const DONE: Record<string, string> = {
  saved: "저장했습니다. 미리보기로 확인한 뒤 “공개 반영”을 누르면 홈이 바뀝니다.",
  published: "홈에 반영했습니다.",
  discarded: "수정 내용을 버렸습니다. 홈은 그대로입니다.",
  reset: "홈을 기본 일러스트로 되돌렸습니다.",
};

/** 홈 히어로 이미지 (ADMIN-DESIGN §47): 고르기 → 저장 → 미리보기 → 공개 반영. 기본 일러스트로 바로 되돌릴 수 있다 */
export default async function HomeHeroAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const db = adminDb();
  const view = await getHomeHero(db, admin);
  const images = await listMediaForPicker(db, admin);
  const error = one(params.error).slice(0, 300);
  const done = DONE[one(params.done)];
  const publishedLabel = view.state.published ? (view.published ? `이미지 · ${view.published.alt || "대체 텍스트 없음"}` : "이미지(삭제됨 — 홈에는 기본 일러스트가 보입니다)") : "기본 일러스트";
  const draftLabel = view.hasDraft ? (view.editableId ? "다른 이미지" : "기본 일러스트") : null;
  return (
    <>
      <h1 className={styles.h1}>홈 히어로 이미지</h1>
      <p className={styles.note}>
        <Link href="/" className={styles.linkButton} target="_blank" rel="noopener noreferrer">
          홈 보기 (새 탭)
        </Link>
      </p>
      <p className={styles.note}>
        홈 첫 화면 오른쪽의 아치 모양 그림입니다. 이미지를 고르면 아래쪽에 &ldquo;한 호흡, 무한한 가능성.&rdquo;만 얹히고, 위쪽 &ldquo;01 / INTO THE BLUE&rdquo;와 &ldquo;CONCEPT VISUAL&rdquo; 표시는 기본 일러스트에서만 보입니다. 저장해도 홈은 바뀌지 않고 <strong>&ldquo;공개 반영&rdquo;</strong>을 눌러야 바뀝니다.
      </p>
      <p className={styles.note}>
        권장: <strong>세로 이미지</strong>, {HERO_RECOMMENDED.width}×{HERO_RECOMMENDED.height}px 안팎(가로:세로 약 4:5). 비율이 다르면 가운데를 기준으로 잘립니다. 글자가 얹히는 아래쪽은 살짝 어둡게 처리됩니다. 이미지는 먼저 어드민 &gt; 미디어에 올리고 대체 텍스트를 써 주세요.
      </p>
      {error ? (
        <p role="alert" className={styles.alert} style={{ marginBottom: 16 }}>
          {error}
        </p>
      ) : null}
      {done ? (
        <p role="status" className={styles.alert} style={{ marginBottom: 16 }}>
          {done}
        </p>
      ) : null}
      <p className={styles.note}>
        지금 홈: <span className={styles.statusTag}>{publishedLabel}</span>
        {draftLabel ? ` · 수정 중: ${draftLabel}` : ""}
      </p>
      <div className={styles.twoCol}>
        <form action={saveHeroAction} className={`${styles.panel} ${styles.form}`} aria-label="히어로 이미지 고르기">
          <input type="hidden" name="version" value={view.version} />
          <HeroPicker key={`${view.version}-${view.editableId ?? ""}`} images={images} initial={view.editableId ?? ""} />
          <Button type="submit" variant="dark" surface="light" size="S">
            저장
          </Button>
        </form>
        <aside className={styles.panel} aria-label="공개 관리">
          <h2 className={styles.h2}>공개 관리</h2>
          {view.hasDraft ? (
            <>
              {view.problems.length > 0 ? (
                <div role="status" className={styles.alert}>
                  <strong>공개 전 확인할 것</strong>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                    {view.problems.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className={styles.note}>공개 전 점검을 통과했습니다. 공개 반영 전에 미리보기로 확인해 보세요.</p>
              )}
              <p style={{ marginTop: 12 }}>
                <a href="/admin/home-hero/preview" className={styles.linkButton} target="_blank" rel="noopener noreferrer">
                  수정 중인 내용 미리보기 (새 탭)
                </a>
              </p>
              <form action={publishHeroAction} style={{ marginTop: 12 }}>
                <input type="hidden" name="version" value={view.version} />
                <button type="submit" className={styles.smallButton} disabled={view.problems.length > 0}>
                  공개 반영
                </button>
              </form>
              <form action={discardHeroAction} style={{ marginTop: 12 }}>
                <input type="hidden" name="version" value={view.version} />
                <button type="submit" className={styles.dangerLink}>
                  수정 내용 버리기
                </button>
              </form>
            </>
          ) : (
            <p className={styles.note}>수정 중인 내용이 없습니다. 왼쪽에서 이미지를 골라 저장하면 여기서 공개 반영할 수 있습니다.</p>
          )}
          {view.state.published || view.hasDraft ? (
            <form action={resetHeroAction} style={{ marginTop: 12 }}>
              <input type="hidden" name="version" value={view.version} />
              <button type="submit" className={styles.dangerLink}>
                기본 일러스트로 되돌리기 (바로 홈에 반영)
              </button>
            </form>
          ) : null}
        </aside>
      </div>
    </>
  );
}
