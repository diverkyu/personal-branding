# 어드민 기술 설계

> 문서 버전 **0.22.0** (PRD·CONCEPT·SCREEN-SPEC 등과 같은 세트 버전, [CHANGELOG](CHANGELOG.md)) · 상태: 검토 중

[SCREEN-SPEC §7](SCREEN-SPEC.md)이 어드민 **화면·필드**를 정했다면, 이 문서는 그것을 **어떻게 만들지**를 정한다. 인증, 권한, 데이터 모델, 편집기, 이미지, 저장·충돌 처리, 구현 순서를 다룬다. 화면 필드와 제약은 SCREEN-SPEC을 따르고 여기서 반복하지 않는다.

## 1. 결정 요약

| 영역 | 결정 | 근거 |
| --- | --- | --- |
| 인증 | **Better Auth** (Drizzle 어댑터) + TOTP 2차 인증 | 2026-11-08 결정. Next.js 서버 컴포넌트 세션 검증, `disableSignUp`, `twoFactor` 플러그인, 세션 만료·속도 제한 옵션을 기본 제공 (Context7 문서 확인) |
| 리치 텍스트 | **Tiptap** (저장은 JSON) | 2026-11-08 결정. 허용 서식만 켜서 SECURITY §6 "허용 목록" 원칙을 지키기 쉽다 |
| 이미지 저장 | **Vercel Blob** | 2026-11-08 결정. 같은 플랫폼, 설정 단순. 소유자 이전·과금이 Vercel로 한곳에 모인다 |
| ORM·DB | Drizzle + Neon (기존) | 콘텐츠 테이블을 같은 DB에 추가 |
| 변경 방식 | Next.js 서버 액션 + 서버 검증 | 공개 폼과 같은 패턴 (`lib/forms`) |
| 권한 | 관리자 1역할 (Phase 1) | SECURITY §3 |
| 어드민 성격 | **콘텐츠 발행 관리 + 백오피스 복합** (메뉴 6그룹, §3) | 2026-11-08 결정. 스토리·AI 영상·여행 추천·자동 발행까지 확장 |
| 콘텐츠 모델 | **통합 `contents` 테이블 + 유형 정의**. 투어·장비·후기는 별도 테이블이되 발행 절차는 공통 | 2026-11-08 결정 (§5.0, §14) |
| 발행 절차 | 공통 5단계(임시저장·검토 필요·예약·발행·보관). **예약 발행은 필수** | 2026-11-08 결정. 기존 "후순위"에서 변경 |

**버전 고정**: 구현 시작 때 Better Auth·Tiptap·`@vercel/blob`의 현재 버전과 Next.js 16 호환을 다시 확인하고, DEVELOPMENT §의 의존성 유예 규칙(공개 후 일정 기간 경과)을 따른다.

## 2. 원칙

1. **서버가 모든 것을 다시 검사한다.** 미들웨어(프록시)의 로그인 확인은 편의일 뿐이다. 모든 어드민 페이지·서버 액션·데이터 조회 함수가 스스로 세션과 권한을 확인한다 (SECURITY §3).
2. **공개 조회와 어드민 조회는 다른 함수다.** 공개 함수는 `published` 등 공개 상태만 반환하며, 필터를 화면이 아닌 **데이터 함수 안에서** 건다.
3. **레이아웃을 바꾸는 기능은 만들지 않는다** (SCREEN-SPEC §2).
4. **실패해도 데이터는 안 잃는다.** 저장 실패는 화면에 표시하고 입력을 보존한다. 외부 서비스(Blob, 메일) 실패가 콘텐츠 저장을 막지 않는다.
5. **쉬운 한국어.** 개발 용어(slug, draft)는 화면에서 "주소 이름", "임시저장"으로 푼다.

## 3. 메뉴와 경로, 코드 구조

### 3.1 메뉴 (6그룹)

| 그룹 | 항목 (경로) | 성격 | 단계 |
| --- | --- | --- | --- |
| 홈 | 대시보드 (`/admin`) | 오늘 처리할 일: 신규 신청, 검토 필요, 예약, 실패 알림 | AD-2 |
| 콘텐츠 | 전체 콘텐츠 (`/admin/contents`), 스토리 (`/admin/contents?type=story`), 영상 (`type=video`), 여행 추천 (`type=travel`), 발행 일정 (`/admin/schedule`), 자동화 (`/admin/automation`), 휴지통 (`/admin/trash`) | 발행 | AD-5·6, 자동화는 후속 |
| 운영 | 투어 (`/admin/tours`), 신청·문의 (`/admin/inquiries`), 후기 (`/admin/reviews`), 장비 (`/admin/equipment`) | 백오피스 (개인정보·동의·모집) | AD-2·6 |
| 자산 | 미디어 (`/admin/media`), 태그·카테고리 (`/admin/taxonomy`) | 공용 자원 | AD-4·5 |
| 사이트 | 페이지 (`/admin/pages`), 사이트 설정 (`/admin/settings`), 동의·방침 (`/admin/legal`) | 사이트 제어 (문구·연락처만, 레이아웃 변경 없음) | AD-3·6 |
| 시스템 | 사용자·보안 (`/admin/users`), 활동 기록 (`/admin/audit`), 알림·연동 (`/admin/integrations`), 백업·내보내기 (`/admin/backup`) | 관리자 기능 | AD-1·2, 나머지 후속 |

