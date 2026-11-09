# personal-branding

**KYU — Dive deeper. Create beyond.**

프리다이빙 강사이자 AI 크리에이터 **이동규 · KYU**의 개인 브랜딩 사이트(diverkyu.com)와, 규강이 코드 없이 글과 신청을 관리하는 **CMS 어드민**을 만드는 저장소입니다.

- **GitHub:** [diverkyu/personal-branding](https://github.com/diverkyu/personal-branding)
- **현재 단계:** Phase 1 구현 중 — 정식 공개(게시) 이전입니다. 진행 현황과 결정은 [문서 변경 이력](docs/phase1/CHANGELOG.md)에 있습니다.
- **도메인:** diverkyu.com은 가칭이며, 주소는 `SITE_URL` 설정으로 바뀌므로 코드 수정 없이 바꿀 수 있습니다.

## 지금 있는 것

### 공개 사이트

| 화면 | 상태 |
| --- | --- |
| Home · About · Contact · 개인정보 처리방침 | 구현됨. 연락처·문구·동의 문구는 어드민 설정에서 바꿉니다 |
| **Story** (목록·상세·태그) | **어드민에서 발행한 글이 그대로 나옵니다** (DB 연결, 예약 발행 포함) |
| **투어** (목록·상세·모집 상태) | **어드민에서 만든 투어가 그대로 나옵니다** (일정·장소·모집 상태·갤러리·스케치 영상, 마감하면 바로 반영) |
| Freediving 허브 · 장비 · 수강 후기 | 화면은 구현됨. **장비·후기 내용은 아직 예시 데이터**이며 어드민 편집은 다음 단계(AD-6b)입니다 |
| 투어 예약 문의 · 소식 받기 | 구현됨. 접수된 신청은 DB에 저장되고 어드민에서 처리합니다 |

### 어드민 (`/admin`)

| 기능 | 내용 |
| --- | --- |
| 로그인 | 이메일·비밀번호 + **TOTP 2차 인증 필수**, 가입 화면 없음(계정은 운영자가 스크립트로 생성) |
| 신청·문의 | 목록·상세·상태 처리·CSV 내보내기·개인정보 파기 |
| 활동 기록 | 누가 무엇을 했는지 남기는 기록(개인정보는 담지 않음) |
| 사이트 설정 | 연락처·SNS·문구, 동의·처리방침 버전 관리 |
| 미디어 | 이미지 업로드(WebP 변환, 위치정보 제거), 대체 텍스트, 사용 중 삭제 방지 |
| 콘텐츠 | **스토리·투어 작성(리치 텍스트 편집기, 이미지·영상 삽입, 투어 갤러리)**, 미리보기, 임시저장·검토·발행·보관, **예약 발행**, 발행된 글 수정 시 별도 초안, 투어 모집 상태 바로 바꾸기 |

아직 없는 것: 영상·여행 추천 유형, 후기·장비·About 편집, 휴지통 복원, 자동 입력, 알림 메일. 순서와 범위는 [ADMIN-DESIGN §11](docs/phase1/ADMIN-DESIGN.md)에 있습니다.

## 기술 스택

| 영역 | 선택 |
| --- | --- |
| 프레임워크 | Next.js 16 (App Router) · React 19 · TypeScript strict |
| 스타일 | CSS 변수 + CSS Modules (스타일 라이브러리 없음) |
| 데이터베이스 | Neon Postgres + Drizzle ORM |
| 인증 | Better Auth (이메일·비밀번호 + TOTP) |
| 편집기 | Tiptap |
| 이미지 저장소 | Vercel Blob |
| 호스팅 | Vercel (운영 전 요금제 조건은 [INFRASTRUCTURE §2](docs/phase1/INFRASTRUCTURE.md)) |
| 시험 | Vitest(단위·통합, PGlite) · Playwright(E2E, 실제 Chrome) |

모든 의존성은 상업적 사용이 가능한 라이선스만 씁니다. 목록과 고지는 [app/THIRD-PARTY-NOTICES.md](app/THIRD-PARTY-NOTICES.md)에 있습니다.

## 저장소 구조

```text
app/                  # 새 사이트와 어드민 (Next.js). 모든 새 코드는 여기에
  src/app/            #   라우트 — 공개 화면, /admin, /api
  src/data/           #   화면이 데이터를 읽는 유일한 입구 (DB 직접 접근 금지)
  src/content/        #   콘텐츠 유형·본문 검사기·렌더러·발행 규칙
  src/editor/         #   Tiptap 편집기
  drizzle/            #   DB 마이그레이션 SQL
  tests/e2e/          #   Playwright E2E
docs/phase1/          # 기획·설계 문서 세트 (PRD, 화면 설계, 보안, 어드민 설계 등)
docs/*.md             # 초기 시안의 디자인·카피 문서 (수정하지 않음)
dist/ scripts/        # 초기 정적 시안 (보존용, 수정하지 않음)
AGENTS.md             # 이 저장소에서 작업하는 사람·AI의 작업 규약
```

## 개발 환경 시작하기

Node.js 24 이상이 필요합니다.

```sh
git clone https://github.com/diverkyu/personal-branding.git
cd personal-branding/app
npm install
cp .env.example .env.local   # 값을 채웁니다 (커밋 금지)
npm run dev                  # http://localhost:3000
```

- **DB 없이도 실행됩니다.** `DATABASE_URL`이 없으면 공개 화면은 예시 데이터로 열리고, 어드민은 "설정되지 않음"으로 닫혀 있습니다. 실제 사이트(Vercel)에서는 예시 글이 나오지 않습니다.
- 어드민과 글 발행을 시험하려면 Neon **`dev` 브랜치**의 연결 문자열을 `.env.local`에 넣고 `npm run db:migrate`를 실행합니다. 로컬과 프리뷰에서 **운영(production) 브랜치를 쓰지 않습니다.**
- 환경변수는 이름과 용도만 [app/.env.example](app/.env.example)에 있습니다. 값(비밀번호·키·토큰)은 어디에도 커밋하지 않습니다.
- 전체 명령(검사·시험·마이그레이션)은 [app/README.md](app/README.md)에 있습니다. 변경 전에 `npm run check`(타입·린트·시험·빌드)를 통과시킵니다.

어드민 계정은 가입 화면이 없으므로 운영자가 터미널에서 만듭니다. 비밀번호는 화면에 보이지 않게 직접 입력하며 인자나 환경변수로 받지 않습니다.

```sh
npm run admin:create           # 새 관리자
npm run admin:reset-password   # 비밀번호 재설정
npm run admin:reset-2fa        # 2차 인증 초기화
```

## 배포와 운영

- **Vercel**에 배포하며 데이터베이스는 Neon, 이미지는 Vercel Blob입니다. 결정과 조건은 [INFRASTRUCTURE.md](docs/phase1/INFRASTRUCTURE.md)에 있습니다.
- **마이그레이션은 배포와 별개입니다.** 새 마이그레이션이 들어간 변경을 운영에 올리기 전에 운영 DB에 먼저 적용해야 하며, 빠지면 어드민이 오류를 냅니다.
- 예약 발행은 `/api/cron/publish`를 Vercel Cron이 부르며, 환경변수 `CRON_SECRET`이 있어야 동작합니다. 무료(Hobby) 플랜의 Cron은 하루 한 번이지만, 예약 시각이 지난 글은 공개 화면에 5분 안에 나타납니다.
- 시크릿은 Vercel 환경변수에만 두고, 환경(로컬·프리뷰·운영)마다 다른 값을 씁니다.

## 문서

작업 전에 [AGENTS.md](AGENTS.md)를 먼저 읽고, 아래 순서로 봅니다.

1. [PRD](docs/phase1/PRD.md) — 무엇을 만드는가
2. [개발 설계 지침](docs/phase1/DEVELOPMENT.md) — 어떻게 만드는가
3. [보안 설계 지침](docs/phase1/SECURITY.md) — 인증·입력·업로드·개인정보
4. [화면 설계서](docs/phase1/SCREEN-SPEC.md) · [디자인 시스템](docs/phase1/DESIGN-SYSTEM.md) · [컨셉·카피](docs/phase1/CONCEPT.md)
5. [어드민 설계](docs/phase1/ADMIN-DESIGN.md) — 어드민 구조와 단계별 구현 기록
6. [인프라 결정](docs/phase1/INFRASTRUCTURE.md) · [사용자 테스트](docs/phase1/USER-TEST.md) · [상표 확인](docs/phase1/TRADEMARK-CHECK.md)

문서 세트는 하나의 버전을 함께 씁니다. 코드가 명세를 바꾸면 같은 PR에서 문서와 [변경 이력](docs/phase1/CHANGELOG.md)을 함께 고칩니다.

## 작업 방식

- `main`에 직접 푸시하지 않습니다. 기능 브랜치에서 작업하고, 단계마다 PR 하나를 열어 규강의 검토 후 병합합니다.
- 커밋 하나에는 논리적 변경 하나를 담고 `feat` `fix` `docs` `chore` `refactor` `test` 접두어를 씁니다.
- 로그·시험 데이터·캡처에 개인정보를 넣지 않습니다. 가상 데이터만 씁니다.

## 초기 시안 (v0.1.0, 보존)

`dist/`의 HTML·CSS·JavaScript는 2026-10-31에 사용자가 선택한 **초기 정적 시안**이며, 새 사이트의 디자인 기준점으로 보존합니다. 새 사이트(`app/`)와 서로 영향을 주지 않으므로 수정하지 않습니다. `v0.1.0` 태그로 언제든 되돌아가 볼 수 있습니다.

```sh
npm run dev        # 저장소 루트에서 시안 실행 (http://127.0.0.1:5173)
```

시안의 디자인·카피·스타일 기록은 [DESIGN](docs/DESIGN.md) · [COPY](docs/COPY.md) · [STYLE-INVENTORY](docs/STYLE-INVENTORY.md) · [BASELINE](docs/BASELINE.md)에 있고, 시안의 변경 이력은 루트 [CHANGELOG.md](CHANGELOG.md)에 있습니다. 시안의 포트폴리오 카드 세 개는 실제 실적이 아닌 **디자인용 콘셉트 미리보기**입니다. `.openai/hosting.json`은 기존 Sites 프로젝트를 가리키는 식별자이며 비밀값은 없습니다.

## 연락처

- 이름 / 활동명: 이동규 / KYU
- 이메일: [energizer629@naver.com](mailto:energizer629@naver.com)
- Instagram: [@hiitskyu](https://www.instagram.com/hiitskyu/), [@kyureative](https://www.instagram.com/kyureative/)

## 이용 및 권리

별도의 오픈소스 라이선스는 지정하지 않았습니다. 브랜드·콘텐츠의 재사용 조건은 소유자가 정합니다. 화면의 `KYU®`는 초기 시안에 포함된 표기를 그대로 보존한 것으로, 상표 등록 여부를 검증한 표시는 아닙니다. 공개 배포 전에 [상표 확인](docs/phase1/TRADEMARK-CHECK.md)에서 적절성을 검토합니다.
