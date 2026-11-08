/**
 * 제출 빈도 제한과 중복 제출 방지 (SECURITY §8). 서버 프로세스 메모리에 둔 간단한 구현이다.
 * 한계: 서버가 여러 개이거나 재시작되면 기록이 사라진다. 호스팅·저장소가 정해지면 공유 저장소로 옮긴다.
 */
export interface RateLimiterOptions {
  /** 같은 키가 윈도 안에 허용되는 횟수 */
  limit: number;
  windowMs: number;
  now?: () => number;
}

export function createRateLimiter({ limit, windowMs, now = Date.now }: RateLimiterOptions) {
  const hits = new Map<string, number[]>();

  return {
    /** 허용되면 기록하고 true, 한도를 넘으면 기록하지 않고 false */
    allow(key: string): boolean {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(t);
      hits.set(key, recent);
      // 오래된 키가 쌓이지 않게 가끔 청소한다
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (v.every((x) => t - x >= windowMs)) hits.delete(k);
      }
      return true;
    },
  };
}

/** 같은 내용이 짧은 시간에 다시 오면 중복으로 본다 (멱등 처리) */
export function createDuplicateGuard({ windowMs, now = Date.now }: { windowMs: number; now?: () => number }) {
  const seen = new Map<string, number>();
  return {
    /** 처음 보는 내용이면 true(기록), 윈도 안에서 다시 오면 false */
    firstTime(fingerprint: string): boolean {
      const t = now();
      const prev = seen.get(fingerprint);
      if (prev !== undefined && t - prev < windowMs) return false;
      seen.set(fingerprint, t);
      return true;
    },
  };
}