- 콘텐츠 유형을 늘릴 때 **콘텐츠 그룹에 항목 하나**만 추가하면 된다 (유형 정의, §14.1). 목록·발행 절차·휴지통은 모든 유형이 공유한다.
- 시안: 2026-11-08 대화에서 확정한 메뉴 구조 (세션 시안, 필요 시 `mockup/`에 정식 시안으로 추가).
- 단계에 없는 메뉴(후속)는 **화면을 만들 때까지 메뉴에 노출하지 않는다.** 빈 화면을 배포하지 않는다.

### 3.2 코드 구조

```
app/src/app/admin/
  login/                 # 비로그인 허용 (유일한 예외)
  login/two-factor/      # 비밀번호 통과 후 TOTP 입력
  setup-2fa/             # 첫 로그인 시 TOTP 등록 (2차 인증 미등록 계정은 여기서 막힘)
  (console)/             # 로그인 필수 영역. layout에서 세션 확인
    page.tsx             # 대시보드
    contents/ schedule/ automation/ trash/
    tours/ inquiries/ reviews/ equipment/
    media/ taxonomy/ pages/ settings/ legal/
    users/ audit/ integrations/ backup/
app/src/app/api/auth/[...all]/route.ts   # Better Auth 핸들러
app/src/app/api/ingest/route.ts          # 자동화 입력 (토큰 인증, 항상 초안으로만 저장, 후속)
app/src/lib/auth/        # auth 인스턴스, requireAdmin(), 세션 헬퍼
app/src/content/types/   # 콘텐츠 유형 정의 (story, video, travel ...)
app/src/content/publish/ # 발행 상태 전이, 예약, 발행 작업
app/src/admin/           # 어드민 전용 컴포넌트·서버 액션·검증 스키마
app/src/data/admin/      # 어드민 조회·변경 함수 (모두 requireAdmin 선행)
app/src/data/public/     # 공개 조회 함수 (공개 상태만)
```

- 어드민 경로 응답은 `Cache-Control: no-store`, `noindex` (SECURITY §12). 어드민 스타일은 공개 사이트와 분리한 CSS 모듈로 둔다.
- `data/admin/*`의 모든 함수는 첫 줄에서 `requireAdmin()`을 호출한다. 호출이 빠지면 시험에서 잡히도록 함수 목록 대비 시험을 둔다 (§12).

## 4. 인증과 세션

### 4.1 구성

- `betterAuth({ database: drizzleAdapter(db, { provider: "pg" }), emailAndPassword: { enabled: true, disableSignUp: true }, plugins: [twoFactor()] })`
- **가입 차단**: 공개 가입은 없다. `disableSignUp: true`로 막고, 계정은 서버에서 한 번 실행하는 스크립트로만 만든다 (§4.2).
- **세션**: 최대 8시간 (`expiresIn: 28800`), 쿠키 `HttpOnly`·`Secure`·`SameSite=Lax`. 로그아웃·비밀번호 변경 시 세션을 서버에서 폐기한다. 쿠키 캐시는 쓰지 않는다 (폐기가 즉시 반영돼야 함).
- **속도 제한**: 로그인·2차 인증 경로에 엄격한 한도(예: 5회/10분)를 둔다. 저장소는 DB 기반이어야 서버리스 인스턴스 간에 공유된다 (메모리 저장은 인스턴스마다 따로 센다 — 공개 폼의 `rateLimit.ts`와 같은 한계, 어드민에서는 DB 저장으로 보완).
- **로그**: 로그인 성공·실패·잠금, 2차 인증 실패, 권한 거부, 세션 폐기를 구조화 로그로 남긴다. 이메일은 로그에 마스킹한다 (기존 logger 규칙).

### 4.2 첫 관리자 계정 만들기 (가입 없이)

