# 이미지 저장소·콘텐츠 발행·문의 이메일 인수인계

- 기록일: 2026-11-17 (Asia/Seoul); Blob 연결·재배포는 11월 16일, 실제 업로드·발행·연락처 확인은 11월 17일 수행.
- 기준 소스: `a7fa0c0` (main, PR #49 병합).
- 대상: Vercel `personal-branding-l1sr`.
- 이번 변경은 운영 어드민 콘텐츠·설정과 Vercel 연결 작업이다. 이 문서 PR은 코드나 DB 스키마를 변경하지 않으며, 전체 서비스의 정식 출시 완료를 뜻하지 않는다.
- 이전 기록: [관리자 설정 인수인계](2026-11-14-admin-setup-handoff.md).

## 완료한 작업

| 항목 | 완료 내용 | 확인 범위·근거 |
| --- | --- | --- |
| 이미지 저장소 | Public Blob `kyu-media`를 Production·Preview에 연결. 자동 연결된 `BLOB_READ_WRITE_TOKEN`과 `MEDIA_STORE=blob` 설정 후 양쪽 재배포 | 두 배포 Ready 확인. 운영 대시보드 이미지 저장소 완료 표시 |
| 미디어 업로드 | 영상 장면 캡처 이미지를 미디어에 업로드하고 Films 포스터로 지정 | WebP 업로드 성공 및 공개 포스터 표시 |
| Story 본문 이미지 | 편집기 ‘새 이미지 올리기 → 올리고 넣기’ 사용 | 본문 저장·발행 후 공개 이미지 로딩 확인 |
| Story 발행 | 전달된 제작 가이드 원고를 바탕으로 글·이미지·영상 링크 등록 | 공개 상세 페이지 확인 |
| Films 발행 | 15초 릴스, 장면 캡처 포스터, 소개와 제작 노트 등록 | 공개 목록·상세 페이지 확인. 사용자 확인에 따라 ‘자막 없음’ 반영 |
| 문의 이메일 | `energizer629@gmail.com`으로 변경 | Contact의 표시 주소 및 강습·투어, 협업, AI 특강 메일 링크 확인 |

### 발행 콘텐츠

- [Story — 이런 AI 영상, 어떻게 만드냐고요? 초보자를 위한 제작 가이드](https://personal-branding-l1sr.vercel.app/story/ai-video-guide)
  - 원고: [story-guide.html](../content/ai-video-guide/story-guide.html).
  - 슬러그: `ai-video-guide`; 운영 콘텐츠 ID: `d8672baf-cf11-4cf5-a9a5-ed3ed03ef38c`.
  - 이미지 자리 안내를 제거하고 본문 서식·표·복사 상자를 유지했다. 이미지와 영상은 현재 본문 끝에 들어 있다.
- [Films — 헤어지자고? 곧 크리스마스잖아](https://personal-branding-l1sr.vercel.app/films/christmas-selfie-ai)
  - 원고: [film-fields.md](../content/ai-video-guide/film-fields.md).
  - 슬러그: `christmas-selfie-ai`; 운영 콘텐츠 ID: `a549703b-97dd-493e-9625-c756122851ed`.
  - 영상: [Instagram 릴스](https://www.instagram.com/reel/DfyQydRMWBw/), 길이 `0:15`, 한글 자막 없음.
  - 기존 Films `/films/ai`는 다른 YouTube 링크와 포스터를 가진 콘텐츠이므로 수정하거나 삭제하지 않았다.
- [Contact](https://personal-branding-l1sr.vercel.app/contact): 공개 문의 이메일 변경 반영.

두 업로드 이미지는 각각 Films 포스터와 Story 본문에서 사용 중이다. 단순 시험용 미사용 파일로 간주해 삭제하지 않는다. 운영 콘텐츠는 CMS/DB에 저장되어 있으며, 이 PR 자체가 콘텐츠 백업이나 Preview로의 복제를 제공하지는 않는다.

## 해결한 설정 문제와 검증 한계

- 이미지 저장소 미연결 상태에 대해 Blob 연결 및 `MEDIA_STORE` 설정·재배포를 완료하고 실제 운영 업로드 성공까지 확인했다. 별도 코드 수정은 하지 않았다.
- 예시 문의 주소를 실제 공개 연락처로 교체했다. 이는 신청 알림 수신 주소나 메일 서비스 설정과는 별개다.
- 통과: Production 미디어 업로드, 편집기 직접 업로드, 공개 이미지 표시, Story·Films 발행, Contact 메일 링크.
- 미검증: Preview 실제 업로드, 공개 페이지 안의 Instagram 플레이어 재생, 모바일 화면 전체 검수, 신청 알림 실제 발송.
- 이번 범위에서 새로 확인된 업로드 실패는 없다. 미검증을 통과로 취급하지 않는다.

## 남은 작업

아래는 11월 17일 확인 범위에서 남긴 후속 항목이다. 설정을 바꾸기 전 현재 상태를 다시 확인한다.

| 우선순위 | 작업 | 완료 판단 기준 |
| --- | --- | --- |
| 높음 | 공개 페이지 Instagram 재생·모바일 검수 | Story·Films에서 재생 흐름과 좁은 화면 표시 확인 |
| 높음 | Preview 실제 이미지 업로드 | dev 환경에서 미디어·본문 업로드와 표시 확인; 운영 DB를 시험용으로 사용하지 않음 |
| 높음 | 신청·문의 알림 메일 연결 | `RESEND_API_KEY`, `MAIL_FROM`, 신청 알림 수신 주소 설정 및 시험 접수 후 실제 수신 확인 |
| 높음 | 공개 전 운영 점검 | 개인정보 처리방침, 검색 노출 설정, 정식 도메인 연결 상태 확인. [인프라 문서](../phase1/INFRASTRUCTURE.md)의 운영 요금제 조건 및 Blob 사용량·한도 확인 |
| 보통 | 예약 발행 자동 실행 점검 | `CRON_SECRET` 설정 및 예약 발행·자동 실행 기록 확인 |
| 보통 | Story 이미지·영상 위치 검토 | ‘완성 결과’ 구역으로 옮길지 결정하고 공개 화면 확인 |
| 보통 | 기존 Films 콘텐츠 정리 검토 | 기존 `/films/ai`와 새 작품의 목적·내용을 비교한 뒤 유지·수정 여부 결정 |

## 문서 PR 검증

- 문서 및 README만 변경한다. 앱 코드·초기 정적 시안·환경변수 값·비밀정보는 포함하지 않는다.
- 상대 문서 링크 대상 존재와 `git diff --check`를 확인한다.
- 앱 테스트·빌드는 문서만 변경하므로 실행하지 않는다. 위 운영 검증과 코드 테스트 결과를 혼동하지 않는다.
- 병합은 저장소 규약에 따라 사람이 검토한 뒤 진행한다.
