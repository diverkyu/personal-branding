# SEO 통합 관리자 Phase 1/2 인수인계

## 작업 위치와 범위

- 저장소: `diverkyu/personal-branding`, 로컬 `concept-review`.
- 시작: `feat/seo-audit` 5996665, 변경 파일 없음. 이 미병합 작업은 해당 브랜치에 보존했다.
- 구현: 로컬 `main` 70d1947에서 `feat/seo-admin-phase12`를 생성. 원격 최신 여부를 추가 fetch로 검증한 것은 아니다.
- Next.js 16.4.5 / React 19.3.1 / TypeScript / Better Auth TOTP / Neon HTTP·Drizzle / Vercel. 새 의존성 없음.
- 기존 관리자 `requireAdmin`, CSS 모듈, 활동 기록, 데이터 계층을 재사용. 기존 공개 사이트·검색 노출 설정·발행/정리 크론 보존.
- 운영 배포·Git push·검색엔진 외부 제출·실 API 호출·원격 DB 변경을 하지 않았다.

## 구현한 것

6개 메뉴(`/admin/seo/overview`, `performance`, `indexing`, `diagnostics`, `journal`, `connections`). 모바일 SEO 사이드 메뉴는 접어서 기존 메뉴 높이 증가를 줄인다.

Google OAuth 갱신 토큰을 사용하는 읽기 전용 Search Analytics(web/final), 날짜/검색어/페이지 별 지표, CTR·가중 평균 순위. Bing JSON REST의 날짜별 클릭·노출(전체 검색 영역). 네이버는 공식 도구에서 확인한 기간·클릭·노출을 선택 입력하는 수동 일지와 원본 링크. 자동 성과 합계와 수동 자료는 섞지 않는다.

7/28/90일과 엔진 필터, 원본 기준일·최근 성공·시도·오류, 미연동/미확인/실제 0 구분, 데이터 지연·집계 차이·상위 행 제한 안내. 일지는 오늘을 포함하고 성과는 어제까지 조회한다(UTC 달력일 기준, Google 원본 날짜는 PT).

일지 등록/조회/수정/확인 후 소프트 삭제, 상태 전이·낙관적 버전 충돌 검사·활동 기록. 입력 실패 시 작성 내용을 보존한다. 최근 기록 최대 200개, 성과 테이블은 클릭순 또는 최신순 100행 표시로 범위를 명시한다.

실제 공개 URL 구조로 분야를 분류하고 Story 등은 URL별 수동 지정. 문의 전환은 GA4 미연동/미확인. 수집 및 색인 관리·기술 진단 메뉴는 공식 링크와 수동 기록, 후속 범위를 제공하며 자동 검사나 제출이 완료됐다고 표시하지 않는다.

동기화는 엔진·속성별 마지막 성공 JSONB 스냅샷을 원자적으로 갱신한다. 최근 90일 재조회, 같은 날 성공 중복 방지, 10분 DB 임대 잠금, 실패 후 5분 재시도 간격, 늦게 끝난 구 실행의 덮어쓰기 차단. 성공 전에는 기존 스냅샷을 변경하지 않는다. 속성을 바꾸면 다른 속성의 저장 자료를 표시하지 않는다. 장기 이력 적재/요약은 Phase 5에서 별도 확장한다.

## 적용 전 설정 — 소유자가 직접

### DB

`app/drizzle/0009_amusing_enchantress.sql`은 `seo_sync`, `seo_journal`, `seo_fields` 및 인덱스·제약만 새로 만든다. 기존 테이블 ALTER/DROP/데이터 갱신 없음. 전체 마이그레이션을 PGlite에서 검증했다. Neon dev/production 적용은 아직 하지 않았다.

1. Preview/로컬 연결 대상이 Neon dev인지 값 노출 없이 확인한다.
2. dev에 `npm run db:migrate`, `npm run db:status`를 실행하고 인증된 관리자에서 CRUD를 확인한다.
3. 운영 DB 적용은 사용자 승인 후 진행한다. 대상·백업을 확인하고 적용한 뒤 status를 확인한다.
4. 롤백은 크론을 끄고 이전 앱으로 되돌린다. 추가한 테이블은 남겨 자료를 보존한다. DROP이나 운영 데이터 삭제를 롤백 자동화에 넣지 않는다.

