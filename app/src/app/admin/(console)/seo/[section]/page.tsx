import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { adminDb } from "@/data/admin/dbServer";
import { readSeo } from "@/data/seo/store";
import { connection, ERROR_LABELS } from "@/data/seo/providers";
import { resolveSiteUrl } from "@/config/env";
import { logger } from "@/lib/logger";
import { SECTIONS, ENGINES, ENGINE_LABELS, OFFICIAL, FIELD_LABELS, STATUS_LABELS, aggregate, dateRange, parseFilters, classify, type Metric, type Engine, type JournalStatus } from "@/seo/model";
import { FieldForm, JournalForm, SyncForm } from "../Forms";
import styles from "../../../admin.module.css";

export const maxDuration = 300;

const stamp = (date: Date | null | undefined) => date ? date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) + " KST" : "미확인";
const value = (n: number | null | undefined) => n == null ? "미확인" : n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
export default async function SeoPage({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin();
  const { section } = await params;
  if (!Object.hasOwn(SECTIONS, section)) notFound();
  const filters = parseFilters(await searchParams);
  const range = dateRange(filters.days, new Date(), section === "journal");
  const origin = resolveSiteUrl(process.env).url.origin;
  const configs = [connection("google"), connection("bing")];
  let data: Awaited<ReturnType<typeof readSeo>>;
  try { data = await readSeo(adminDb(), admin, configs.map(c => c.scope)); }
  catch {
    logger.warn("seo.read", { outcome: "failed" });
    return <><h1 className={styles.h1}>SEO 현황</h1><p role="alert" className={styles.alert}>SEO 저장소를 읽지 못했습니다. DB 연결과 SEO 마이그레이션 적용 여부를 확인해 주세요. 미연동이나 성과 0을 의미하지 않습니다.</p></>;
  }
  const selected = filters.engine === "all" ? ENGINES : [filters.engine];
  const records = data.journal.filter(r => selected.includes(r.engine as Engine));
  return <>
    <h1 className={styles.h1}>{SECTIONS[section as keyof typeof SECTIONS]}</h1>
    <p className={styles.note}>검색엔진별 원본과 점검 기록을 확인합니다. 문의 전환: 미확인 (GA4 미연동).</p>
    <nav className={styles.row} aria-label="SEO 메뉴">{Object.entries(SECTIONS).map(([key, label]) => <Link className={styles.rowLink} key={key} href={`/admin/seo/${key}`} aria-current={key === section ? "page" : undefined}>{label}</Link>)}</nav>
    <h2 className={styles.h2}>조회 조건</h2>
    <form className={styles.filters} method="get"><label className={styles.filterItem}>기간<select className={styles.select} name="days" defaultValue={filters.days}>{[7, 28, 90].map(n => <option key={n} value={n}>최근 {n}일</option>)}</select></label><label className={styles.filterItem}>검색엔진<select name="engine" className={styles.select} defaultValue={filters.engine}><option value="all">전체 (엔진별 표시)</option>{ENGINES.map(e => <option key={e} value={e}>{ENGINE_LABELS[e]}</option>)}</select></label><button className={styles.smallButton}>적용</button></form>
    <p className={styles.note}>{range.start} ~ {range.end} · {section === "journal" ? "확인일 기준, 오늘 UTC 달력일 포함." : "어제 UTC 달력일까지. Google 날짜는 PT 기준, Bing은 원본 날짜 기준입니다. 데이터 지연으로 최근 날짜가 없을 수 있습니다."}</p>
    {(section === "overview" || section === "connections") && <>
      <SyncForm />
      <div className={styles.cards}>{selected.map(engine => {
        const config = configs.find(c => c.engine === engine);
        const sync = data.sync.find(s => s.scope === config?.scope);
        const latest = sync?.snapshot?.rows.reduce((max, r) => r.date > max ? r.date : max, "");
        return <section className={styles.statCard} key={engine}><h2>{ENGINE_LABELS[engine]}</h2><p>{engine === "naver" ? "수동 관리 · API 미확인" : !config?.configured ? "미연동 — 서버 설정 필요" : sync?.errorCode ? "연동 오류 — 마지막 성공 자료 유지" : sync?.succeededAt ? "마지막 조회 성공" : "설정 있음 · 연결 미확인"}</p>
          <p>데이터 기준일: {latest || "미확인"}</p><p>최근 성공 동기화: {stamp(sync?.succeededAt)}</p><p>최근 시도: {stamp(sync?.attemptedAt)}</p>{sync?.leaseUntil && sync.leaseUntil > new Date() && <p>동기화 진행 중</p>}{sync?.errorCode && <p role="status">{ERROR_LABELS[sync.errorCode] ?? "연동 오류"}</p>}
          <a href={OFFICIAL[engine]} target="_blank" rel="noopener noreferrer">{ENGINE_LABELS[engine]} 원본 도구</a></section>;
      })}</div>
    </>}
    {(section === "overview" || section === "performance") && <>
      {selected.map(engine => {
        const config = configs.find(c => c.engine === engine);
        const sync = data.sync.find(s => s.scope === config?.scope);
        const rows = sync?.snapshot?.rows.filter(r => r.date >= range.start && r.date <= range.end) ?? [];
        const total = aggregate(rows.filter(r => r.dimension === "date"));
        const latest = sync?.snapshot?.rows.reduce((max, r) => r.date > max ? r.date : max, "");
        return <section key={engine}><h2 className={styles.h2}>{ENGINE_LABELS[engine]} 검색 성과</h2>
          {engine === "naver" ? <p className={styles.note}>수동 기록은 아래에 별도로 표시합니다. 기간 중복 가능성이 있어 자동 합산하지 않습니다.</p> : <>
            <p className={styles.note}>{!config?.configured ? (sync?.snapshot ? "현재 미연동. 남아 있는 자료는 이전 성공 기록입니다." : "미연동 — 수집한 자료가 없습니다.") : !sync?.snapshot ? "아직 성공적으로 받은 자료가 없습니다." : "저장된 마지막 성공 자료"} · 기준일 {latest || "미확인"} · 동기화 {stamp(sync?.succeededAt)}{sync?.errorCode ? ` · 오류: ${ERROR_LABELS[sync.errorCode] ?? "연동 오류"}` : ""}</p>
            <div className={styles.cards}>{[["클릭", value(total?.clicks)], ["노출", value(total?.impressions)], ["CTR", total?.ctr == null ? "미확인" : `${value(total.ctr * 100)}%`], ["평균 순위", value(total?.position)]].map(([label, n]) => <div className={styles.statCard} key={label}><span className={styles.statLabel}>{label}</span><strong className={styles.statValue}>{n}</strong></div>)}</div>
            <p className={styles.note}>{engine === "google" ? "Google 웹 검색(final). 검색어 익명화·상위 행 제한으로 상세 합계와 총계가 다를 수 있습니다." : "Bing 전체 검색 영역의 클릭·노출. 평균 순위와 검색어·페이지 상세는 이 단계에서 미지원입니다."} 엔진 간 수치는 합산하지 않습니다. 빠진 날짜는 0으로 채우지 않습니다.</p>
            {sync?.snapshot?.truncated && <p className={styles.alert}>상위 행 수집 한도에 도달했습니다. 상세 목록은 일부 자료입니다.</p>}
            {section === "performance" && <>
              <MetricTable title="날짜별" rows={rows.filter(r => r.dimension === "date")} />
              {engine === "google" && <><MetricTable title="검색어별" rows={group(rows.filter(r => r.dimension === "query"))} /><MetricTable title="페이지별" rows={group(rows.filter(r => r.dimension === "page"))} classifyKey={key => FIELD_LABELS[classify(key, origin, data.fields)]} /></>}
            </>}
          </>}
        </section>;
      })}
      {selected.includes("naver") && <section><h2 className={styles.h2}>네이버 수동 성과 기록</h2><p className={styles.note}>선택한 기간과 겹치는 기록입니다. 전체 기록 기간의 수치를 그대로 표시하며 기간에 맞춰 나누거나 합산하지 않습니다.</p>
        {records.filter(r => r.engine === "naver" && r.periodStart && r.periodEnd && r.periodStart <= range.end && r.periodEnd >= range.start).map(r => <p key={r.id}>{r.periodStart} ~ {r.periodEnd}: 클릭 {value(r.clicks)} / 노출 {value(r.impressions)} · 확인일 {r.observedOn} · <a href={r.sourceUrl!} target="_blank" rel="noopener noreferrer">원본</a></p>)}
        {!records.some(r => r.engine === "naver" && r.periodStart && r.periodEnd && r.periodStart <= range.end && r.periodEnd >= range.start) && <p>해당 기간 수동 기록 없음 · 미확인</p>}</section>}
      <h2 className={styles.h2}>조치가 남은 점검</h2><p>{records.filter(r => r.status !== "resolved").length}건 (최근 200개 점검 기록 기준) · <Link href="/admin/seo/journal">점검 일지 열기</Link></p>
    </>}
    {section === "journal" && <>
      <h2 className={styles.h2}>새 점검 기록</h2><section className={styles.panel}><JournalForm /></section>
      <h2 className={styles.h2}>점검 일지</h2><p className={styles.note}>확인일이 조회 기간에 포함되는 최근 기록 최대 200개. 조치 필요 → 수정 완료 → 재검사 대기 → 해결 완료 또는 추가 조치.</p>
      {records.filter(r => r.observedOn >= range.start && r.observedOn <= new Date().toISOString().slice(0, 10)).map(row => <details key={`${row.id}-${row.version}`} className={styles.panel}><summary>{row.title} · {ENGINE_LABELS[row.engine as Engine]} · {STATUS_LABELS[row.status as JournalStatus]}</summary><p className={styles.note}>최근 수정 {stamp(row.updatedAt)}</p><JournalForm row={row} /></details>)}
      {!records.some(r => r.observedOn >= range.start) && <p>해당 기간 점검 기록이 없습니다.</p>}
    </>}
    {section === "connections" && <>
      <h2 className={styles.h2}>서버 연동 설정</h2><p className={styles.note}>키·토큰은 이 화면에 입력하거나 표시하지 않습니다. 배포 환경의 서버 시크릿에 설정한 뒤 동기화하세요. 설정 존재는 인증 성공을 의미하지 않습니다.</p>
      {configs.map(c => <section key={c.engine} className={styles.panel}><h3>{ENGINE_LABELS[c.engine]}</h3><ul>{c.keys.map(k => <li key={k.name}><code>{k.name}</code>: {k.present ? "설정 있음" : "미설정"}</li>)}</ul></section>)}
      <ol><li>Google Search Console에서 정확한 사이트 속성 접근 권한을 확인합니다. OAuth 클라이언트로 webmasters.readonly 범위의 갱신 토큰을 발급합니다. 토큰 갱신 실패 시 재인증하세요.</li><li>Bing에서 사이트 소유 확인 후 Settings → API Access의 키를 서버에 등록합니다. 키는 사용자 전체 사이트 범위이므로 가능한 전용 계정의 최소 권한을 사용하세요. 이 앱은 조회 API만 호출합니다.</li><li>Naver는 공식 도구에서 직접 사이트를 등록하고, 원본 확인 후 점검 일지에 기록합니다. 로그인 자동 수집은 하지 않습니다.</li><li>DB 마이그레이션 후 CRON_SECRET과 일간 /api/cron/seo 호출을 설정합니다. 같은 날 성공한 엔진은 다시 수집하지 않으며 실패 시 5분 뒤 재시도할 수 있습니다.</li></ol>
      <p className={styles.note}>일간 작업 정의: 04:00 UTC (13:00 KST). Vercel 스케줄 실제 활성화·실행은 배포 후 확인해야 합니다. 키 교체와 폐기는 각 공식 도구에서 수행합니다.</p><FieldForm fields={data.fields} />
    </>}
    {section === "indexing" && <><h2 className={styles.h2}>수집·색인 상태는 아직 자동 조회하지 않습니다</h2><p className={styles.note}>성과가 0이거나 없는 것만으로 색인 실패를 판단할 수 없습니다. 공식 도구에서 URL을 확인한 뒤 점검 일지에 근거를 남겨 주세요.</p><OfficialLinks /><p><Link href="/admin/seo/journal">수집·색인 점검 기록하기</Link></p><p className={styles.note}>Phase 3 예정: 사이트맵 URL 목록, Google URL Inspection·사이트맵 제출, Bing 공식 지원 제출·IndexNow, 네이버 수동 기록. 일반 페이지 Google 색인 요청은 공식 도구에서 직접 하며 제한된 Indexing API를 사용하지 않습니다.</p></>}
    {section === "diagnostics" && <><h2 className={styles.h2}>기술 진단 결과 미확인</h2><p className={styles.note}>자동 검사를 실행하지 않았습니다. 현재는 확인한 문제를 점검 일지로 관리할 수 있습니다.</p><Link href="/admin/seo/journal">기술 점검 기록하기</Link><p className={styles.note}>Phase 4 예정: robots, sitemap, HTTP, canonical, meta, H1, ALT, 내부 링크, 구조화 데이터, PageSpeed. Phase 5 예정: GA4 문의 전환, 분야별 성과·전환, 주간·월간 요약.</p></>}
  </>;
}
function OfficialLinks() { return <ul>{ENGINES.map(e => <li key={e}><a href={OFFICIAL[e]} target="_blank" rel="noopener noreferrer">{ENGINE_LABELS[e]} 공식 도구</a></li>)}</ul>; }
function group(rows: Metric[]): Metric[] {
  const grouped = new Map<string, Metric[]>();
  for (const row of rows) { const items = grouped.get(row.key); if (items) items.push(row); else grouped.set(row.key, [row]); }
  return [...grouped].map(([key, items]) => ({ ...items[0]!, key, ...aggregate(items)! }));
}
function MetricTable({ title, rows, classifyKey }: { title: string; rows: Metric[]; classifyKey?: (key: string) => string }) {
  const displayed = [...rows].sort((a, b) => a.dimension === "date" ? b.date.localeCompare(a.date) : b.clicks - a.clicks).slice(0, 100);
  return <><h3 className={styles.h2}>{title}</h3><p className={styles.note}>수집 {rows.length.toLocaleString()}행 중 최대 100행 표시{title === "날짜별" ? " (최신순)" : " (클릭순)"}.</p>{!rows.length ? <p>이 기간에 반환된 자료가 없습니다. 0으로 추정하지 않습니다.</p> : <table className={styles.table}><thead><tr><th>항목</th>{classifyKey && <th>분야</th>}<th>클릭</th><th>노출</th><th>CTR</th><th>평균 순위</th></tr></thead><tbody>{displayed.map(r => <tr key={`${r.date}:${r.key}`}><td data-label="항목" style={{ overflowWrap: "anywhere" }}>{r.dimension === "date" ? r.date : r.key}</td>{classifyKey && <td data-label="분야">{classifyKey(r.key)}</td>}<td data-label="클릭">{value(r.clicks)}</td><td data-label="노출">{value(r.impressions)}</td><td data-label="CTR">{r.impressions > 0 ? `${value(r.clicks / r.impressions * 100)}%` : "미확인"}</td><td data-label="평균 순위">{value(r.position)}</td></tr>)}</tbody></table>}</>;
}
