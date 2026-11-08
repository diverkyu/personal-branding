/** 날짜 표기 (SCREEN-SPEC §4.4): 2026.11.08, 기간은 2026.11.08 – 11.10. ISO 날짜(YYYY-MM-DD)만 받는다. */
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function parts(iso: string): [string, string, string] {
  const m = ISO.exec(iso);
  if (!m) throw new Error(`날짜 형식이 올바르지 않습니다: ${iso}`);
  return [m[1] as string, m[2] as string, m[3] as string];
}

export function formatDate(iso: string): string {
  const [y, m, d] = parts(iso);
  return `${y}.${m}.${d}`;
}

export function formatPeriod(startIso: string, endIso: string): string {
  const [sy, sm, sd] = parts(startIso);
  const [ey, em, ed] = parts(endIso);
  if (startIso === endIso) return `${sy}.${sm}.${sd}`;
  if (sy === ey) return `${sy}.${sm}.${sd} – ${em}.${ed}`;
  return `${sy}.${sm}.${sd} – ${ey}.${em}.${ed}`;
}

const KST = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** 어드민용 일시 표기: 한국 시간 기준 2026.11.08 12:00 */
export function formatDateTimeKst(date: Date | string): string {
  const parts = Object.fromEntries(KST.formatToParts(new Date(date)).map((p) => [p.type, p.value]));
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}
