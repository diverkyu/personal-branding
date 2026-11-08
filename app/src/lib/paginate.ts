/** 페이지 나누기 계산 (STORY-05, REV-05). 순수 함수. */
export interface PageInfo {
  /** 1부터. 범위를 벗어난 값은 가장 가까운 유효 페이지로 맞춘다 */
  page: number;
  pages: number;
  /** 잘라 쓸 구간 [start, end) */
  start: number;
  end: number;
}

export function paginate(total: number, requestedPage: number, size: number): PageInfo {
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, Math.trunc(requestedPage) || 1), pages);
  const start = (page - 1) * size;
  return { page, pages, start, end: Math.min(start + size, total) };
}

/** URL 쿼리의 page 값을 안전하게 숫자로 바꾼다. 숫자가 아니면 1 */
export function parsePage(raw: string | null | undefined): number {
  if (!raw || !/^[0-9]{1,6}$/.test(raw)) return 1;
  return Number(raw) || 1;
}