1. 작업자가 `npm run admin:create` 스크립트를 로컬에서 실행한다. 이메일과 임시 비밀번호는 **터미널 입력(`read -s`)** 으로 받고 화면·로그에 출력하지 않는다.
2. 스크립트는 `DATABASE_URL`이 가리키는 DB(dev 또는 production 브랜치)에 사용자를 만든다. production 계정은 **규강이 직접** 실행하거나, 작업자가 화상 통화에서 규강 본인의 비밀번호 입력을 받지 않는 방식(임시 비밀번호 → 첫 로그인 때 변경 강제)으로 한다.
3. 첫 로그인 시 **비밀번호 변경 + TOTP 등록이 끝나기 전에는 어드민 어느 화면도 열리지 않는다** (`setup-2fa`로 강제 이동).
4. TOTP 등록 시 **복구 코드**를 발급한다. 규강이 안전한 곳에 보관하게 안내한다 (화면 문구 필요).

> 계정 생성·비밀번호·TOTP 비밀은 작업자가 대신 입력하거나 보관하지 않는다 (프로젝트 보안 규칙).

### 4.3 비밀번호 재설정·잠금 복구 (Phase 1)

- Resend 메일은 아직 없다. Phase 1은 **운영자 수동 재설정**(`npm run admin:reset-password`, 가입 스크립트와 같은 방식)으로 한다. 메일 도입 후 링크 방식으로 바꿀지는 SECURITY §16 열린 결정.
- TOTP 기기 분실: 복구 코드로 로그인 → 새 기기 등록. 복구 코드도 잃으면 운영자가 스크립트로 2차 인증을 초기화한다 (본인 확인은 규강-작업자 간 별도 채널, 로그 남김).

### 4.4 경로 보호의 3겹

1. `proxy`(미들웨어): `/admin/*`(login 제외)에 세션 쿠키가 없으면 로그인으로 이동 — 빠른 차단용.
2. `(console)/layout.tsx`: 서버에서 세션 + 2차 인증 완료 여부 확인.
3. `data/admin/*`와 서버 액션: 호출마다 `requireAdmin()`. **IDOR 방지**: ID로 조회할 때도 관리자 권한을 확인하고, 존재하지 않으면 404.

## 5. 데이터 모델

기존 `inquiries` 테이블은 유지한다. Better Auth가 `user`·`session`·`account`·`verification`·`twoFactor` 테이블을 만든다 (Drizzle 스키마를 `db/schema.ts`에 병합, 마이그레이션은 `drizzle-kit`).

### 5.1 공통 컬럼 (콘텐츠 테이블)

| 컬럼 | 용도 |
| --- | --- |
| `id` | uuid (내부 식별자) |
| `slug` | 고유 주소 이름 (스토리·투어·장비). 예약어 거부 |
| `status` | 공개 상태 (테이블별 허용 값 check 제약) |
| `version` | 정수. 저장마다 +1. **낙관적 잠금**에 사용 (§7) |
| `created_at` / `updated_at` | 시각 |
| `deleted_at` | 휴지통. NULL이 아니면 삭제됨. 30일 뒤 영구 삭제 (§8) |
| `updated_by` | 마지막 수정한 관리자 id (감사) |

### 5.0 통합 콘텐츠 모델 (`contents`)

발행형 콘텐츠(스토리, AI 영상, 여행 추천, 이후 유형)는 **한 테이블**에 둔다.

| 컬럼 | 설명 |
| --- | --- |
| `type` | 유형 키 (`story`, `video`, `travel` …). 코드의 유형 정의에 등록된 값만 허용 |
| 공통 | title, slug(유형 안에서 고유), summary, cover_media_id, cover_alt, body(JSON), tags(text[]), answers(text[]), seo_title, seo_description |
| `fields` | JSON. **유형별 항목** (여행 추천: region, season, level, budget, place, checked_on / 영상: video_url, duration, has_captions). 유형 정의의 스키마로 서버가 검증 |
| `status` | `draft` / `review` / `scheduled` / `published` / `archived` (§14.2) |
| `publish_at` | 예약 시각 (`scheduled`일 때 필수) |
| `published_at` | 실제 공개 시각 (서버 기록) |
| `origin` | `manual` / `ai_assisted` / `automated` (제작 방식, 공개 표기·검토 기준에 사용) |
| `origin_note` | 비공개 메모 (사용 도구·프롬프트 등) |

- 유형별 항목을 JSON으로 두는 이유: 유형이 늘어도 테이블·마이그레이션을 늘리지 않는다. 대신 **유형 정의(`content/types/*`)가 스키마의 단일 출처**이고, 읽기·쓰기 모두 이 정의로 검증한다. 검색·정렬에 쓰는 항목(예: 지역)이 생기면 그때 컬럼으로 승격한다.
- **별도 테이블로 두는 것**: `tours`(신청 폼·모집 상태와 결합), `equipment`, `reviews`(동의 확인·수정 이력), `about`, `site_settings`. 단 이들도 `status` 의미와 예약·휴지통·이력은 같은 발행 모듈을 쓴다 (§14).
- 공개 조회 함수는 `type`별로 `status='published' AND deleted_at IS NULL AND publish_at<=now()`만 반환한다.

