# KYU 초기 시안 디자인 명세

기준 버전: **v0.1.0**, 기록일: **2026-10-31 (Asia/Seoul)**. 정확한 구현은 `dist/index.html`, `dist/style.css`, `dist/app.js`가 기준입니다. 아래는 현재 구현의 설명이며 미래 기능 제안이 아닙니다.

## 1. 브랜드와 시각 방향

프리다이빙 강사와 AI 크리에이터라는 두 정체성을 **깊이 / 상상 / 호기심**으로 연결합니다. 핵심 문장은 “Dive deeper. Create beyond.”입니다. 바다의 고요함을 짙은 청록 배경과 넓은 여백으로, 창작의 에너지를 라임 강조색과 추상적인 입체 형태로 표현합니다.

큰 영문 제목, 한국어 소개, 작은 대문자 섹션 번호를 조합한 편집 디자인입니다. 어두운 섹션과 밝은 섹션이 교차하며 긴 한 페이지를 읽는 리듬을 만듭니다. 얇은 구분선, 거의 각진 버튼, 둥근 필터 버튼을 사용합니다. Hero만 아치형 프레임을 사용해 시각적 중심을 만듭니다.

## 2. 기본 팔레트

| 토큰 / 값 | 역할 |
| --- | --- |
| `--navy: #071e29` | 본문 배경, 밝은 섹션의 글자, 선택된 필터 |
| `--lime: #d6f48a` | Hero 강조 단어, CTA, 구분 띠, 분야 아이콘, Contact 강조 |
| `--paper: #f4f4ec` | 어두운 배경의 본문, About·Portfolio 배경 |
| `--muted: #a0b4ba` | 어두운 영역의 보조 문구 |
| `#10333b` | Contact 배경 |
| `#52666a`, `#536a6a`, `#637774`, `#687d7d` | 밝은 영역의 설명·라벨 |
| `#80918e` | About 제목의 두 번째 줄, SNS 밑줄 |
| `#b5c8c6` | Contact 설명·복사 버튼 |
| `#79b5ff` | 키보드 포커스 외곽선 |
| `#e6ffb3` | Hero CTA hover 배경 |
| `#69a5a1` | Footer·SNS 링크 hover |
| `#ffffff24`, `#ffffff40` | 어두운 배경의 구분선 |
| `#bdc8c3`, `#809b98` | 필터 테두리 / 이메일 밑줄 |

그라디언트, 그림자, 투명도를 포함한 모든 색상은 [STYLE-INVENTORY.md](STYLE-INVENTORY.md)에 원본 규칙과 함께 기록합니다. 8자리 HEX의 마지막 두 자리는 알파 값입니다.

## 3. 타이포그래피

- 기본 글꼴: `'DM Sans', 'Noto Sans KR', sans-serif`. Google Fonts 원격 CSS 사용.
- `beyond.`: Georgia serif, italic, weight 400, 라임색.
- 기본 제목 weight 500. 로고 weight 700, 본문은 기본 400.
- Hero h1: `clamp(46px, 5.7vw, 90px)`, line-height 1.06, letter-spacing -4px, nowrap.
- h2: `clamp(30px, 3.6vw, 56px)`, line-height 1.35, letter-spacing -2px.
- Contact h2: `clamp(55px, 7vw, 105px)`, line-height 1.15, letter-spacing -4px.
- 분야 영문 제목: 35px / 1.1, letter-spacing -1px.
- Hero 한국어 카피: 23px / 1.6, 설명: 13px / 1.95.
- 섹션 라벨: 10px, weight 600, letter-spacing 2px.
- 카드 제목 17px, 카드 메타데이터 8px / letter-spacing 1px.
- 로고 34px / letter-spacing -2px, 우측 위 `®` 11px.

## 4. 섹션 순서와 데스크톱 레이아웃

| 순서 | 영역 | 배경 / 레이아웃 |
| --- | --- | --- |
| 1 | Header | navy, 높이 92px, 좌우 5%, 로고 / 메뉴 / 연락 링크 3분할 |
| 2 | `#home` Hero | navy, 상단 65px·좌우 5%, `1.15fr 1fr` 그리드, gap 4% |
| 3 | Ticker | lime, 상하 24px, 한 줄 영문 문구, 가로 초과 부분 숨김 |
| 4 | `#about` | paper, 섹션 라벨 : 내용 = `1fr 2fr`, gap 40px |
| 5 | `#practice` | navy, 소개 : 분야 = `1fr 1.5fr`, gap 65px |
| 6 | `#work` | paper, 헤딩 + 설명, 필터, 3열 갤러리, SNS |
| 7 | `#contact` | 청록, 큰 한국어 제목, 설명 / 이메일, 우측 복사 버튼 |
| 8 | Footer | navy, 좌우 5%·상하 35px, 로고·저작권·SNS·위로 이동 |

공통 `.section`은 상하 110px / 좌우 7%입니다. Header는 고정·sticky가 아닙니다. `scroll-padding-top: 85px` 및 부드러운 앵커 이동을 사용합니다. 화면 폭 1600px 이상에서는 body 최대 폭 1800px, 가로 중앙 정렬입니다.

