# SEO 통합 관리 — Phase 1/2

2026-11-28 · 구현 및 검증 기준 · PRD A-10, 화면 ADM-SEO

후속 통합: #77 병합 main `313d643`에 `51eaeb0`의 구현을 가져왔다. 이 문서 제목의 Phase 1/2는 초기 어드민 개발 당시 명칭이며, 현재 SEO Intelligence 로드맵에서는 **1-1 기존 어드민 통합**에 해당한다. [현재 검증과 남은 설정](../operations/2026-11-28-seo-admin-integration.md), [이후 구현 순서·2차 키워드 확장](SEO-INTELLIGENCE.md#6-구현-순서와-책임-파일)을 따른다. 원래 0009는 수정하지 않는다.

## 범위와 기존 구조

Next.js 16.4.5 App Router / React 19 / Better Auth TOTP / Neon HTTP + Drizzle / Vercel. 기존 관리자 console layout과 모든 서버 액션의 requireAdmin을 재사용한다. 공개 페이지, 검색 노출 스위치, 기존 발행·정리 크론은 변경하지 않는다. 기존 feat/seo-audit는 보존하고 main 70d1947에서 별도 브랜치로 작업한다.

메뉴는 종합 대시보드, 검색 성과, 수집 및 색인 관리, SEO 기술 진단, SEO 점검 일지, 검색엔진 연동 설정이다. 수집·진단 메뉴에는 현재 할 수 있는 수동 기록/공식 링크와 후속 구현 범위를 명시한다. Phase 3~5 자동 제출·진단·GA4는 구현 완료로 표시하지 않는다.

사용 빈도에 따라 관리자 그룹 순서는 홈 → 콘텐츠 → SEO 현황 → 운영이다(2026-11-28 사용자 요청). 모바일 접기 메뉴도 콘텐츠 다음에 둔다.

## 데이터 계약

- Google: web 검색, PT 날짜, final 데이터. 날짜 합계 / 날짜+검색어 / 날짜+페이지를 별도로 조회한다. 검색어 익명화·상위 행 제한 때문에 상세 합계가 총계와 같지 않다. 차원별 50,000행 수집 상한에 도달하면 제한 상태를 표시한다.
- Bing: JSON REST GetRankAndTrafficStats의 날짜별 clicks/impressions. 여러 검색 영역이 포함되므로 Google과 합산하지 않는다. 세부 검색어·페이지와 평균 순위는 이 단계에서 미지원으로 표시한다.
- Naver: 일반 공개 성과 API는 확인되지 않음. 로그인 스크래핑 없음. 점검 일지에 조회 기간·실제 수치(선택)·공식 원본 링크를 수동 저장한다. 기간이 겹칠 수 있어 자동 성과 합계에 더하지 않는다.
- 최근 7/28/90일은 어제(UTC 달력일)를 끝으로 한 조회 범위. Google의 원본 날짜는 PT, Bing은 응답 날짜를 보존한다. 동기화마다 최근 90일을 다시 가져와 지연·수정치를 반영한다. 최신 원본 날짜와 저장 시각은 별도 표시한다. 없는 행은 0으로 채우지 않는다.
- 엔진별 마지막 성공 스냅샷을 JSONB로 원자적 upsert한다. 조회 전체가 성공한 뒤에만 교체하여 부분 실패로 기존 자료를 잃지 않는다. 속성별 해시 키와 10분 임대 잠금, 하루 성공 중복 방지, 실패 재시도 간격을 둔다. 속성 변경 시 예전 속성 자료를 현재 자료로 표시하지 않는다.
- 분야: /freediving 및 하위(여행 포함)=프리다이빙, /films 및 하위=AI 영상, 홈/About/Contact=개인 브랜딩. /story는 혼합 콘텐츠이므로 자동 추측하지 않고 관리자가 URL별 분야를 지정한다. 나머지는 미분류. GA4 문의 전환=미확인.
- 점검 상태: 조치 필요 → 수정 완료 → 재검사 대기 → 해결 완료 또는 추가 조치 → 수정 완료. 제목/대상 URL/엔진/확인일/근거 링크/메모. 버전 충돌 검사, 삭제 확인과 소프트 삭제, 활동 기록.

## 보안·검증 기준

시크릿은 환경변수에만, UI는 존재 여부만 노출한다. Google OAuth refresh token은 webmasters.readonly로 발급한다. Bing 키는 계정 범위이므로 해당 사이트 전용 계정의 최소 권한을 권장하며 코드에는 조회 메서드만 허용한다. 외부 요청은 고정된 Google/Bing 호스트, 리디렉션 거부, 시간 제한, 오류 본문/키가 들어간 URL을 로그에 남기지 않는다. 사용자 입력 URL은 표시/분류용이며 서버가 요청하지 않는다.

검증: PGlite에 전체 마이그레이션 적용, 상태 전이·충돌·입력 검증·실패 후 보존·중복/잠금·속성 변경·0/미확인·기간/CTR/가중순위·Google 페이지네이션·API 오류·크론 인증 시험. 공통 타입/린트/단위/빌드, 390/768/1440 UI 캡처, 비로그인 라우트 차단을 확인한다. 실 API·Neon dev/production·배포·스케줄 실행은 별도 설정 전 미검증이다.

## 공식 근거 (2026-11-28 확인)

- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data
- https://learn.microsoft.com/en-us/bingwebmaster/api-protocols
- https://learn.microsoft.com/en-us/bingwebmaster/getting-access
- https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.getrankandtrafficstats?view=bing-webmaster-dotnet
- https://searchadvisor.naver.com/guide/report-crawl-refine
- https://help.naver.com/service/30010/contents/17583?lang=ko&osType=PC