### 5.2 테이블

| 테이블 | 핵심 컬럼 (SCREEN-SPEC §7.5 필드 기준) | 비고 |
| --- | --- | --- |
| `contents` | (§5.0 통합 모델 참조) | 스토리·영상·여행 추천 등 발행형 콘텐츠 전부 |
| `tours` | name, slug, starts_on, ends_on, place, recruit_status(`upcoming`/`recruiting`/`closed`), capacity, cover_media_id, cover_alt, video_url, body(JSON), fee_note, status(`draft`/`review`/`scheduled`/`published`/`archived`), publish_at | `종료`는 저장하지 않고 날짜로 계산 (결정 2) |
| `tour_gallery` | tour_id, media_id, caption, position | 0~30 |
| `tour_videos` | tour_id, url, position | 0~5, 허용 도메인(`lib/video.ts`) |
| `equipment` | name, slug, category_id, brand, reason_short, reason_body(JSON), features(text[]), thumb_media_id, thumb_alt, price_note, checked_on, action_type, buy_url, button_label, is_affiliate, status(`public`/`private`), sort_order | |
| `equipment_images` | equipment_id, media_id, alt, position | 0~6 |
| `equipment_categories` | name, sort_order | 어드민에서 추가·이름 변경 |
| `reviews` | body, author_label, label_kind(`real`/`initial`/`nick`), written_on, source_kind, source_note, tour_id, is_featured, featured_order, consent_confirmed, consent_note, status | `consent_confirmed=false`이면 `public` 불가 (DB check). **평점 컬럼 없음** |
| `review_revisions` | review_id, snapshot(JSON), changed_by, changed_at | 후기 수정 이력 (SCREEN-SPEC) |
| `about` | headline, body(JSON), signature, photo_media_id, photo_alt, status | 행 1개 |
| `site_settings` | key, value(JSON), version, updated_by | 키-값. 키 목록과 기본값은 코드(스키마)에 정의, 비었거나 틀리면 기본값 사용 (SCREEN-SPEC §7.6) |
| `consent_versions` | kind(`reservation`/`notice`/`privacy`), version, text, effective_from | 동의 문구를 바꾸면 새 버전 기록 (`CONSENT_VERSION`을 DB로 이전) |
| `media` | id, blob_url, pathname, mime, bytes, width, height, alt, uploaded_by, created_at, deleted_at | 사용처 수는 조회로 계산 |
| `publish_jobs` | id, target_type, target_id, run_at, state(`pending`/`running`/`done`/`failed`), attempts, last_error_kind, channel(`site`) | 예약 발행·자동 생성 작업 기록 (§14.3). 오류 메시지 원문은 저장하지 않음 |
| `ingest_tokens` | id, label, hash, allowed_types(text[]), created_by, created_at, revoked_at | 자동화 입력용. 토큰 원문은 발급 때 한 번만 표시, DB에는 해시만 (후속) |
| `audit_log` | at, actor_id, action, target_type, target_id, meta(JSON, 개인정보 제외) | 열람·내보내기·삭제·발행 등 (SECURITY §14) |
| `inquiries` (기존) | + `status`, `memo`, `handled_at` 컬럼 추가 | 원본 필드는 읽기 전용 |

- 본문(`body`)은 Tiptap JSON. **저장 시 서버가 허용 목록으로 다시 걸러서** 저장한다 (§6).
- 목록 조회는 페이지 크기 상한(20, 최대 100)을 둔다.

### 5.3 공개 화면 전환

지금 공개 화면은 `data/` 안의 고정 데이터(fixtures)를 읽는다. 어드민 단계에서 **같은 함수 시그니처를 유지한 채** 구현을 DB로 바꾼다 (`data/public/*`). 공개 함수는 `status`가 공개이고 `deleted_at IS NULL`인 행만 돌려준다. 미리보기는 별도의 어드민 경로에서 관리자 세션이 있을 때만 상태를 무시하고 보여준다 (INT-12, 비공개 URL 직접 접근은 404).

## 6. 리치 텍스트 (Tiptap)

