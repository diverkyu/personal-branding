# SEO 관리자와 별도 자동화 스킬의 연동 경계

2026-11-28. 사용자 요청: 다른 세션의 SEO 활용 스킬과 관리자 구현이 충돌하지 않도록 기준점을 공유한다.

## 후속 통합 현황

사용자가 #77을 병합한 뒤 기존 어드민 통합을 승인했다. `feat/seo-admin-integration`은 main `313d643`을 기준으로 아래 `51eaeb0`을 통합하며, 원래 `concept-review` 작업 트리는 유지한다. 공통 문서 충돌에서는 페이지 SEO와 어드민 요구사항을 모두 보존했다. 0009 세 파일(SQL/스냅샷/저널)은 기준 커밋과 동일하다. 이 문서 아래의 "로컬 공유/미구현"은 최초 기준점 기록이며, 현재 검증과 API 구현 여부는 [후속 기록](../operations/2026-11-28-seo-admin-integration.md)을 확인한다.

## 현재 구현 — 그대로 재사용할 경계

- 기준 브랜치: `feat/seo-admin-phase12`. 이번 문서를 포함한 `feat: add integrated SEO admin phase 1 and 2` 커밋이 로컬 공유 기준점이다. 원격 push/병합/배포와는 별개다.
- `app/src/seo/model.ts`: 엔진, 점검 상태/허용 전이, 지표, URL 검증, 분야 분류 계약.
- `app/src/data/seo/providers.ts`: Google/Bing 성과 조회 어댑터. 외부 API 호스트와 오류 처리, 시크릿 사용은 이 서버 계층에 둔다.
- `app/src/data/seo/sync.ts`: 성과 수집 실행 조정. `store.ts`의 DB 임대 잠금/같은 날 중복 성공 방지/실패 시 마지막 성공 보존을 이용한다.
- `app/src/data/seo/store.ts`: 점검 CRUD, 분야 지정, 성과 스냅샷 저장. `saveJournal`/`deleteJournal`은 인증된 관리자 문맥을 요구한다. 외부 스킬이 임의 관리자 객체를 만들어 권한을 우회하는 진입점으로 사용하면 안 된다.
- `app/src/app/admin/(console)/seo/actions.ts`: 기존 관리자 인증을 거치는 브라우저 변경 진입점.
- `app/src/app/api/cron/seo/route.ts`: Google/Bing 성과 동기화용 크론. 현재 임의 기술 진단이나 외부 보고서 수집 API가 아니다.
- 메뉴: 홈 → 콘텐츠 → SEO 현황 → 운영. 기존 6개 SEO 화면 안에 연동한다.
- DB 마이그레이션 `0009_amusing_enchantress`는 **Neon dev에 이미 적용됨**. 해당 SQL/메타 파일을 수정·재생성·이름 변경하지 않는다. 운영에는 미적용이다.

## 다른 세션에서 독립적으로 진행할 수 있는 작업

스킬 자체, 읽기 전용 사이트 진단, 보고서 출력, 규칙/권고 문구를 별도 작업 디렉터리에서 진행할 수 있다. 기존 관리자 파일을 동시에 수정하거나 같은 체크아웃에서 브랜치를 전환하지 않는다. 앱 쪽 별도 분석기를 추가할 경우 `app/src/seo/diagnostics/`처럼 분리하되 실제 접합은 기준 커밋을 가져온 후 진행한다.

충돌 가능성이 큰 공용 파일: `app/src/db/schema.ts`, `app/drizzle/meta/_journal.json`, `app/vercel.json`, 관리자 `AdminNav.tsx`, `admin.module.css`, `data/admin/audit.ts`, `package.json`, Phase 1 PRD/CHANGELOG. 이 파일들은 양쪽 세션에서 독립적으로 같은 변경을 만들지 않는다. 새 마이그레이션은 통합된 최신 스키마에서 생성한다.

이전에 있던 `feat/seo-audit` 5996665의 감사 스크립트는 해당 브랜치에 보존되어 있으며 이 기준점에 합쳐져 있지 않다. 먼저 비교해 중복 구현을 피한다.

## 외부 진단 보고서 계약 — 제안, 아직 구현된 API 아님

외부 스킬은 우선 보고서를 파일로 출력한다. 이후 관리자에 붙일 때 다음 필드를 맞추면 수동 가져오기 또는 인증된 수집 API를 별도로 설계할 수 있다.

```json
{
  "schemaVersion": 1,
  "toolId": "site-seo-audit",
  "runId": "unique-run-id",
  "checkedAt": "2026-11-28T00:00:00Z",
  "targetUrl": "https://example.com/story/example",
  "checks": [
    {
      "ruleId": "meta.description",
      "outcome": "unknown",
      "summary": "확인 결과를 작성",
      "evidenceUrl": "https://example.com/story/example"
    }
  ]
}
```

`outcome`: pass / warn / fail / unknown. 이 예시는 형식 설명용이며 실제 점검 결과가 아니다. 보고서에는 쿠키, 키, 토큰, 비공개 개인정보, 원본 HTML 전체를 넣지 않는다. URL은 표시용 데이터이고, 가져오기 과정에서 임의 URL을 서버가 요청하지 않도록 검증한다.

후속 구현에서 `(toolId, runId)`로 중복 보고서 방지를 설계할 수 있다. **현재 일지에는 이 필드·중복 키·가져오기 API가 없다.** 기존 성과 스냅샷의 중복 방지와 혼동하지 않는다. 외부 진단 결과는 Google/Bing 검색 노출·클릭 수치가 아니므로 같은 성과 테이블에 넣지 않는다.

자동 결과로 기존 수동 일지를 덮어쓰거나 바로 해결 완료 처리하지 않는다. 관리자 검토를 거쳐 점검 기록에 연결한다. 일반 페이지 Google Indexing API, 네이버 로그인 스크래핑, 승인 없는 외부 제출은 추가하지 않는다.

## 접합 순서

1. 다른 세션은 이 로컬 커밋을 기준으로 변경 파일과 출력 형식을 확인한다. 다른 기기에서는 push 전까지 이 커밋을 받을 수 없으므로 문서/패치 전달 또는 사용자 승인된 별도 공유가 필요하다.
2. 보고서 출력까지는 스킬 쪽에서 독립 작업한다.
3. 통합 시 수집 권한, 입력 검증, 저장 모델, 중복 기준을 정한 후 관리자 어댑터를 추가한다. 서비스 인증을 기존 관리자 인증으로 가장하지 않는다.
4. 동일 작업을 실행하는 두 번째 크론을 만들지 않는다. 현재 성과 크론과 후속 기술 진단의 실행 범위/잠금 키를 구분한다.
5. dev 마이그레이션/CRUD/브라우저 검증 후 운영 변경은 별도 사용자 승인으로 진행한다.

현재 실제 검증: dev 0009 및 점검 CRUD/상태 전이 통과. 기존 개발 관리자 로그인은 `BETTER_AUTH_SECRET` 미설정으로 대기. 실제 Google/Bing 연결·기술 진단 자동화·보고서 가져오기는 미검증 또는 미구현이다.
