# SEO Intelligence 도구 설치·검증 및 다음 세션 인수인계

2026-11-28 KST. [요청서 검토 및 어드민 변경안](../phase1/SEO-INTELLIGENCE.md)이 설계 기준이다.

## 작업 위치와 보존

- `seo-intelligence` 작업 트리, `feat/seo-intelligence-tooling`, 기준 main 70d1947. 별도 앱/프로젝트를 생성한 것이 아니라 동일 저장소의 독립 작업 트리다.
- 이 기반 작업은 사용자의 GitHub 공유 요청에 따라 `feat/seo-intelligence-tooling`의 별도 커밋으로 공유한다. 어드민 기준 커밋 `51eaeb0`과는 별개다. 실제 원격 커밋·PR 링크는 GitHub 브랜치 기록을 기준으로 확인한다.
- 어드민 기준 `51eaeb0`와 SEO-INTEGRATION.md를 검토했다. `concept-review`는 여전히 해당 커밋의 깨끗한 상태이며 수정하지 않았다.
- 0009 SQL/메타, DB 스키마, 관리자 메뉴/스타일, 성과 크론, providers/store/sync는 변경하지 않았다. 초기 구현 때 원격 작업은 없었으며, 후속 요청으로 이 도구 브랜치의 GitHub push/PR만 수행한다. 원격 DB 접속·운영 배포·검색엔진 제출은 범위 밖이다.
- package.json에는 Lighthouse 개발 의존성과 명령 2개만 추가했다. 통합 시 어드민의 `seo:dev-smoke`와 #75의 `seo:audit` 명령도 유지해야 한다. PRD/CHANGELOG 공용 버전은 접합 PR에서 정리한다.

## 설치/연결 결과

| 항목 | 결과 | 제한 |
| --- | --- | --- |
| 외부 스킬 5개 | 지정 커밋으로 `.agents/skills/` 설치, 각 SKILL.md 검토, 공식 quick_validate 통과 | 검색엔진 공식 정책이 아님. 유료 도구 추천/외부 연동은 도입하지 않음 |
| DIVERKYU 전용 스킬 | SKILL.md + 참조 3개 + openai.yaml, 검증 통과 | 실제 Codex 자동 탐지/`$diverkyu-seo-audit` UI 호출은 새 저장소 문맥에서 확인 필요 |
| Chrome DevTools MCP | 1.14.0 고정, stdio initialize/tools-list 성공(33개 도구), 격리 Chrome에서 운영 홈 제목과 URL 확인 | 프로젝트 설정 파일은 작성했으나 현재 호스트 채팅에 새 도구가 노출됐다고 확인하지 않음 |
| Playwright MCP | 0.0.86 프로토콜 연결까지 확인 | 내부 alpha 엔진 확인 후 사용자 결정으로 `enabled=false`. 이후 브라우저 시험에 사용하지 않음 |
| Lighthouse CI | @lhci/cli 0.16.1, Lighthouse 13.6.0, 로컬 3URL×3회 실제 실행 | 운영 성능/실사용자 CWV 검사가 아님 |
| 교환 보고서 | `diagnostics.json`에 SEO-INTEGRATION schemaVersion 1 형식 출력, 검증 함수/테스트 | 외부 수집 API·DB 저장·관리자 표시 아직 미구현 |
| GitHub Actions | `.github/workflows/seo-lighthouse.yml` 작성, 로컬 같은 명령 실행 | 원격 workflow 실행/활성화 미검증 |

전역 Codex 설정을 덮어쓰지 않았다. `codex mcp list`에서는 새 프로젝트 서버가 보이지 않았다(호출 한정 trust 설정 시험도 동일). 직접 프로토콜 연결 성공과 호스트 등록 성공을 구분한다. 저장소 폴더를 작업 문맥으로 열고 신뢰/설정 로드를 확인해야 한다. 새 세션에서도 노출되지 않으면 그때 호스트 MCP 설정 경로를 확인하고 기존 항목을 보존하며 추가한다. 전역 등록이나 다른 프로필 자동 연결은 하지 않았다.