- **허용 서식**: 문단, 제목(h2·h3), 굵게, 기울임, 링크(`https`만), 순서/비순서 목록, 인용, 구분선, 이미지(미디어 라이브러리 항목만), 영상 임베드(허용 도메인만). 그 외 노드·마크는 스키마에서 제외한다.
- **저장**: JSON. 서버 액션에서 같은 스키마로 검증하고, 허용되지 않은 노드·속성은 거부(또는 제거)한다. 클라이언트 편집기의 제한은 보안 경계가 아니다.
- **렌더링**: 공개 화면은 JSON을 **React 요소로 직접 렌더링**한다 (HTML 문자열을 `dangerouslySetInnerHTML`로 넣지 않는다). 링크에는 `rel="noopener noreferrer"`, 외부 링크 표시. 이미지는 `next/image`, 영상은 기존 `VideoPlayer` 허용 목록 경로.
- **한국어 입력(IME)**: 조합 중 입력이 끊기지 않는지 실제 입력으로 시험한다 (E2E 한계 → 수동 시험 항목, USER-TEST에 추가).
- 편집기 UI는 클라이언트 컴포넌트로 격리해 공개 사이트 번들에 들어가지 않게 한다.

## 7. 저장·충돌·임시저장

- **수동 저장**: 서버 액션 `save(id, version, data)`. `UPDATE ... WHERE id=? AND version=?`가 0행이면 **충돌**로 처리해 덮어쓰지 않고 "다른 곳에서 수정됨"을 알린다. 성공하면 `version+1`을 돌려준다.
- **자동 임시저장 (스토리)**: 입력 후 약 5초 쉬면 `draft` 상태로 저장. 이미 `published`인 글을 편집 중일 때는 **자동 저장이 공개 내용을 바꾸지 않도록** 별도 초안 영역(`draft_body` 등)에 저장하고, "발행"을 눌러야 반영한다. (구현 시 `stories`에 초안 필드를 둘지 별도 테이블로 할지 확정 — 열린 질문 §13.1)
- **상태 표시**: "저장됨 / 저장 중 / 저장 실패 / 충돌". 저장 중 들어온 입력은 다음 저장에 합친다 (직렬화 큐).
- **이탈 방지**: 변경이 있으면 `beforeunload`와 내부 이동 확인.
- **검증 오류**: 필드별 메시지를 서버가 돌려주고 필드 옆에 표시. 스키마는 `types/`의 단일 정의를 서버·폼이 공유한다 (DEVELOPMENT §).

## 8. 삭제와 휴지통

- 콘텐츠(스토리·투어·장비·후기·미디어)는 **소프트 삭제**: `deleted_at` 기록. 목록에서 사라지고 공개에서도 사라진다. 휴지통 화면에서 복원 가능.
- **30일 뒤 영구 삭제**: 매일 한 번 실행되는 정리 작업(Vercel Cron). 요청은 비밀 헤더로 보호하고, 실행 결과를 로그에 남긴다. 미디어는 DB 행 삭제 후 Blob 객체도 삭제한다 (Blob 삭제 실패 시 재시도 대상 표시).
- **신청·문의 개인정보**는 휴지통 없이 **즉시 영구 삭제(파기)** 가능. 삭제 전 대상과 "되돌릴 수 없음"을 확인하고 `audit_log`에 기록(개인정보는 남기지 않음).
- 사용 중인 미디어를 삭제하려 하면 사용처를 보여 주고 경고한다.

## 9. 미디어 (Vercel Blob)

- **업로드 경로**: 어드민 클라이언트가 서버 액션/라우트에서 **업로드 토큰을 받아 Blob에 직접 올린다** (서버리스 요청 본문 크기 제한 회피). 토큰 발급은 `requireAdmin()` 이후에만, 허용 MIME·최대 크기를 토큰에 지정한다. *(Vercel Blob 클라이언트 업로드의 현재 한도·방식은 구현 시 문서로 재확인)*
- **허용**: JPEG·PNG·WebP·AVIF, 크기 상한은 SECURITY §7의 값. SVG 업로드는 허용하지 않는다 (스크립트 포함 가능).
- **서버 후처리**: 업로드 완료 콜백에서 **실제 파일 형식 확인(확장자·헤더 신뢰 금지), 위치정보(EXIF) 제거, 긴 변 기준 리사이즈, WebP 변환**을 거친 뒤 `media`에 등록한다. 후처리가 끝나기 전에는 공개 화면에서 쓸 수 없다. *(처리 도구는 `sharp` 후보 — 라이선스·Vercel 런타임 호환은 구현 시 확인)*
- **공개 접근**: 공개 이미지는 Blob 공개 URL을 `next/image`로 제공한다. 파일명은 서버가 만든 임의 이름으로 저장해 원본 파일명 노출을 막는다.
- **alt 텍스트**: 대표 이미지는 alt가 없으면 공개 불가 (콘텐츠 `status` 전환 시 서버 검증).
- **유료 한도**: Hobby의 Blob 무료 한도를 넘지 않도록 업로드 크기를 제한한다. 한도·요금은 Pro 전환 시 확인 (INFRASTRUCTURE §6).

## 10. 대시보드와 알림 데이터