About 설명은 2열 / gap 35px입니다. 분야 소개는 2열 / gap 40px이며 카드 위·아래에 선을 사용합니다. 갤러리는 동일한 폭의 3열 / gap 24px, 아트 높이 370px입니다. 필터는 pill 모양으로 radius 30px, padding 10px 20px입니다. Hero CTA는 radius 2px, padding 17px 23px입니다.

## 5. 비주얼 제작 방식

### Hero 수중 일러스트

인라인 SVG (`viewBox="0 0 640 780"`)입니다. 별도 사진을 다운로드하거나 AI 이미지 생성 모델을 사용하지 않았습니다. 상단 양쪽 모서리를 46% 반경으로 잘라 아치 형태를 만들며 높이는 최소 560px·최대 650px입니다.

- 청록에서 딥블루로 내려가는 바다 그라디언트: `#8dbdb4` → `#267786` → `#062432`.
- 방사형 빛, 블러 처리한 사선 광선, 물결 선, 기포를 배치합니다.
- 다이버는 path·ellipse 실루엣이며 `translate(340 365) rotate(-29)`로 배치합니다.
- 상단 `01 / INTO THE BLUE`, 하단 한국어 문장과 화살표, 구석에 `CONCEPT VISUAL`을 표시합니다.
- SVG의 정확한 도형 데이터는 `dist/index.html`에 보존합니다.

### 포트폴리오 콘셉트 카드

| 카드 | 표현 / 구현 | 실제 작품 여부 |
| --- | --- | --- |
| Into the blue | 바다색 radial-gradient, 동심원 테두리·그림자, `rotateX(45deg)` | 콘셉트 |
| Beyond the ordinary | 회녹색 바탕, 다색 radial-gradient로 만든 구체, 바닥·내부 그림자 | 콘셉트 |
| Ocean × Imagination | 라벤더·청록 배경, 라임 타원형 테두리, 35도 회전, 안팎 그림자 | 콘셉트 |

세 카드 모두 `CONCEPT PREVIEW`를 표시합니다. 카드가 클릭되어 상세 화면이나 영상으로 이동하는 동작은 없습니다. hover 시 -5px 올라갑니다. Ticker는 정적 띠이며 자동으로 흐르는 애니메이션은 없습니다.

## 6. 반응형 규칙

CSS는 기본 규칙 다음에 아래 조건을 순서대로 적용합니다.

| 화면 폭 | 변경 |
| --- | --- |
| ≤1000px | Hero gap 20px, h1 58px; Practice 외부 1열·gap 45px; 분야 제목 줄바꿈 숨김; 아트 높이 300px; About `1fr 2.5fr`; Work 헤딩·Contact 하단 블록 배치 |
| ≤680px | Header 76px / 좌우 6%; 메뉴의 What I do 숨김; Hero 1열; h1 `clamp(43px,10.8vw,70px)`; Hero 일러스트 440px / 상단 반경 45%; 섹션 padding 70px 7%; About와 설명 1열; Practice 내부 2열 유지·gap 24px; 갤러리 1열·카드 최대 폭 480px·아트 390px; Footer 줄바꿈 |
| ≥1600px | body 최대 폭 1800px / 중앙 정렬 |

모바일에서 Hero 한국어는 21px, 소개는 12px, 분야 제목은 27px, 이메일은 19px입니다. 모바일의 구체는 230px로 확대됩니다. 상세한 override는 스타일 목록이 기준입니다.

## 7. 인터랙션과 접근성

- 네비게이션·CTA는 동일 페이지의 `#home`, `#about`, `#practice`, `#work`, `#contact`로 이동합니다.
- 필터: All=전체 3개, Freediving=ocean 1개, AI Creative=ai 2개. `hidden`과 `aria-pressed`를 갱신합니다.
- 이메일 주소 복사: Clipboard API 사용. 성공·실패를 `role="status"`에 출력하며 실패 시 주소를 직접 선택해 복사하도록 안내합니다.
- 메일 링크는 `mailto:`이며 프리다이빙 / AI 협업 링크에는 각각 제목이 들어갑니다.
- SNS는 새 탭으로 열고 `rel="noopener noreferrer"`를 지정합니다. 두 계정의 역할을 임의로 특정하지 않았습니다.
- Footer 연도는 방문자의 현재 연도로 자동 갱신합니다.
- 링크·버튼 포커스는 3px 파란 외곽선 / offset 6px입니다.
- `prefers-reduced-motion: reduce`에서는 부드러운 스크롤과 transition을 끕니다.
- 주 메뉴, 필터, 홈 로고에 접근성 이름이 있고 SVG에는 `role="img"`와 설명이 있습니다. Ticker는 보조 장식으로 `aria-hidden="true"`입니다.

## 8. 보존 및 다음 작업 시 주의점

이 버전은 사용자가 선택한 시안을 기록합니다. 실제 작품·프로필 사진, 자격·경력 정보는 아직 반영되지 않았습니다. 색상 대비·모바일 줄바꿈·터치 영역에 대한 전체 브라우저 검증은 수행되지 않았으므로 검증 완료로 해석하지 않습니다. `KYU®` 역시 원본의 표기를 보존했으며 상표 등록 사실을 뜻하지 않습니다.

비주얼을 실제 작업물로 교체할 때도 “고요한 바다 + 자유로운 상상”의 방향, 배경의 밝고 어두운 리듬, 과도한 장식을 피한 여백을 기준으로 삼을 수 있습니다.