스킬 번들은 `.md`/`.json` 40개이며 실행 스크립트/설치 훅이 없다. MIT 라이선스 전문과 SHA-256(줄바꿈 LF 정규화) manifest를 함께 보존했다. 참고문서의 광고/유료 서비스/수치 주장은 승인이나 사실 증거로 쓰지 않는다. 전용 브랜드 문맥과 검사 규칙이 이를 제한한다.

## 재현 명령

저장소 루트에서:

```powershell
python app/scripts/seo-skill-integrity.py
python app/scripts/seo-mcp-smoke.py
# 공개 홈페이지 probe는 SITE_URL이 승인된 www.diverkyu.com일 때만 가능
$env:SITE_URL = 'https://www.diverkyu.com'
python app/scripts/seo-mcp-smoke.py --probe
```

`app/`에서:

```powershell
npm ci
npm run test:seo-tools
npm run seo:lhci -- local
npm run check
```

`seo:lhci -- local`은 3195 포트·`.next-lhci`를 쓰고 DB/Auth/메일/Blob 키를 비워 가상 데이터로 빌드한다. 운영 환경변수 파일을 복사하지 않는다. noindex는 유지하며 로컬 Lighthouse에서만 `is-crawlable`을 제외한다. 이 예외는 summary에 명시된다. `seo:lhci -- public`은 별도 명시 실행이며 SITE_URL의 HTTPS origin에 대해 정해진 공개 3개 경로만 측정한다. 임의 경로 입력, 관리자 인증, 폼 제출, 검색엔진 제출이 없다.

리포트는 `app/artifacts/lighthouse/reports/`, 요약은 `summary.json`, 파일 교환 계약은 `diagnostics.json`. 모두 Git 무시. 실행 시작 시 현재 summary를 running으로, 교환 파일을 빈 배열로 바꿔 이전 성공이 이번 성공으로 오인되지 않도록 한다. 실패는 failed로 기록한다. 기존 장기 이력 저장 기능을 대신하는 것은 아니다.

## 실제 로컬 기준선 후보

Windows x64, Node 26.13.1, HeadlessChrome 158.0.0.0, Lighthouse 13.6.0, 모바일 시뮬레이션, 가상 데이터, 각 3회 중앙값. 운영 홈페이지의 검색 성과나 실제 방문자 성능으로 해석하지 않는다.

| 경로 | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| / | 96 | 100 | 100 | 100 | 2254ms | 0 | 35.5ms |
| /freediving | 100 | 100 | 100 | 100 | 1504ms | 0.000119 | 22ms |
| /films | 97 | 100 | 100 | 100 | 2140ms | 0.000305 | 25.5ms |

실사용자 INP는 미측정. 로컬 SEO 점수는 의도된 noindex 검사 제외 결과다. 아직 CI 기준선, 상대 회귀 판정, 배포 차단 기준이 아니다. CI 머신/브라우저 조건이 다르면 이 수치와 직접 비교하지 않는다.

## 검증과 잔여 작업

- 스킬 6개 quick_validate 통과. 검증기 PyYAML 의존성은 저장소 밖 임시 검토 폴더에 설치했고 앱 의존성에 넣지 않았다.
- 보고서/요약 테스트 7개: 평균 대신 중앙값, 0/미확인, 불완전/실패/리디렉션, URL별 ID, 외부/관리자/쿼리 URL 거부, 크기/상태/날짜/중복 규칙 검증.
- `npm run check`: 타입, ESLint, 단위 61파일/615건, Next 운영 빌드 통과. 도구 기반 브랜치 검증이며 미병합 어드민과의 통합 빌드를 뜻하지 않는다.
- Lighthouse 전체 9회 통과, 3개 URL complete. 브라우저 공개 URL 연결 확인. UI 변경이 없어 별도 전체 E2E 반복은 하지 않았다.
- 설치 시 npm audit 15건(11 moderate/4 high)이 보고됐다. 기존 의존성을 일괄 업데이트하거나 audit fix --force를 실행하지 않았다. 배포 런타임 의존성은 추가하지 않았으며 알려진 의존성 보안 항목은 별도 검토 대상이다.
- 수동 보안 검토: 외부 페이지의 명령을 따르지 않음, 비밀값 출력/DB 쓰기/인증 우회 없음, 보고서 크기·URL·상태 제한, CI 최소 contents:read, pull_request_target 사용 없음, 원격 공용 LHCI 업로드 없음. 기존 security-guidance 플러그인은 Codex에서 실행하지 않았고 AGENTS §9.4에 따라 직접 검토했다.
- 미완료: 호스트의 새 스킬/MCP 자동 인식, 기존 크롤러의 공통 계약 확장, 인증된 보고서 가져오기, 새 진단 DB와 UI, 주간/월간 자동화, 실 Google/Bing 인증, 운영 배포. 최초 원격 Actions 실행은 아래 후속 확인에서 성공했다.