DASH-01~06은 모두 단순 집계/최근 목록 쿼리다 (인덱스: `inquiries(status, created_at)`, `stories(status, updated_at)`, `tours(recruit_status, starts_on)`). 메일 발송 실패(DASH-04)는 Resend 단계에서 `inquiries.notify_status`를 추가해 표시한다 — 이번 범위에서는 자리만 둔다.

## 11. 구현 단계 (제안, 각 단계 = PR 하나, main 기준)

| 단계 | 내용 | 완료 기준 |
| --- | --- | --- |
| AD-1 | **구현 완료(0.22.0, §15)** Better Auth 연결, 스키마·마이그레이션, 계정 생성/재설정 스크립트, `/admin/login`, 2차 인증, 보호 레이아웃(메뉴 셸 포함), 속도 제한, 로그, 사용자·보안 화면 | SEC-01·11 통과, SEC-13 부분. 가입 경로가 막혀 있음 |
| AD-2 | 어드민 셸(반응형 메뉴), 대시보드(신청 집계), **신청·문의 관리**, **활동 기록** | 공개 폼 접수분을 어드민에서 처리 가능, 열람·파기 기록 |
| AD-3 | 사이트 설정, 동의·방침(`consent_versions`) | 설정 변경이 공개 화면에 반영 |
| AD-4 | 미디어 라이브러리 (Blob 업로드·후처리·alt·삭제 경고) | 업로드→사용→삭제 경고 흐름 |
| AD-5 | **통합 콘텐츠 기반**: `contents` + 유형 정의 + 발행 상태 전이 + **예약 발행(`publish_jobs`)** + 발행 일정 화면 + 전체 콘텐츠 목록 + **스토리 유형**(Tiptap, 미리보기, 충돌 처리) + 공개 화면 DB 전환 | 규강이 코드 없이 글을 예약·발행 |
| AD-6 | 영상·여행 추천 유형, 투어·후기·장비·페이지 편집(발행 절차 공통 적용), 휴지통·정리 작업, 태그·카테고리 | PRD 어드민 요구사항 충족 |
| 후속 | **자동화**(`/api/ingest`, 토큰, 검토 큐, 자동 생성 규칙), 알림·연동(Resend), 백업·내보내기, 뉴스레터·SNS 발행 위치 | 자동 입력은 항상 초안·검토 필요로만 저장 |

각 단계는 vitest(단위·PGlite 통합)와 Playwright E2E를 갖춘다. 순서를 AD-1부터 지키는 이유: 인증이 없으면 이후 모든 화면이 열려 있게 된다 — **인증 없는 어드민 화면을 배포하지 않는다** (배포가 이미 공개 상태이므로 AD-1 전까지 `/admin` 하위에 화면을 추가하지 않는다).

## 12. 시험 계획 (SECURITY §15 연결)

| 시험 | 내용 | 단계 |
| --- | --- | --- |
| SEC-01 | 비로그인으로 어드민 경로·서버 액션 호출 | AD-1 |
| SEC-11 | 로그아웃·폐기된 세션 쿠키로 요청 | AD-1 |
| SEC-13 | 다른 출처에서 어드민 변경 요청 (CSRF) | AD-1 |
| 가입 차단 | 가입 엔드포인트 호출 시 거부 | AD-1 |
| 2차 인증 강제 | TOTP 미등록 계정은 어떤 화면도 못 연다 | AD-1 |
| 호출 누락 점검 | `data/admin/*` 내보낸 함수 모두 `requireAdmin` 없이는 실패 | AD-1부터 유지 |
| 공개 누출 | 임시저장·비공개·휴지통 항목이 공개 함수·sitemap·JSON-LD에 안 나옴, 직접 URL은 404 | AD-5 |
| 충돌 | 두 탭에서 같은 글 저장 시 두 번째가 거부됨 | AD-5 |
| 본문 위생 | 허용 외 노드/스크립트가 든 JSON 저장 거부, 렌더링에 HTML 주입 불가 | AD-5 |
| 업로드 | 허용 외 형식·초과 크기·가짜 확장자 거부, EXIF 제거 확인 | AD-4 |
| IME | 한국어 조합 입력 편집기 동작 (수동) | AD-5 |
| 모바일 | 목록 확인·신청 상태 변경 (390px) | AD-2 |
| 상태 전이 | 허용되지 않은 전이(예: 보관→예약 없이 발행) 거부, `scheduled`는 `publish_at` 필수 | AD-5 |
| 예약 발행 | 예약 시각 도달 시 공개, 이전에는 공개 함수·sitemap·JSON-LD에 안 나옴, 실패 시 재시도 후 기록 | AD-5 |
| 중복 실행 | 같은 작업이 두 번 실행돼도 한 번만 발행 (멱등) | AD-5 |
| 유형 검증 | 유형 정의에 없는 `type`·`fields` 거부, 유형별 필수 항목 검증 | AD-5 |
| 자동 입력(후속) | 토큰 없이/폐기된 토큰/허용 외 유형 거부, 항상 `draft`·`review`로만 저장, 직접 `published` 지정 불가 | 후속 |