### Google

1. Search Console에서 연결 계정에 사이트 읽기 권한이 있는지 확인하고, Google Cloud 프로젝트에서 Search Console API를 활성화한다.
2. OAuth 동의 화면과 웹 애플리케이션 클라이언트를 준비한다. 범위는 `https://www.googleapis.com/auth/webmasters.readonly`만 요청한다.
3. 토큰 발급 예: [Google 공식 OAuth Playground](https://developers.google.com/oauthplayground/)에서 **자신의 OAuth 자격 증명 사용**, Google 엔드포인트, Offline, Consent Screen을 선택한다. OAuth 클라이언트의 승인 리디렉션 URI에 `https://developers.google.com/oauthplayground`를 등록한다. 위 읽기 범위를 승인한 뒤 코드를 토큰으로 교환한다. Playground 기본 클라이언트의 24시간 토큰을 운영에 쓰지 않는다. 자격 증명/토큰을 포함한 공유 링크도 만들지 않는다.
4. `SEO_GOOGLE_PROPERTY`에 Search Console의 정확한 URL-prefix(끝 슬래시 포함 여부도 원본대로) 또는 `sc-domain:` 속성을 입력한다. `SEO_GOOGLE_CLIENT_ID`, `SEO_GOOGLE_CLIENT_SECRET`, `SEO_GOOGLE_REFRESH_TOKEN`은 해당 배포 환경의 서버 시크릿에만 저장한다.
5. OAuth 앱의 게시 상태·검증·갱신 토큰 수명 정책을 계정에서 확인한다. 인증 오류 시 같은 최소 범위로 재동의·키 교체 후 재시도한다.

공식 근거: [Search Console 인증](https://developers.google.com/webmaster-tools/v1/how-tos/authorizing), [OAuth 웹 서버 흐름](https://developers.google.com/identity/protocols/oauth2/web-server). 이 앱은 로그인 콜백/토큰 발급 UI를 제공하지 않고 이미 발급한 갱신 토큰을 서버에서 사용한다.

### Bing / Naver

- Bing 사이트 소유 확인 후 Settings → API Access에서 키를 발급한다. `SEO_BING_SITE_URL`, `SEO_BING_API_KEY`를 서버 시크릿에 설정한다. 키는 사용자 범위여서 해당 계정의 다른 사이트에도 권한이 있을 수 있다. 전용 계정·최소 사이트 권한을 권장하며 앱 코드에는 조회 메서드만 있다. SOAP/POX는 사용하지 않는다.
- Naver는 [Search Advisor](https://searchadvisor.naver.com/)에서 직접 등록·조회한다. 어드민 점검 일지에 Naver, 조회 기간, 원본 링크와 확인한 수치만 입력한다. 일반 공개 성과 API 미확인, 로그인 스크래핑 없음.
- 모든 환경변수 이름/빈 예시는 `app/.env.example`에 있다. 브라우저 공개 변수(`NEXT_PUBLIC_`)로 만들지 않는다.

### 스케줄·배포 후 검증

사용자 배포 승인 후에만 진행한다. `app/vercel.json`에 `/api/cron/seo`, `0 4 * * *`(13:00 KST)를 추가했다. 기존 `CRON_SECRET`(16자 이상)을 서버에 설정한다. 기존 발행·정리 크론은 유지된다. 함수 최대 실행 300초를 지정했다. 실제 플랜 한도·크론 활성화·로그를 배포 환경에서 확인한다.

연동 설정 화면에서 변수의 존재를 확인하고 수동 동기화한다. 인증됨/최근 성공/데이터 기준일을 각각 확인한다. 빈 API 응답은 성과 0으로 채우지 않는다. 다음 날 자동 실행, 동일일 중복 요청, 인증 실패 후 기존 자료 보존을 dev에서 재검증한다. 운영에서는 가상 자료를 넣지 않는다.

## 검증 기록

최종 결과는 작업 종료 시 아래에 기록한다. 실제 API 자격 증명과 Neon 연결 정보는 로컬에 없어 실제 연결 성공을 주장하지 않는다.

- 타입/린트: 통과.
- 단위/통합: 65개 파일, 626개 시험 통과. PGlite 전체 마이그레이션, CRUD/상태/충돌, 잠금/중복/실패 보존, API 모의 응답·페이지네이션·오류, 인증 선행 검사 포함.
- 빌드: Windows 샌드박스 junction 생성 권한으로 첫 시도 실패. 같은 명령을 제한 밖에서 실행해 통과. 배포는 하지 않음.
- 전체 E2E 첫 실행: 389 통과 / 19 건너뜀 / 3 실패. 세 실패는 기존 CopyBlock 클립보드 테스트의 Windows CRLF와 LF 비교. trace에서 실제 `\r\n`을 확인했다. 앱 복사 기능은 변경하지 않고 테스트 비교에 CRLF→LF 정규화만 추가했다. 재실행 결과는 아래에 추가한다.
- 화면: 실제 SEO 컴포넌트+기존 스타일을 DB/인증 모의 상태로 격리 렌더한 8가지 화면 × 390/768/1440 = 24개 캡처, 가로 넘침 없음. 데스크톱 대시보드와 모바일 일지 캡처를 직접 열어 확인. 새 화면의 변경 전 동등 화면은 존재하지 않으며, 기존 운영 어드민의 인증된 전후 캡처는 미검증이다.
- 산출물: `app/artifacts/seo-ui/` (git 제외), `npm test`로 렌더 생성 후 `node scripts/seo-ui-check.mjs`로 재현. 이는 실제 로그인/네트워크/실 DB 저장 E2E의 대체 증거가 아니다.
- 미검증: 실제 Google/Bing API 연결·Neon dev/production 적용·로그인된 브라우저 CRUD·실 Vercel 크론·운영 배포.

## 보안 점검 (security-guidance 대체 직접 검토)

Codex에서는 저장소 AGENTS §9.4에 따라 직접 검토했다. 시크릿은 server-only 모듈과 서버 환경변수에만 있다. DB에는 토큰이 없고 UI에는 설정 존재 여부만 나온다. 외부 URL 요청은 고정 Google/Bing 호스트, redirect 거부, timeout; 사용자 일지 URL은 요청하지 않는다. SQL은 Drizzle 바인딩, UI는 React 이스케이프, javascript/userinfo/외부 대상 URL 거부. 모든 액션은 requireAdmin을 try 밖에서 먼저 수행하고 Next 서버 액션의 기본 출처 검사를 사용한다. 크론은 timingSafeEqual, 미설정/짧은 키 기본 거부. 오류 본문·요청 URL·토큰·입력 원문을 로그에 남기지 않는다. 파일 업로드·경로 접근·역직렬화 실행·외부 제출 기능은 추가하지 않았다.

## 변경 파일 묶음

- 화면: `app/src/app/admin/(console)/seo/`, `AdminNav.tsx`, `admin.module.css`.
- 모델·API·데이터: `app/src/seo/`, `app/src/data/seo/`, 기존 `data/admin/audit.ts`.
- DB: `app/src/db/schema.ts`, `app/drizzle/0009_*`, 마이그레이션 메타데이터.
- 크론/설정: `app/src/app/api/cron/seo/`, `app/vercel.json`, `app/.env.example`.
- 검증: 위 모듈의 테스트, `app/tests/e2e/seo-admin.spec.ts`, `pages.spec.ts`의 OS 줄바꿈 정규화, `app/scripts/seo-ui-check.mjs`.
- 명세: `docs/phase1/SEO-ADMIN.md`, PRD/CONCEPT/SCREEN-SPEC/ADMIN-DESIGN/CHANGELOG, README 및 이 인수인계.

## 최종 재검증

- 타입/린트 최종 통과, 단위·통합 626개 통과, 최종 production 빌드 통과.
- 실패했던 공개 페이지와 관리자/SEO E2E를 재실행: **205 통과 / 2 건너뜀 / 0 실패**. 첫 전체 실행의 나머지 테스트는 앞서 통과했으며 같은 검사를 불필요하게 반복하지 않았다.
- 최종 화면 24개 재캡처: 가로 넘침 0건. 인증된 실 서비스 화면 검증은 계속 미검증이다.
- Git 커밋·push·PR 생성·운영 배포·외부 제출은 하지 않았다. 로컬 기능 브랜치에 변경을 남겼다.
