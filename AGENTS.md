# AGENTS.md — diverkyu.com 작업 규약

이 저장소에서 작업하는 **모든 AI 세션과 사람**이 가장 먼저 읽는 규약이다. 코드를 고치기 전에 여기서 말하는 것부터 따른다. 이 규약이 아래 문서와 충돌하면 **문서가 이긴다.** 그리고 이 규약을 고친다.

## 1. 읽는 순서

1. [docs/phase1/PRD.md](docs/phase1/PRD.md) — 무엇을 만드는가 (요구사항 ID)
2. [docs/phase1/DEVELOPMENT.md](docs/phase1/DEVELOPMENT.md) — 어떻게 만드는가 (변경 루프, 로그, 검증)
3. [docs/phase1/SECURITY.md](docs/phase1/SECURITY.md) — 인증·입력·업로드·개인정보 통제
4. [docs/phase1/SCREEN-SPEC.md](docs/phase1/SCREEN-SPEC.md) — 화면 요소(ID), 인터랙션, 어드민 필드
5. [docs/phase1/DESIGN-SYSTEM.md](docs/phase1/DESIGN-SYSTEM.md) — 토큰과 컴포넌트 (화면 작업 전 필독)
6. [docs/phase1/CONCEPT.md](docs/phase1/CONCEPT.md) — 톤·카피 (§7). 확정 카피는 [docs/COPY.md](docs/COPY.md)
7. 어드민·운영 작업 전: [docs/phase1/ADMIN-DESIGN.md](docs/phase1/ADMIN-DESIGN.md)(구조와 단계별 구현 기록), [docs/phase1/INFRASTRUCTURE.md](docs/phase1/INFRASTRUCTURE.md)(호스팅·DB·저장소 결정)

`docs/*.md`(DESIGN, COPY, BASELINE, PRODUCT-CONCEPT 등)는 규강의 기존 시안 문서이며 **수정하지 않는다.**

## 2. 저장소 구조와 경계

| 경로 | 내용 | 규칙 |
| --- | --- | --- |
| `app/` | 새 사이트(Next.js)와 어드민 코드 | 모든 새 코드는 여기에. 자체 `package.json`, 사용법은 [app/README.md](app/README.md) |
| `docs/phase1/` | 기획·설계 문서 (버전 관리: [CHANGELOG.md](docs/phase1/CHANGELOG.md)) | 코드가 명세를 바꾸면 같은 PR에서 문서와 버전 표를 고친다 |
| `docs/operations/` | 운영·인수인계 기록 (날짜별) | 사실만 적는다. 비밀번호·연결 주소·키는 쓰지 않는다 |
| `docs/legal/` | 개인정보 처리방침·동의 문구 등 **법무 초안** | 초안이며 법률 자문이 아니다. 게시 전 전문가 확인 |
| `dist/`, `scripts/`, 루트 `package.json`·`CHANGELOG.md`, `.openai/` | 규강의 기존 정적 시안 | **건드리지 않는다.** 충돌의 원인이다 |
| 루트 `README.md` | 저장소 소개 | 현재 상태가 바뀌면 같은 PR에서 고친다 (2026-11-09 개정, 규강과 협의함) |

## 3. 스택

Next.js 16.4(App Router) + React 19 + TypeScript strict + CSS 변수·CSS Modules(스타일 라이브러리 없음) + Vitest + Playwright. 아이콘 Lucide(ISC), 글꼴 DM Sans·Noto Sans KR·Lora(OFL, 빌드 시 자체 호스팅).

**서비스 결정** (자세한 조건은 [INFRASTRUCTURE](docs/phase1/INFRASTRUCTURE.md)):

| 영역 | 선택 | 비고 |
| --- | --- | --- |
| 호스팅 | Vercel | Hobby로 시작, **공개 운영 전 Pro 전환이 조건** |
| 데이터베이스 | Neon Postgres + Drizzle | 로컬·프리뷰는 `dev` 브랜치, 운영만 `production` 브랜치 |
| 어드민 인증 | Better Auth + TOTP 2차 인증 | 가입 화면 없음, 계정은 스크립트로 생성 |
| 편집기 | Tiptap | 허용 목록 밖의 서식은 서버가 거른다 |
| 이미지 | Vercel Blob | 업로드는 서버가 WebP로 다시 만들며 메타데이터를 버린다 |
| 접수 알림 메일 | Resend | 구현됨(0.39.0). 실제 발송은 키·발신 도메인 연결 후(규강) |

