import Link from "next/link";
import { notFound } from "next/navigation";
import { filmsCopy } from "@/config/films";
import { FilmDetailView } from "@/components/site/FilmDetailView";
import { contactConfig } from "@/config/site";
import { collectMediaIds, isBodyEmpty, sanitizeBody } from "@/content/body";
import { readVideoFields } from "@/content/videoFields";
import { readTravelFields } from "@/content/travelFields";
import { travelConfig } from "@/config/travel";
import { TravelDetailView } from "@/components/site/TravelDetailView";
import { isStaleCheck } from "@/data/travelQueries";
import { kstDate } from "@/data/storyQueries";
import { getSiteSettings } from "@/settings/read";
import { ContentBody } from "@/content/ContentBody";
import { editableView, getContent } from "@/data/admin/contents";
import { adminDb } from "@/data/admin/dbServer";
import { getMediaByIds } from "@/data/admin/media";
import { requireAdmin } from "@/lib/auth/session";
import styles from "../../../../admin.module.css";

export const metadata = { title: "미리보기 · KYU 어드민", robots: { index: false, follow: false } };

/** 관리자만 볼 수 있는 미리보기. 수정 중인 내용이 있으면 그 내용을 보여 준다. 공개되지 않은 글도 여기서만 볼 수 있다 (SECURITY §6) */
export default async function ContentPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const db = adminDb();
  const row = await getContent(db, admin, id);
  if (!row) notFound();
  const view = editableView(row);
  const body = sanitizeBody(view.body);
  const media = body.ok ? await getMediaByIds(db, admin, collectMediaIds(body.doc)) : [];

  // 영상은 공개 작품 상세와 같은 모양으로 보여 준다 (수정 중인 내용 기준, 공개되지 않는다)
  if (row.type === "video") {
    const f = readVideoFields(view.fields);
    const [poster] = f.posterMediaId ? await getMediaByIds(db, admin, [f.posterMediaId]) : [];
    const settings = await getSiteSettings();
    const doc = body.ok && !isBodyEmpty(body.doc) ? body.doc : null;
    return (
      <>
        <p className={styles.alert} style={{ marginBottom: 16 }}>
          미리보기입니다. 공개되지 않은 화면이며, 수정 중인 내용이 보입니다. 포스터·영상 주소가 비어 있으면 그 부분은 비어 보입니다.{" "}
          <Link href={`/admin/contents/${row.id}`} className={styles.linkButton}>
            편집으로 돌아가기
          </Link>
        </p>
        <FilmDetailView
          film={{
            slug: row.slug,
            title: view.title,
            summary: view.summary,
            publishedAt: kstDate(new Date()),
            publishedAtIso: new Date().toISOString(),
            tags: view.tags,
            duration: f.duration,
            hasCaptions: f.hasCaptions,
            cutLabel: f.cutLabel,
            featured: f.featured,
            videoUrl: f.videoUrl,
            poster: poster ? { src: poster.url, alt: poster.alt || "(대체 텍스트 없음)", width: poster.width, height: poster.height } : { src: "", alt: "", width: 1280, height: 720 },
            notes: { sceneIntent: f.sceneIntent, promptNotes: f.promptNotes, editNotes: f.editNotes },
            doc,
            media,
            seoTitle: view.seoTitle,
            seoDescription: view.seoDescription,
          }}
          newer={null}
          older={null}
          email={settings["contact.email"] ?? contactConfig.email}
          copy={filmsCopy(settings)}
        />
      </>
    );
  }

  // 여행 추천은 공개 상세와 같은 모양으로 보여 준다 (수정 중인 내용 기준, 공개되지 않는다)
  if (row.type === "travel") {
    const f = readTravelFields(view.fields);
    const settings = await getSiteSettings();
    const doc = body.ok && !isBodyEmpty(body.doc) ? body.doc : null;
    const today = kstDate(new Date());
    return (
      <>
        <p className={styles.alert} style={{ marginBottom: 16 }}>
          미리보기입니다. 공개되지 않은 화면이며, 수정 중인 내용이 보입니다. 지역·장소가 비어 있으면 발행할 수 없습니다.{" "}
          <Link href={`/admin/contents/${row.id}`} className={styles.linkButton}>
            편집으로 돌아가기
          </Link>
        </p>
        <TravelDetailView
          item={{
            slug: row.slug,
            title: view.title,
            summary: view.summary,
            region: f.region,
            place: f.place,
            season: f.season,
            level: f.level,
            budget: f.budget,
            checkedAt: f.checkedAt,
            publishedAt: today,
            publishedAtIso: new Date().toISOString(),
            doc,
            media,
            seoTitle: view.seoTitle,
            seoDescription: view.seoDescription,
          }}
          stale={isStaleCheck(f.checkedAt, today, travelConfig.staleMonths)}
          newer={null}
          older={null}
          email={settings["contact.email"] ?? contactConfig.email}
        />
      </>
    );
  }

  return (
    <>
      <p className={styles.alert} style={{ marginBottom: 16 }}>
        미리보기입니다. 공개되지 않은 화면이며, 공개 사이트에서는 사이트 디자인이 적용됩니다.{" "}
        <Link href={`/admin/contents/${row.id}`} className={styles.linkButton}>
          편집으로 돌아가기
        </Link>
      </p>
      <article className={styles.panel} style={{ maxWidth: 760 }}>
        <h1 className={styles.h1}>{view.title}</h1>
        {view.summary ? <p className={styles.note}>{view.summary}</p> : null}
        {view.tags.length > 0 ? <p className={styles.note}>{view.tags.map((t) => `#${t}`).join(" ")}</p> : null}
        {body.ok ? <ContentBody doc={body.doc} media={new Map(media.map((m) => [m.id, m]))} /> : <p className={styles.alert}>본문을 읽을 수 없습니다.</p>}
        {view.answers.length > 0 ? (
          <>
            <h2 className={styles.h2}>이 글이 답하는 질문</h2>
            <ul style={{ paddingLeft: 18, fontSize: 15 }}>
              {view.answers.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </>
        ) : null}
      </article>
    </>
  );
}
