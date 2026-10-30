# personal-branding
Personal brand website for KYU — freediving instructor and AI creator.

## KYU — Dive deeper. Create beyond.

프리다이빙 강사이자 AI 크리에이터 **이동규 · KYU**의 개인 포트폴리오 홈페이지입니다. 바다의 깊이와 창작의 자유를 딥블루·라임 팔레트, 큰 타이포그래피, 수중 일러스트로 표현합니다.

이 저장소는 **2026-10-31 기준 사용자가 선택한 초기 시안**을 보존하고, 이후 개발의 기준점으로 사용합니다. `dist/`의 HTML·CSS·JavaScript는 기존 Sites 배포 소스와 바이트 단위로 동일하게 가져왔습니다. 이번 저장에서는 시각 디자인이나 카피를 수정하지 않았습니다.

- **초기 버전:** `v0.1.0` (초기 시안 보존)
- **배포 사이트:** [KYU 포트폴리오](https://depth-and-imagination-portfolio-k7m4.merrybat41.chatgpt.site/) — 최초 배포 당시 소유자 전용 비공개
- **GitHub:** [diverkyu/personal-branding](https://github.com/diverkyu/personal-branding)

## 구성과 기능

| 섹션 | 내용 |
| --- | --- |
| Home | 영문 슬로건, 한국어 소개, 아치형 수중 SVG, 포트폴리오 이동 버튼 |
| About | 프리다이빙과 AI 창작을 연결하는 소개와 서명 |
| What I do | 프리다이빙 강사 / AI 크리에이터 소개와 이메일 문의 |
| Portfolio | 3개 콘셉트 카드, 전체·프리다이빙·AI 필터, 인스타그램 링크 |
| Contact | 이메일 링크, 주소 복사 및 결과 안내 |
| Footer | 활동명, 자동 갱신 연도, SNS, 맨 위로 이동 |

반응형 레이아웃, 키보드 포커스 표시, 필터의 `aria-pressed`, 복사 결과의 `role="status"`, 동작 줄이기 설정 대응을 포함합니다. 로그인·예약·결제·문의 데이터 저장 기능은 없습니다. 이메일 문의는 방문자의 메일 앱을 엽니다.

## 로컬 실행

별도의 패키지 설치나 빌드가 필요 없는 HTML/CSS/JavaScript 사이트입니다. Node.js가 설치된 환경에서:

```sh
git clone https://github.com/diverkyu/personal-branding.git
cd personal-branding
npm run dev
```

[http://127.0.0.1:5173](http://127.0.0.1:5173)을 엽니다. 종료는 `Ctrl+C`입니다. 포트를 변경하려면 `node scripts/serve.mjs 5180`을 실행합니다.

```sh
npm run check
```

이 명령은 사이트 스크립트와 로컬 서버 스크립트의 JavaScript 문법을 검사합니다. 전체 브라우저 테스트는 아닙니다.

Google Fonts에서 DM Sans / Noto Sans KR을 불러옵니다. 인터넷 연결이 없으면 시스템의 sans-serif 글꼴로 대체되므로 글자 폭과 줄바꿈이 달라질 수 있습니다. 이미지 파일이나 별도의 AI 생성 이미지 API는 사용하지 않습니다. 현재 비주얼은 인라인 SVG와 CSS로 구현되어 있습니다.

## 파일 구조

```text
dist/
  index.html              # 모든 섹션·카피·링크·수중 SVG
  style.css               # 색상·타이포그래피·레이아웃·반응형·CSS 아트
  app.js                  # 포트폴리오 필터·이메일 복사·연도 갱신
docs/
  DESIGN.md               # 디자인 방향·색상·레이아웃·인터랙션 명세
  COPY.md                 # 모든 카피 및 접근성·상태 문구
  STYLE-INVENTORY.md      # 원본 CSS 규칙·색상 / SVG 속성 기록
  BASELINE.md             # 초기 버전 이력·원본 해시·검증 범위
scripts/
  serve.mjs               # 의존성 없는 로컬 정적 서버
.openai/hosting.json      # 기존 Sites 식별자 및 dist 배포 경로
CHANGELOG.md              # 변경 이력
package.json              # 로컬 실행 및 문법 검사 명령
```

## 디자인과 콘텐츠 기준

- [디자인 명세](docs/DESIGN.md): 딥블루 `#071e29`, 라임 `#d6f48a`, 아이보리 `#f4f4ec`를 중심으로 구성합니다.
- [전체 카피](docs/COPY.md): 문구와 줄바꿈, 링크 목적지, 동적 안내 문구를 보존합니다.
- [상세 스타일 목록](docs/STYLE-INVENTORY.md): 실제 소스에서 추출한 값으로 정확한 시안 복원을 돕습니다.
- [초기 버전 기록](docs/BASELINE.md): 출처·파일 해시·검증 한계를 기록합니다.

포트폴리오의 세 카드는 **실제 실적이나 AI 생성 작업물이 아닌 디자인용 콘셉트 미리보기**입니다. 실제 사진·영상·작품으로 교체할 때 제목, 카테고리, 설명, 대체 텍스트를 함께 수정하고 콘셉트 표기를 검토하세요. 강사 자격, 경력, 수상·고객·후기 등 제공되지 않은 이력은 작성하지 않았습니다.

## 이후 개발

1. `v0.1.0` 태그를 초기 시안 기준점으로 유지합니다.
2. 새 브랜치에서 수정하고 로컬 화면과 실제 기능을 확인합니다.
3. 카피나 디자인 변경 시 관련 문서와 `CHANGELOG.md`를 함께 갱신합니다.
4. 실제 작품·프로필 사진·활동 이력을 추가하고 모바일 가독성을 확인합니다.

초기 시안으로 돌아가 확인하려면 `git switch --detach v0.1.0`을 사용합니다. 새 작업을 시작하려면 `git switch -c feature/your-change v0.1.0`을 사용합니다.

## 배포

정적 배포 루트는 `dist/`입니다. `.openai/hosting.json`은 기존 Sites 프로젝트를 가리키며 비밀번호나 토큰은 포함하지 않습니다. 인증은 별도이며 이 파일만으로 배포할 수 없습니다. GitHub에 푸시하는 것만으로 Sites가 자동 업데이트되도록 설정하지 않았습니다. 이 저장 작업에서 GitHub Pages, 새 도메인, 공개 범위 변경은 설정하지 않았습니다.

## 연락처

- 이름 / 활동명: 이동규 / KYU
- 이메일: [energizer629@naver.com](mailto:energizer629@naver.com)
- Instagram: [@hiitskyu](https://www.instagram.com/hiitskyu/), [@aikyupd](https://www.instagram.com/aikyupd/)

## 이용 및 권리

별도의 오픈소스 라이선스는 지정하지 않았습니다. 브랜드·콘텐츠의 재사용 조건은 소유자가 정합니다. 화면의 `KYU®`는 초기 시안에 포함된 표기를 그대로 보존한 것으로, 상표 등록 여부를 검증한 표시는 아닙니다. 공개 배포 전에 적절성을 검토할 수 있습니다.
