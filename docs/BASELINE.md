# 초기 시안 보존 기록

## 버전과 출처

- 버전: v0.1.0
- GitHub 기록일: 2026-10-31 (Asia/Seoul)
- 최초 Sites 제작·배포일: 2026-10-30 (Asia/Seoul)
- 사이트: https://depth-and-imagination-portfolio-k7m4.merrybat41.chatgpt.site/
- Sites project: appgprj_6ae3deade0648191a1fa6dca2a1ec62d
- 원본 Sites 소스 commit: ccfa405db56c446dcc1e39951fbaa09b8799ea16
- 원본 deployment: appgdep_6ae3e011e3b08191a3a05de6c1695096 (최초 배포 성공 확인)
- GitHub 기존 커밋: ed8c5d26e327fe986b4a965d8ccb0d0c58e2f7a4 (Initial commit)
- 초기 시안은 v0.1.0 태그가 가리키는 GitHub 커밋으로 보존합니다. Sites와 GitHub 커밋은 서로 다른 저장소의 이력입니다.

## 보존 범위

HTML, CSS, JavaScript, Sites manifest를 원본과 바이트 단위로 비교해 동일함을 확인했습니다. 디자인·카피·레이아웃·이미지·인터랙션을 수정하지 않았습니다. 문서와 로컬 실행 도구만 추가했습니다. 원본 GitHub README의 제목과 소개 문장을 유지했습니다.

| 파일 | 바이트 | SHA-256 |
| --- | ---: | --- |
| `dist/index.html` | 7803 | `d0d7f4c98e355d5b6b7327f892d8d8d1ce07a70116fd199a0079a769993b147b` |
| `dist/style.css` | 9177 | `5960d0e594355e7c5ced3512ef202d3a7b140f70969a4d7b6aa277ccc6128f11` |
| `dist/app.js` | 854 | `572a91c996cfc9066eecafb2a87275f6b6e79d4c7ea7912d20bb210d17de8d42` |
| `.openai/hosting.json` | 106 | `25778729db3972e8a3b4dbc86683abe62759f95f9b3ab7e88e754df11fec530d` |

## 검증 범위

- 원본 파일과 복제본의 바이트 일치 확인.
- npm run check: 사이트 JavaScript와 미리보기 서버의 문법 검사 통과.
- 로컬 서버 HTTP 점검: HTML·CSS·JavaScript 200, 없는 경로 404, 상위 경로 접근 403 확인.
- 디자인 명세와 카피는 현재 소스 기준으로 기록.
- 최초 제작 시 브라우저 화면 검증은 환경 제한으로 완료되지 않았습니다. 사용자가 현재 시안을 마음에 들어 한다고 확인한 상태에서 원본을 보존했습니다.
- 문법 검사·소스 일치는 실제 모바일·브라우저 동작, 색상 대비, 폰트 렌더링의 전체 검증을 뜻하지 않습니다.

## 포함하지 않은 항목

인증 토큰, Git credential, 개인 환경 변수, 로컬 .git 디렉터리, 임시 배포 압축 파일은 저장소에 복사하지 않았습니다. GitHub 자동 배포와 Sites 공개 범위 변경도 이 작업의 범위에 포함하지 않습니다. .openai/hosting.json에는 기존 프로젝트 ID와 dist 경로만 포함됩니다.

## 복원

초기 시안을 보려면 git switch --detach v0.1.0을 실행하고 npm run dev로 시작합니다. 이어서 개발하려면 v0.1.0에서 새 브랜치를 만듭니다. 구글 폰트는 원격 제공이므로 네트워크나 폰트 서비스 변화로 실제 렌더링이 달라질 수 있습니다.
