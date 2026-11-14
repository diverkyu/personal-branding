# 관리자 설정 및 운영·개발 환경 인수인계

- 작업일: 2026-11-14 (Asia/Seoul)
- 기준 소스: `6e67baa` (`main`, PR #39 병합)
- 대상 프로젝트: Vercel `diverkyu/personal-branding-l1sr`
- 상태: 운영 관리자 접속 완료, Preview 관리자 접속 및 DB 조회 확인 완료
- 문서 범위: 이번 세션에서 확인한 작업 기록. 제품 명세나 Phase 1 문서 세트 버전을 변경하지 않는다.

## 1. 완료한 작업

| 구분 | 완료 내용 | 확인 근거 |
| --- | --- | --- |
| PC 준비 | Node.js v26.13.1 확인, 프로젝트 패키지 설치 | 로컬 실행 및 계정 관리 명령 실행 |
| 운영 계정 | 관리자 비밀번호 재설정, 기존 세션 해제 | 사용자 터미널 성공 메시지, 새 배포의 `admin.login: password_ok` |
| 운영 2차 인증 | 인증 앱 등록 및 대시보드 접속 | 사용자가 등록·대시보드 접속 완료 보고 |
| 운영 DB 보안 | 캡처에 노출된 production DB 역할 비밀번호 교체 | 사용자가 Neon 재설정 완료 및 새 주소 반영 |
| 운영 배포 | Production `DATABASE_URL` 갱신 후 재배포 | Production / Current / Ready 및 운영 도메인 연결 확인 |
| 환경 분리 | Production과 Preview의 `DATABASE_URL`을 별도 항목으로 분리 | Vercel 환경별 설정 확인, 사용자 dev 연결 주소 입력 |
| 개발 계정 | dev DB에 개발용 관리자 생성, 2차 인증 등록 | `password_ok`, `admin.two_factor: success` 및 대시보드 사용자 표시 |
| 개발 DB | 누락된 기존 마이그레이션 `0008_inquiry_notify.sql` 적용 | 적용 전 이력 0000~0007, 적용 후 컬럼 존재 및 대시보드 쿼리 성공 |
| 임시 파일 | 운영·개발 작업에 사용한 로컬 `app/.env.local` 삭제 | 최종 파일 부재 확인 |

운영·개발 계정의 비밀번호와 인증 코드는 사용자가 직접 입력했다. 비밀번호, DB 연결 문자열, 인증 키, QR 코드, 복구 코드 및 계정 이메일은 이 문서에 포함하지 않는다.

## 2. 수정한 오류와 검증

### PowerShell의 npm 실행 차단

- 관측: `npm.ps1` 실행 정책 오류로 계정 관리 명령이 시작되지 않음.
- 처리: 보안 정책을 변경하지 않고 `npm.cmd run admin:reset-password` 및 `npm.cmd run admin:create` 사용.
- 결과: 사용자가 계정 관리 명령 성공 메시지를 확인함.

### 운영 로그인 시 User not found

- 관측: 기존 실행 로그에서 `User not found`; 로컬에서 연결한 production DB에는 입력한 이메일과 정확히 일치하는 계정이 존재했음.
- 처리: DB 비밀번호 교체와 Vercel Production 연결 정보 갱신, 재배포 후 새 화면에서 로그인.
- 시간 대조: 마지막 확인된 실패는 21:22:05, 새 배포 완료는 21:22:57. 실패 기록은 새 배포 완료 전 기록이었음.
- 결과: 21:29:06에 새 배포에서 `password_ok` 확인.
- 한계: 이전 배포의 연결 문자열은 Secret이라 직접 비교하지 못함. 이전 DB 불일치를 확정 원인으로 기록하지 않는다.

### Failed to find Server Action

- 관측: 21:31경 이전 또는 다른 배포의 Server Action을 찾지 못한다는 오류.
- 처리: 최신 2차 인증 등록 화면을 새 탭에서 열어 진행.
- 결과: 로그인 세션이 유지된 등록 화면 표시, 이후 사용자가 운영 대시보드 접속 완료 보고.
- 한계: 새 화면을 통한 복구이며, 배포 간 오래된 화면을 자동 복구하는 코드 수정은 하지 않음.

### Preview 대시보드에서 notify_status 컬럼 누락

- 관측: 21:45:06 비밀번호 인증 성공, 21:45:43 TOTP 성공 후 `/admin` 렌더링 실패.
- 서버 오류: `column inquiries.notify_status does not exist` (Postgres `42703`).
- 원인: dev DB에는 마이그레이션 0007까지 적용돼 있었고, 대시보드는 0008에서 추가한 알림 상태 컬럼을 조회함.
- 대상 검증: DB의 `current_setting('neon.branch_id', true)` 결과가 Neon 화면의 dev 브랜치 ID와 일치하는지 확인하고, 적용 명령에도 동일 브랜치 검사 조건을 둠.
- 처리: 저장소에 이미 있는 [0008_inquiry_notify.sql](../../app/drizzle/0008_inquiry_notify.sql)을 Drizzle migrator로 적용. `inquiries.notify_status`와 `inquiries_notify_check` 제약조건 추가.
- 결과: 컬럼 존재 확인, 같은 Preview 배포의 `/admin`에서 개발용 관리자 이름과 대시보드 집계·목록 정상 표시 확인.
- 영향: 이 마이그레이션은 dev DB에만 적용. 기존 행 삭제·수정 및 운영 DB 스키마 변경 없음. 소스 수정이나 재배포 없이 복구됨.

## 3. 확인한 배포

| 환경 | 배포 | 완료 시각 | 결과 |
| --- | --- | --- | --- |
| Production | [EchHwEQbe](https://vercel.com/diverkyu/personal-branding-l1sr/EchHwEQbeF9UNtYrC2c2qagQ2x9L) | 21:22:57 | 운영 도메인 연결, 비밀번호 인증 성공 |
| Preview | [Grh6Jk9Sn](https://vercel.com/diverkyu/personal-branding-l1sr/Grh6Jk9SngixsERhDJUgekv1LpYG) | 21:37:53 | dev 관리자 인증·TOTP 성공, DB 보완 후 대시보드 정상 |

- 운영: https://personal-branding-l1sr.vercel.app
- 이번 Preview: https://personal-branding-l1sr-678oqv4b7-diverkyu.vercel.app
- Preview의 Ready 표시나 공개 페이지 표시만으로 DB 정상이라고 판단하지 않았다. 최종적으로 인증·DB 조회를 포함한 대시보드 표시까지 확인했다.
- 이번 장애 해결은 환경 설정과 기존 DB 마이그레이션 적용으로 수행했다. 이 문서 추가 외에 애플리케이션 소스 변경은 없다.

## 4. 남은 작업

아래 항목은 이번 작업에서 완료하지 않은 후속 확인 사항이다. 기존 구현의 부재를 뜻하지 않는다.

### 개발·배포 후속 점검

- [ ] 배포 절차에 환경별 마이그레이션 적용 여부 확인을 포함한다. 새 코드 배포와 DB 업데이트를 별도로 관리한다.
- [ ] Preview의 `SITE_URL` 검토: 실행 로그의 `siteOrigin`이 운영 주소로 표시됐다. 개발용 인증은 성공했지만 링크 생성·출처 검증을 포함한 환경별 정책을 점검한다.
- [ ] Vercel의 별도 `personal-branding` 프로젝트 사용 여부를 공동개발자와 결정한다. 이번 작업은 `personal-branding-l1sr`만 대상으로 했으며 다른 프로젝트의 연결 정보는 점검·갱신하지 않았다.
- [ ] 개발 환경에 운영 개인정보가 복사되지 않도록 향후 Neon 브랜치 생성·갱신 절차를 확인한다. 이번에는 기존 dev 브랜치를 사용했다.
- [ ] 오래된 탭에서 배포 후 Server Action 오류가 발생할 때 사용자 안내·복구 방식을 검토한다.
- [ ] 패키지 설치 시 보고된 취약점(당시 11 moderate, 4 high)과 빌드의 Node 버전 범위·폐기 예정 패키지 경고를 별도 검토한다. 이번에는 의존성 변경이나 자동 수정 없이 진행했다.

### 기능 검수 및 공개 준비

- [ ] Vercel Blob 연결과 실제 이미지 업로드·표시 검수.
- [ ] 콘텐츠 작성·미리보기·발행·예약·비공개 전환 검수.
- [ ] 신청·문의 저장, 관리자 확인 및 Resend 알림 메일 검수.
- [ ] 운영용 연락처·소개·콘텐츠·동의 및 개인정보 처리방침 확정. Preview 공개 페이지에서 기본 연락처가 표시되는 것도 확인 필요.
- [ ] 실제 도메인·검색 노출·요금제·계정 소유권 등 기존 공개 체크리스트 재확인.
- [ ] 운영·개발용 복구 코드 보관 상태는 소유자가 확인한다. 코드 자체는 공동 문서로 공유하지 않는다.

## 5. 검증 범위와 참고 문서

- 통과: 운영 비밀번호 인증 로그, Preview 비밀번호·TOTP 성공 로그, dev 컬럼 존재, Preview 대시보드 실제 표시, 임시 파일 삭제.
- 사용자 완료 보고: 운영 2차 인증 등록과 대시보드 진입.
- 미검증: 전체 기능 E2E, Preview와 운영의 모든 환경변수 값 직접 비교, 다른 Vercel 프로젝트 상태, 출시 준비 완료 여부.
- 이번 문서 PR은 문서만 추가한다. 코드 테스트·빌드는 다시 실행하지 않고 링크와 diff를 검사한다.

관련 규약: [AGENTS.md](../../AGENTS.md), [인프라](../phase1/INFRASTRUCTURE.md), [관리자 설계](../phase1/ADMIN-DESIGN.md), [개발 지침](../phase1/DEVELOPMENT.md), [보안](../phase1/SECURITY.md).