다음 접합은 **51eaeb0의 기존 인증/일지/성과 동기화 재사용 → JSON 파일 가져오기 → 진단 실행/관찰/일지 연결 → 기존 크롤러 확장 → 주간 CI 수신** 순서다. 기존 일일 성과 크론을 하나 더 만들지 않는다. 0009를 수정하지 않는다. 원격 공유/병합·운영 변경은 사용자의 기존 승인 경계를 따른다.

## 후속 — PR #75/#76 병합 후 #77 충돌 해결 및 설계 승인

2026-11-28 KST. 사용자가 #75/#76을 병합하고 #77 충돌 해결·재푸시를 요청했다. 어드민 설계 방향을 승인했으며 2차 키워드 제안·상위 키워드 확인을 고려한 1차 구현 순서를 요청했다.

- fetch한 main은 `6029acb`(#76 병합), 선행 `c79f716`(#75 병합). 강제 푸시 대신 main을 기능 브랜치에 merge한다.
- 실제 충돌은 `app/package.json`의 scripts 한 곳. `seo:audit`, `seo:lhci`, `test:seo-tools`를 모두 보존했다. package-lock의 의존성 선언과 일치하며 이번 충돌 해결에서 의존성 버전을 바꾸지 않았다.
- 타입 검사·ESLint·단위 63파일/623건 통과. 최초 빌드는 Windows 샌드박스의 junction 생성 거부로 중단됐고, 같은 빌드를 일반 실행 환경에서 재실행해 통과했다. 애플리케이션 오류를 숨기도록 코드를 바꾸지 않았다.
- SEO E2E: `seo.spec.ts`, `seo-content.spec.ts`를 390/768/1440에서 실행해 9건 통과. 전체 E2E 반복 실행이나 운영 전체 URL 재점검은 이번 검증 범위가 아니다.
- 최초 #77 [GitHub Lighthouse 검사](https://github.com/diverkyu/personal-branding/actions/runs/46143602270)는 success로 확인했다. main 통합 후 최신 커밋의 CI는 새 실행에서 별도 검증한다.
- 보안 점검(security-guidance): Codex에서 플러그인은 미실행. AGENTS §9.4 직접 검토로 충돌 해결이 기존 명령을 보존하고 비밀값·새 외부 실행·인증/DB 변경을 추가하지 않았음을 확인했다. 기존 0009·스키마·성과 크론과 다른 세션의 작업 트리를 변경하지 않았다.
- [승인된 1차 단계와 2차 확장 경계](../phase1/SEO-INTELLIGENCE.md#6-구현-순서와-책임-파일)를 개정했다. 이후 접합 순서는 이 개정안의 1-0~1-5를 우선한다. 키워드 메뉴·추천 엔진·새 DB가 구현됐다는 뜻은 아니다.
- #77은 도구 기반 PR로 유지하며 사람 병합 후 최신 main에서 기존 어드민 `51eaeb0` 통합을 시작한다. 기존 dev 0009는 불변이고 운영 DB 적용·배포는 별도 승인 경계를 유지한다.