호스팅 전용 기능에 직접 기대는 코드를 넣지 않는다 — 데이터 접근은 `data/` 어댑터 뒤에 둔다. 의존성은 **상업적 사용이 명확한 라이선스만** 추가하고 [THIRD-PARTY-NOTICES](app/THIRD-PARTY-NOTICES.md)에 적는다. 버전을 올릴 때는 [DEVELOPMENT §10](docs/phase1/DEVELOPMENT.md) 규칙(안정판, 한 번에 하나, `chore:` 커밋)을 따른다.

## 4. 명령 (`app/` 안에서)

```bash
npm run dev          # 개발 서버
npm run typecheck && npm run lint && npm run test && npm run build   # 공통 게이트 (= npm run check)
npm run test:e2e     # 실제 Chrome, 화면 폭 390/768/1440, 운영 빌드를 별도 포트(3100)로 실행
npm run db:generate  # 스키마 변경으로 마이그레이션 SQL 생성 (DB 접속 불필요)
npm run db:migrate   # DATABASE_URL 의 DB 에 마이그레이션 적용 — 대상 DB 를 먼저 확인한다 (§8)
npm run db:status    # 코드와 DB 의 마이그레이션 차이를 읽기만 해서 보여 줌 — 배포 전 dev·운영 모두 OK 인지 본다 (§8)
npm run admin:create # 어드민 계정 생성·재설정 (admin:reset-password, admin:reset-2fa). 비밀번호는 사람이 터미널에서 입력
```

E2E 캡처는 `app/artifacts/`에 저장된다 (git 무시). 캡처는 **파일을 열어서 읽는다.**
컴포넌트 모양은 개발 서버의 `/dev/components`(쇼케이스)에서 확인한다. 운영에서는 기본 404다.

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
- 비밀번호·연결 문자열·토큰·인증 키 같은 **시크릿을 코드·로그·PR·대화에 쓰는 것** — 이름만 적고 값은 쓰지 않는다. 화면에서 값을 확인해야 하면 사람이 직접 한다.
- AI 가 비밀번호·2차 인증 코드를 입력하거나 계정을 만드는 것 (사람이 터미널에서 입력한다. 자신이 만드는 앱의 로컬 시험용 계정은 예외이며 끝나면 지운다).

## 7. git과 PR

- `main`에 직접 푸시하지 않는다. 기능 브랜치 → PR → 규강 검토 후 병합. 단계마다 PR 하나.
- 커밋 하나 = 논리적 변경 하나. 접두어 `feat` `fix` `docs` `chore` `refactor` `test`.
- 사용자의 결정이 필요한 것(범위, 선택지, 비가역 작업)은 선택지를 제시해 묻고 답을 받은 뒤 진행한다.
- **병합은 사람이 한다.** AI 는 PR 을 열고 검증 결과를 댓글로 남길 뿐 병합하지 않는다. PR 본문에는 통과 / 실패 / 미검증 / 대기를 구분해 쓴다.
- 한 단계 위에 다음 단계를 쌓지 않는다. 앞 PR 이 병합되면 최신 `main` 에서 새 브랜치를 판다.

## 8. 운영 데이터와 배포

- **로컬·프리뷰·시험은 Neon `dev` 브랜치만 쓴다.** `production` 브랜치는 사용자가 확인한 작업(마이그레이션, 계정 생성)에만 쓰고, 그때만 쓰는 연결 문자열은 별도 임시 파일에 두었다가 끝나면 **바로 지운다** (`.env.*` 는 Git 이 무시한다).
- **마이그레이션은 배포와 별개다.** 새 마이그레이션이 들어간 코드를 운영에 올리기 전에 운영 DB 에 먼저 적용한다. 빠지면 어드민이 오류를 낸다. **Preview 가 쓰는 dev 브랜치도 똑같이** 적용하고, 두 DB 에서 `npm run db:status` 가 OK 인지 확인한다([INFRASTRUCTURE §10.5](docs/phase1/INFRASTRUCTURE.md)). 적용 전에는 대상이 운영인지 개발인지 연결 주소의 종류로 확인하되, 주소 값을 출력하지 않는다.
- 운영 DB 를 바꾸는 작업은 **무엇이 바뀌는지 설명하고 확인을 받은 뒤** 한다. 기존 데이터를 지우거나 바꾸는 작업은 하지 않는다.
- 시험으로 만든 데이터(계정, 글, 신청)는 시험이 끝나면 지운다. 정리 스크립트는 `dev` 브랜치에서만 돌린다.
- 새 환경변수는 `app/.env.example` 에 이름과 용도만 추가하고, 값은 Vercel 환경변수에 사람이 넣는다.
