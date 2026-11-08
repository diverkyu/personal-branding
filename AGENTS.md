# AGENTS.md — diverkyu.com 작업 규약

이 저장소에서 작업하는 **모든 AI 세션과 사람**이 가장 먼저 읽는 규약이다. 코드를 고치기 전에 여기서 말하는 것부터 따른다. 이 규약이 아래 문서와 충돌하면 **문서가 이긴다.** 그리고 이 규약을 고친다.

## 1. 읽는 순서

1. [docs/phase1/PRD.md](docs/phase1/PRD.md) — 무엇을 만드는가 (요구사항 ID)
2. [docs/phase1/DEVELOPMENT.md](docs/phase1/DEVELOPMENT.md) — 어떻게 만드는가 (변경 루프, 로그, 검증)
3. [docs/phase1/SECURITY.md](docs/phase1/SECURITY.md) — 인증·입력·업로드·개인정보 통제
4. [docs/phase1/SCREEN-SPEC.md](docs/phase1/SCREEN-SPEC.md) — 화면 요소(ID), 인터랙션, 어드민 필드
5. [docs/phase1/DESIGN-SYSTEM.md](docs/phase1/DESIGN-SYSTEM.md) — 토큰과 컴포넌트 (화면 작업 전 필독)
6. [docs/phase1/CONCEPT.md](docs/phase1/CONCEPT.md) — 톤·카피 (§7). 확정 카피는 [docs/COPY.md](docs/COPY.md)

`docs/*.md`(DESIGN, COPY, BASELINE, PRODUCT-CONCEPT 등)는 규강의 기존 시안 문서이며 **수정하지 않는다.**

## 2. 저장소 구조와 경계

| 경로 | 내용 | 규칙 |
| --- | --- | --- |
| `app/` | 새 사이트(Next.js) 코드 | 모든 새 코드는 여기에. 자체 `package.json` |
| `docs/phase1/` | 기획·설계 문서 (버전 관리: [CHANGELOG.md](docs/phase1/CHANGELOG.md)) | 코드가 명세를 바꾸면 같은 PR에서 문서와 버전 표를 고친다 |
| `dist/`, `scripts/`, 루트 `package.json`·`README.md`·`CHANGELOG.md` | 규강의 기존 정적 시안 | **건드리지 않는다.** 충돌의 원인이다 |

## 3. 스택 (2026-11-08 결정)

Next.js 16.4(App Router) + React 19 + TypeScript strict + CSS 변수·CSS Modules(스타일 라이브러리 없음) + Vitest + Playwright. 아이콘 Lucide(ISC), 글꼴 DM Sans·Noto Sans KR·Lora(OFL, 빌드 시 자체 호스팅). **호스팅은 아직 정하지 않았다** — 특정 호스팅에 묶이는 코드를 넣지 않는다. 버전을 올릴 때는 [DEVELOPMENT §10](docs/phase1/DEVELOPMENT.md) 규칙(안정판, 한 번에 하나, `chore:` 커밋)을 따른다.

## 4. 명령 (`app/` 안에서)

```bash
npm run dev          # 개발 서버
npm run typecheck && npm run lint && npm run test && npm run build   # 공통 게이트 (= npm run check)
npm run test:e2e     # 실제 Chrome, 화면 폭 390/768/1440, 운영 빌드를 별도 포트(3100)로 실행
```

E2E 캡처는 `app/artifacts/`에 저장된다 (git 무시). 캡처는 **파일을 열어서 읽는다.**

## 5. 변경 루프 ([DEVELOPMENT §2](docs/phase1/DEVELOPMENT.md))

1. 근거 명세(PRD ID, 화면 설계서 요소 ID), 바꾸지 않을 조건, 영향 파일을 적는다.
2. **고치기 전에 재현한다.** 화면은 실제 캡처, 서버·데이터는 구조화 로그로 증거를 모은다. 관측과 가설을 분리한다.
3. 원인 경계를 특정하고 작게 고친다. 통신 실패를 CSS로 가리지 않는다.
4. 회귀 테스트와 공통 게이트를 실행한다. 화면은 수정 전후를 같은 조건으로 캡처한다.
5. 통과 / 실패 / 미검증 / 대기를 구분해 보고한다. 실행하지 않은 검증을 통과라고 쓰지 않는다.

## 6. 금지

- 빈 `catch`, 흩어진 `console.log` — 로거(`app/src/lib/logger.ts`)를 쓴다.
- 코드에 시크릿·매직 넘버·색상·사이트 주소 — `.env`, `src/config/`, 디자인 토큰, `SITE_URL`.
- 로그·캡처·테스트 데이터에 개인정보 — 가상 데이터만 쓴다.
- 화면에서 DB·스토리지 직접 접근 — `data/` 계층을 거친다.
- 명세와 어긋난 침묵의 구현 — 코드를 고치거나 문서를 개정한다.
- 요청 범위 밖의 "겸사겸사" 변경 — 기록해 두고 별도 요청으로 처리한다.
- 학습용 키트·타인 코드 복사, 상업 이용이 불명확한 리소스(폰트·아이콘·이미지) 추가.

## 7. git과 PR

- `main`에 직접 푸시하지 않는다. 기능 브랜치 → PR → 규강 검토 후 병합. 단계마다 PR 하나.
- 커밋 하나 = 논리적 변경 하나. 접두어 `feat` `fix` `docs` `chore` `refactor` `test`.
- 사용자의 결정이 필요한 것(범위, 선택지, 비가역 작업)은 선택지를 제시해 묻고 답을 받은 뒤 진행한다.