## 13. 열린 질문

1. 발행된 글을 고칠 때 초안을 어디에 둘지 (`stories.draft_*` 컬럼 vs 별도 `story_drafts`) — AD-5 착수 때 확정
2. TOTP 복구 코드 안내 화면 문구와 보관 방법 (규강 확인)
3. 어드민 접속 허용 범위를 IP/지역으로 좁힐지 (Vercel 플랜 기능 의존, 보류)
4. 투어 신청 CSV 내보내기에 포함할 열과 보관 방법 (개인정보 — 법률 확인과 함께)
5. 이전에 정한 SECURITY §16의 "비밀번호 재설정(메일 vs 수동)"은 Phase 1 수동으로 시작하고 Resend 이후 재결정
6. 자동 생성 AI 콘텐츠의 공개 표기 문구와 위치 (`origin=ai_assisted/automated`에 따라 표시할지)
7. 뉴스레터·SNS 발행 위치를 도입할 시점과 서비스 (후속)

## 14. 콘텐츠 발행 관리

### 14.1 유형 정의

`content/types/<type>.ts` 하나가 한 유형의 모든 것을 정한다: 키, 메뉴 이름, 공통 필드 중 쓰는 것, `fields` 스키마(검증), 발행 전 점검 항목, 공개 화면 라우트와 구조화 데이터 종류. 새 유형 = 정의 파일 추가 + 공개 라우트 연결.

| 유형 | 키 | 공개 경로(안) | `fields` 예 |
| --- | --- | --- | --- |
| 스토리 | `story` | `/story/[slug]` | (공통만) |
| 영상 | `video` | `/videos/[slug]` (경로는 AD-6에서 확정) | video_url, duration, has_captions |
| 여행 추천 | `travel` | `/travel/[slug]` (경로는 AD-6에서 확정) | region, season, level, budget, place, checked_on |

### 14.2 발행 상태와 전이

`draft`(임시저장) → `review`(검토 필요) → `scheduled`(예약) → `published`(발행) → `archived`(보관). 

| 전이 | 허용 | 비고 |
| --- | --- | --- |
| draft → review / scheduled / published | 예 | 발행 전 점검 통과 필요 (대표 이미지 alt, 요약 길이, 출처·AI 표기 확인) |
| review → draft / scheduled / published | 예 | 자동 생성 글은 반드시 여기를 거친다 |
| scheduled → draft / published | 예 | 예약 취소 = draft, 즉시 발행 가능 |
| published → draft / archived | 예 | 공개에서 내림. 주소는 404 |
| archived → draft | 예 | |
| 그 외 | 거부 | 서버가 전이 규칙으로 검증, 이력 기록 |

- 모든 전이는 `audit_log`에 남긴다(누가, 언제, 어디서 어디로).
- `published`인 글을 편집할 때는 초안 영역에 저장하고 발행으로 반영한다 (§7, 열린 질문 §13.1).

### 14.3 예약 발행

- 예약된 항목은 `publish_jobs`에 작업으로 기록한다. 주기 실행(Vercel Cron, 5분 간격 시작 — 플랜별 최소 간격과 한도는 구현 시 확인)이 `run_at <= now()`인 작업을 가져와 발행한다.
- **멱등**: 작업 선점(`pending→running`)을 조건부 UPDATE로 하고, 이미 `published`면 건너뛴다. 같은 작업이 두 번 와도 한 번만 발행.
- **실패**: 최대 3회 재시도 후 `failed`. 대시보드 알림(DASH-04)에 표시, 오류 종류만 기록(원문 메시지·개인정보 제외).
- 실행 요청은 비밀 헤더로 보호하고 어드민 세션과 무관하게 동작한다. 시각은 서버 기준 UTC 저장, 화면은 한국 시간(KST) 표시.
- 발행 시 공개 화면 캐시를 갱신한다(태그 기반 재검증). sitemap·JSON-LD가 새 글을 포함하는지 시험.

### 14.4 제작 방식과 자동화 원칙

