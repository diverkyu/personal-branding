# 어드민 기술 설계

> 문서 버전 **0.20.0** (PRD·CONCEPT·SCREEN-SPEC 등과 같은 세트 버전, [CHANGELOG](CHANGELOG.md)) · 상태: 검토 중

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

**버전 고정**: 구현 시작 때 Better Auth·Tiptap·`@vercel/blob`의 현재 버전과 Next.js 16 호환을 다시 확인하고, DEVELOPMENT §의 의존성 유예 규칙(공개 후 일정 기간 경과)을 따른다.

## 2. 원칙

1. **서버가 모든 것을 다시 검사한다.** 미들웨어(프록시)의 로그인 확인은 편의일 뿐이다. 모든 어드민 페이지·서버 액션·데이터 조회 함수가 스스로 세션과 권한을 확인한다 (SECURITY §3).
2. **공개 조회와 어드민 조회는 다른 함수다.** 공개 함수는 `published` 등 공개 상태만 반환하며, 필터를 화면이 아닌 **데이터 함수 안에서** 건다.
3. **레이아웃을 바꾸는 기능은 만들지 않는다** (SCREEN-SPEC §2).
4. **실패해도 데이터는 안 잃는다.** 저장 실패는 화면에 표시하고 입력을 보존한다. 외부 서비스(Blob, 메일) 실패가 콘텐츠 저장을 막지 않는다.
5. **쉬운 한국어.** 개발 용어(slug, draft)는 화면에서 "주소 이름", "임시저장"으로 푼다.

## 3. 경로와 코드 구조

```
app/src/app/admin/
  login/                 # 비로그인 허용 (유일한 예외)
  login/two-factor/      # 비밀번호 통과 후 TOTP 입력
  setup-2fa/             # 첫 로그인 시 TOTP 등록 (2차 인증 미등록 계정은 여기서 막힘)
  (console)/             # 로그인 필수 영역. layout에서 세션 확인
    page.tsx             # 대시보드
    stories/ tours/ inquiries/ equipment/ reviews/ media/ about/ settings/
app/src/app/api/auth/[...all]/route.ts   # Better Auth 핸들러
app/src/lib/auth/        # auth 인스턴스, requireAdmin(), 세션 헬퍼
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

### 5.2 테이블

| 테이블 | 핵심 컬럼 (SCREEN-SPEC §7.5 필드 기준) | 비고 |
| --- | --- | --- |
| `stories` | title, slug, summary, cover_media_id, cover_alt, body(JSON), tags(text[]), answers(text[]), status(`draft`/`published`), published_at, seo_title, seo_description | `published_at`은 발행 시 서버가 기록. 예약 발행은 후순위 (§12 결정 7) |
| `tours` | name, slug, starts_on, ends_on, place, recruit_status(`upcoming`/`recruiting`/`closed`), capacity, cover_media_id, cover_alt, video_url, body(JSON), fee_note, status(`draft`/`published`) | `종료`는 저장하지 않고 날짜로 계산 (결정 2) |
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
| AD-1 | Better Auth 연결, 스키마·마이그레이션, 계정 생성/재설정 스크립트, `/admin/login`, 2차 인증 등록·로그인, 보호 레이아웃, 속도 제한, 로그 | SEC-01·11·13 시험 통과(로컬·dev DB). 가입 경로가 막혀 있음 |
| AD-2 | 어드민 셸(메뉴, 반응형), 대시보드(신청 집계), **신청·문의 관리**(목록·상세·상태·메모·파기·CSV) | 기존 공개 폼 접수분을 어드민에서 처리 가능 |
| AD-3 | 사이트 설정 + `consent_versions` (기본값 폴백, 브랜드 문구 확인 대화상자) | 설정 변경이 공개 화면에 반영 |
| AD-4 | 미디어 라이브러리 (Blob 업로드·후처리·alt·삭제 경고) | 업로드→사용→삭제 경고 흐름 |
| AD-5 | 스토리 (Tiptap, 임시저장·발행·미리보기·충돌 처리) + 공개 화면 DB 전환 | 규강이 코드 없이 글 발행 |
| AD-6 | 투어·장비·후기·About + 휴지통·정리 작업 | PRD 어드민 요구사항(A-1~A-7) 충족 |
| (별도) | Resend 알림 메일, 예약 발행, 비밀번호 재설정 메일화 | |

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

## 13. 열린 질문

1. 발행된 글을 고칠 때 초안을 어디에 둘지 (`stories.draft_*` 컬럼 vs 별도 `story_drafts`) — AD-5 착수 때 확정
2. TOTP 복구 코드 안내 화면 문구와 보관 방법 (규강 확인)
3. 어드민 접속 허용 범위를 IP/지역으로 좁힐지 (Vercel 플랜 기능 의존, 보류)
4. 투어 신청 CSV 내보내기에 포함할 열과 보관 방법 (개인정보 — 법률 확인과 함께)
5. 이전에 정한 SECURITY §16의 "비밀번호 재설정(메일 vs 수동)"은 Phase 1 수동으로 시작하고 Resend 이후 재결정
