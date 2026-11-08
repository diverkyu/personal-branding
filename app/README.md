# app — diverkyu.com 사이트

Next.js 16 기반의 공개 사이트와 CMS 어드민. 규약은 저장소 루트의 [AGENTS.md](../AGENTS.md), 설계는 [docs/phase1/](../docs/phase1/)를 본다.

기존 정적 시안(`../dist`, `../scripts`)과는 **별개**이며 서로 영향을 주지 않는다.

## 시작하기

Node.js 24 이상(LTS)이 필요하다.

```bash
cd app
npm install
cp .env.example .env.local   # 값을 채운다 (커밋 금지)
npm run dev                  # http://localhost:3000
```

## 명령

| 명령 | 하는 일 |
| --- | --- |
| `npm run typecheck` | TypeScript strict 검사 |
| `npm run lint` | ESLint (`console.log`, 빈 `catch` 금지 포함) |
| `npm run test` | Vitest 단위 시험 |
| `npm run build` | 운영 빌드 (글꼴을 내려받아 자체 호스팅하므로 인터넷 연결 필요) |
| `npm run check` | 위 네 가지를 차례로 |
| `npm run test:e2e` | 운영 빌드를 3100 포트로 띄워 Chrome에서 390 / 768 / 1440 폭으로 시험. 캡처는 `artifacts/`에 저장 |

E2E는 설치된 Chrome을 쓴다. 번들 Chromium을 쓰려면 `PW_CHANNEL= npx playwright install chromium` 후 `PW_CHANNEL= npm run test:e2e`.

## 구조

```text
src/
├── app/          # 라우트 (얇게 유지)
├── components/   # ui/ (기본 요소), site/ (카드 등), layout/ (헤더·푸터) — 쇼케이스: /dev/components
├── config/       # 상수·환경변수 해석 (단일 출처)
├── lib/          # 비즈니스 로직·로거·오류 (순수 함수)
├── styles/       # 디자인 토큰 (DESIGN-SYSTEM.md §2)
└── instrumentation.ts   # 서버 시작 시 설정 점검 로그
tests/e2e/        # Playwright 시나리오
```

`data/`(DB·스토리지 접근)와 `types/`(콘텐츠 스키마)는 해당 기능을 만들 때 추가한다.

## 환경변수

[.env.example](.env.example) 참고. 핵심은 `SITE_URL`(사이트 주소 단일 출처)과 `SITE_INDEXING`(공개 전에는 색인 금지, 기본 꺼짐).

**주의**: 정적 페이지에는 `SITE_URL`, `SITE_INDEXING`, `ENABLE_COMPONENT_SHOWCASE`가 **빌드 때** 반영된다. 값을 바꾸면 다시 빌드해야 한다 (도메인이 바뀔 때도 마찬가지).