- `origin`으로 직접 / AI 도움 / 자동을 구분하고 목록에서 거를 수 있게 한다. 공개 화면 표기 여부는 열린 질문(§13.6).
- **자동 입력은 사람 승인 없이 공개하지 않는다.** `/api/ingest`는 토큰 인증이며 항상 `draft` 또는 `review`로만 저장한다. 토큰은 허용 유형을 제한하고 해시만 저장하며 폐기할 수 있다. "승인 없이 자동 공개" 규칙은 기본 꺼짐이고, 켜려면 별도 설계·확인을 거친다.
- 자동 생성 글은 사실 정보(가격, 일정, 위치)에 **출처·확인일**이 없으면 발행 전 점검에서 막는다 (CONCEPT §7.5 "가상 예시 금지" 원칙).

## 15. AD-1 구현 기록 (0.22.0)

설계와 달라진 점·구현 결정:

- **버전**: `better-auth` 1.7.15 정확히 고정(1.7.0이 2026-08-18 출시로 DEVELOPMENT §10 유예를 지남, MIT). 새 의존성: `qrcode` 1.5.4(MIT, 등록 QR 생성), 실행 도구 `tsx`(MIT, 이미 `drizzle-kit`의 하위 의존성). 모두 [THIRD-PARTY-NOTICES](../../app/THIRD-PARTY-NOTICES.md)에 기록.
- **스키마**: Better Auth 요구 테이블을 `auth_` 접두어로 직접 작성(`db/auth-schema.ts`, 마이그레이션 `0001_admin_auth`). 공식 CLI(`npx auth@latest generate`)는 외부 코드를 내려받아 실행해야 해서 쓰지 않았고, 설치된 버전의 테이블 정의와 대조한 뒤 **실제 흐름 시험(PGlite)** 으로 검증했다. Neon HTTP 드라이버는 대화형 트랜잭션이 없어 어댑터의 transaction 옵션을 켜지 않았다.
- **설정되지 않음 상태**: `DATABASE_URL` 또는 `BETTER_AUTH_SECRET`(32자 이상)이 없으면 어드민은 닫힌 채 "설정되지 않음" 안내만 보이고 `/api/auth/*`는 404다. 빌드는 깨지지 않는다. 배포된 사이트가 이미 공개 상태이므로 의도한 안전 기본값이다.
- **프록시**: Next.js 16의 `proxy.ts`(구 middleware). 세션 쿠키가 없으면 로그인으로 보내고, `/admin` 응답에 `Cache-Control: no-store`, `X-Robots-Tag: noindex`를 건다. 진짜 검사는 서버의 `requireAdmin()`이 매번 한다(가짜 쿠키 시험으로 확인).
- **공개 틀 분리**: 루트 레이아웃의 머리글·꼬리말은 `SiteFrame`(클라이언트)이 `/admin` 경로에서 감춘다. 어드민은 자체 틀(`(console)/layout.tsx`)을 쓴다.
- **2차 인증 강제**: Better Auth는 2차 인증이 없는 계정도 비밀번호만으로 세션을 준다. 그래서 `evaluateAdminAccess()`가 `twoFactorEnabled`를 확인해 **등록 전에는 `/admin/setup-2fa`만 열리게** 한다.
- **세션**: 8시간 고정(`disableSessionRefresh`), 쿠키 `HttpOnly`·`SameSite=Lax`(https에서 `Secure`). TOTP 확인에서 `trustDevice:false`라 기기 신뢰(30일 건너뛰기)를 쓰지 않는다.
- **속도 제한**: DB 저장, 로그인·2차 인증·등록·비밀번호 변경 경로 10분 5회(접속 주소별). 공개 폼 제한과 별개.
- **복구 코드**: 발급 형식(하이픈 포함) 그대로 비교한다(하이픈을 지우면 맞는 코드도 거부되던 오류를 개발 DB 확인 중 발견·수정, 회귀 시험 추가). 한 번 쓰면 사라진다.
- **계정 스크립트**: `npm run admin:create | admin:reset-password | admin:reset-2fa`. 대상 DB 호스트를 보여 주고 `yes`를 받으며, 비밀번호는 터미널에서 가려서 입력받는다(파이프 불가, 인자·환경변수 불가).
- **미구현(후속)**: 비밀번호 재설정 메일, 활성 세션 목록·강제 로그아웃, 관리자 추가·정지 화면, 이메일 변경. 계정은 지금 스크립트로만 만든다.

### 15.1 첫 관리자 계정 만들기 (규강이 직접)

1. 배포 환경(Vercel)과 로컬 `.env.local`에 `BETTER_AUTH_SECRET` 설정 ([INFRASTRUCTURE §10.1](INFRASTRUCTURE.md)).
2. 대상 DB에 마이그레이션 적용: `npm run db:migrate` (dev 브랜치 먼저).
3. 터미널에서 `npm run admin:create` → 이메일·이름·비밀번호(12자 이상)를 **본인이 직접** 입력.
4. 사이트 `/admin/login`에서 로그인 → 2차 인증 등록(QR 스캔, 복구 코드 보관) → 완료.
