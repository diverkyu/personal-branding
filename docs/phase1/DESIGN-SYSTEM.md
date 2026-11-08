# KYU 디자인 시스템 — Phase 1

| 문서 버전 | 최종 수정 | 상태 | 작성 |
| --- | --- | --- | --- |
| **0.19.2** | 2026-11-08 | 초안 (규강 검토 전) | 규강 + Claude |

변경 이력: [CHANGELOG.md](CHANGELOG.md) · 짝 문서: [CONCEPT.md](CONCEPT.md) · 화면 시안: [mockup/](mockup/README.md) · 시각 보기: 캔버스의 "디자인 시스템" 보드

## 1. 목적과 원칙

화면 시안 6개에서 반복해 쓴 요소를 **토큰(값)** 과 **컴포넌트(조각)** 로 정리해, 개발 단계에서 같은 모양을 한 곳에서 관리하게 한다. 스택이 정해지지 않았으므로 이 문서는 **프레임워크와 무관한 명세**다. 구현은 CSS 변수와 컴포넌트로 옮긴다.

- 기존 시안(v0.1.0, [DESIGN.md](../DESIGN.md))의 브랜드 방향을 바꾸지 않는다: 딥블루, 라임, 페이퍼, 큰 타이포, 여백
- 화면 시안에서 **실제로 쓴 값만** 정리한다. 새 값은 만들지 않고, 흩어진 값은 §6의 기준으로 통일한다
- 카피와 문체는 [CONCEPT §7](CONCEPT.md)을 따른다. 이 문서는 시각만 다룬다

## 2. 토큰

### 2.1 색상

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--kyu-navy` | `#071e29` | 기본 어두운 배경, 밝은 배경의 글자와 선택된 칩 |
| `--kyu-teal` | `#10333b` | Contact 배경, 어두운 카드 안의 입력창 |
| `--kyu-lime` | `#d6f48a` | 주요 버튼, 강조 단어, 활성 칩, 상태 뱃지 |
| `--kyu-paper` | `#f4f4ec` | 밝은 섹션 배경, 어두운 배경 위 본문 |
| `--kyu-white` | `#ffffff` | 후기 카드·어드민 카드 배경 |
| `--kyu-muted` | `#a0b4ba` | 어두운 배경 위 보조 글자 |
| `--kyu-ink-sub` | `#52666a` | 밝은 배경 위 보조 글자와 라벨 |
| `--kyu-ink-faint` | `#687d7d` | 큰 제목의 두 번째 줄 (24px 이상에서만) |
| `--kyu-line` | `#bdc8c3` | 밝은 배경 위 구분선·테두리 |
| `--kyu-line-dark` | `#ffffff24` | 어두운 배경 위 구분선 |
| `--kyu-line-dark-strong` | `#ffffff40` | 어두운 배경 위 칩·입력 테두리 |
| `--kyu-teal-text` | `#b5c8c6` | Contact 영역의 설명 글자 |
| `--kyu-focus` | `#79b5ff` | 키보드 포커스 외곽선 (3px, offset 6px) |

**바다 그라디언트** (일러스트, 썸네일 자리표시): `#8dbdb4 → #267786 → #062432`. 썸네일은 이 색들을 조합한 `linear-gradient`만 쓴다. 실제 사진·영상이 들어오면 교체한다.

**대비 규칙**: 밝은 배경의 작은 글자는 `--kyu-ink-sub` 이상으로 진하게 쓴다. `--kyu-ink-faint`는 24px 이상 제목에만 쓴다. 라임 위의 글자는 `--kyu-navy`다.

### 2.2 타이포그래피

글꼴: `'DM Sans', 'Noto Sans KR', sans-serif`. 강조 단어(`beyond.`, 서명)만 `'Lora', serif` 이탤릭. 세 글꼴 모두 SIL OFL 1.1이다 ([CONCEPT §7.8](CONCEPT.md)). Georgia는 상용 폰트라 쓰지 않는다.

| 스타일 | 크기 | 굵기 | 행간 | 자간 | 쓰임 |
| --- | --- | --- | --- | --- | --- |
| Display | 88px | 500 | 1.06 | -4px | 홈 히어로 제목 |
| Contact Display | 105px | 500 | 1.15 | -4px | Contact 제목 |
| H1 | 72px | 500 | 1.2 | -3px | 페이지 제목 (Freediving, Story) |
| H2 | 56px | 500 | 1.35 | -2px | 섹션 제목 |
| H3 | 44px | 500 | 1.3 | -2px | 하위 섹션 제목 |
| H4 | 28px | 500 | 1.3 | -1px | 카드·폼 제목 |
| Title | 17–24px | 500 | 1.4 | -1px | 카드 안 제목 |
| Body | 16px | 400 | 1.9 | 0 | 본문 |
| Body S | 14px | 400 | 1.75 | 0 | 카드 요약, 보조 설명 |
| Caption | 12–13px | 400 | 1.7 | 0 | 메타 정보, 안내 |
| Label | 11px | 600 | 1.4 | 2px | 섹션 라벨 `01 / ABOUT KYU` (대문자) |
| Logo | 34px | 700 | 1 | -2px | `KYU` (상표 등록 전에는 `®` 없음) |

모바일은 Display 46px, H2 32px, Contact Display 55px를 기준으로 줄인다. 한 줄 제목은 `nowrap`을 피한다 (모바일에서 글자가 잘리는 원인).

### 2.3 간격·모양

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--kyu-section-y` | 110px (모바일 70px) | 섹션 위아래 여백. 하위 섹션은 100px |
| `--kyu-section-x` | 7% | 섹션 좌우 여백. 헤더·푸터는 5% |
| `--kyu-container` | 1296px | 본문 최대 폭. 전체 최대 1800px |
| `--kyu-gap` | 24px | 카드 사이 간격 |
| `--kyu-radius-btn` | 2px | 버튼 |
| `--kyu-radius-pill` | 30px | 칩 |
| `--kyu-radius-hero` | 46% 46% 0 0 | 히어로 아치 (히어로에서만) |

카드와 입력창은 모서리를 둥글리지 않는다 (각진 편집 디자인). 그림자는 쓰지 않고 선과 배경색 차이로 구분한다.

### 2.4 아이콘

**Lucide** (ISC, 상업 이용 가능)를 쓴다. 2026-11-08 결정.

| 항목 | 값 |
| --- | --- |
| 모양 | 24px 격자, 선 **1.5px**, 둥근 끝(`round`), 채움 없음 |
| 크기 | 16 / 20 / 24px. 버튼 안 아이콘은 글자 크기(1em)에 맞춘다 |
| 색 | `currentColor`. 글자색을 그대로 따른다 |
| 접근성 | 장식용은 `aria-hidden="true"`, 아이콘만 있는 버튼은 `aria-label` |
| 금지 | 글자 기호(`↗ ⧉ ☰ ↑ ↓`)로 아이콘을 대신하지 않는다 |

글자 기호 → 아이콘 대응: `↗` → `arrow-up-right`, `⧉` → `copy`, `☰` → `menu`, `↑` → `arrow-up`, `↓` → `arrow-down`. 기존 v0.1.0의 분야 아이콘 `≈`, `✳`은 `anchor`, `sparkles`로 대체할 것을 제안한다 (미확정).

시안에서 쓴 아이콘: `arrow-up-right`, `arrow-up`, `arrow-down`, `menu`, `x`, `chevron-right`, `external-link`, `copy`, `mail`, `check`, `calendar`, `map-pin`, `play`, `shopping-bag`, `tag`, `search`, `user`, `pencil`, `trash`, `image`. 캔버스 "디자인 시스템" 보드 5번에서 볼 수 있다.

## 3. 컴포넌트

이름은 구현 단계의 컴포넌트 이름 후보다.

### 3.1 레이아웃

| 컴포넌트 | 구성 | 변형 |
| --- | --- | --- |
| `SiteHeader` | 로고, 메뉴(About · Story · Freediving), Contact + `arrow-up-right` 아이콘. 높이 92px (모바일 76px, 메뉴 버튼으로 접힘) | 현재 메뉴 강조 = 라임 + 밑줄 |
| `SiteFooter` | 로고, 저작권, 링크, BACK TO TOP ↑ | 어두운 배경 고정 |
| `Section` | 배경, 위아래·좌우 여백, 컨테이너 | `dark`(navy), `light`(paper), `teal` |
| `SectionHeader` | `SectionLabel` + 제목 + 보조 문구(선택) + 우측 링크(선택) | 제목 단계 H2 / H3 |
| `SectionLabel` | `01 / ABOUT KYU` 형식. 번호는 메뉴 순서 | 어두운/밝은 배경 색 자동 |

### 3.2 행동·상태

| 컴포넌트 | 설명 | 변형·상태 |
| --- | --- | --- |
| `Button` | 주요 행동 | `primary`(라임 채움), `outline`(라임 테두리), `dark`(navy 채움, 어드민), `ghost-underline`(밑줄 링크). 크기 L(높이 52) / M(높이 48) / S(높이 44). hover 시 투명도 .78, focus 시 `--kyu-focus` |
| `TextLink` | 문장 끝 이동 링크 (끝에 `arrow-up-right` 아이콘) | 밑줄 1px, 굵기 700 |
| `FilterChip` | 카테고리·상태 필터 | `active`(라임 또는 navy 채움) / `inactive`(테두리). 어두운/밝은 배경 변형 |
| `StatusBadge` | 상태 표시 | 투어 `모집 중`(라임 채움) · `모집 예정`(테두리) · `마감` · `종료`(회색), 어드민 `발행`(라임) · `임시저장`(테두리) · `신규`(라임) |

### 3.3 카드

| 컴포넌트 | 구성 | 사용처 |
| --- | --- | --- |
| `StoryCard` | 썸네일(높이 240) → 날짜 → 제목 → 요약 | 홈, Story 목록 |
| `StoryFeatured` | 좌 이미지 + 우 텍스트(제목, 요약, 읽기 ↗) | Story 최신 글 |
| `TourCard` | `StatusBadge` + 투어명 + 일정·장소·정원 + 버튼 | 홈, Freediving. 변형: 큰 카드(좌 이미지), 홈 요약 카드 |
| `TourArchiveCard` | 썸네일(높이 200) → 상태 문구 → 제목 | 지난 투어 |
| `EquipmentCard` | 썸네일 → 카테고리 → 장비명 → 추천 이유 → 행동 버튼 | 행동 변형: `구매처 보기 ↗` / `문의하기` / 없음 / 제휴 고지 추가 |
| `ReviewCard` | 인용문(원문 그대로) + 수강생 표기·작성일·투어 | 홈, 투어 상세, Freediving, 후기 전체. 원문을 가공하지 않는다 |
| `InfoRow` | 라벨 + 값 (일정, 장소, 모집 상태, 정원) | 투어 상세 |

### 3.4 폼

| 컴포넌트 | 설명 |
| --- | --- |
| `TextField` | 라벨 + 입력(높이 44). 어두운 폼 카드 안 기준: 배경 `--kyu-teal`, 테두리 `--kyu-line-dark-strong` |
| `Textarea` | 위와 동일, 4줄 |
| `Checkbox` | 20px, 동의 문구와 함께. 개인정보 동의에 사용 |
| `FormNotice` | 폼 아래 안내 (결제·확정 아님 등) |

모든 입력에는 `label`을 연결한다. 오류·성공 메시지는 `role="status"`로 알린다 (기존 복사 안내와 같은 방식).

### 3.5 어드민 (공개 사이트와 톤 분리)

| 컴포넌트 | 설명 |
| --- | --- |
| `AdminSidebar` | 폭 240, navy 배경, 현재 메뉴는 라임 채움 |
| `StatCard` | 라벨 + 큰 숫자 (흰 카드, 연한 테두리) |
| `DataTable` | 헤더 12px 회색, 행 구분선, 상태는 `StatusBadge` |
| `EditorPanel` | 툴바 + 본문 + 저장·발행 버튼 |

어드민은 기능성이 우선이며 공개 사이트의 큰 타이포를 쓰지 않는다. 색상 토큰과 `StatusBadge`, `Button`은 공유한다.

## 4. 반응형 규칙

| 폭 | 규칙 |
| --- | --- |
| ≥1600px | 전체 최대 폭 1800px, 중앙 정렬 |
| 1000–1599px | 기본 규칙 |
| ≤1000px | 카드 3열 → 2열, 히어로 간격 축소 |
| ≤680px | 1열, 섹션 위아래 70px, 헤더 76px, 제목 크기 축소, 카드 최대 폭 480px, 터치 영역 44px 이상 |

카드 묶음은 `flex-wrap`과 `min-width: 0`을 기본으로 한다 (줄바꿈 가능, 내용이 넘쳐 잘리지 않게).

## 5. 접근성 기준

- 일반 글자 대비 4.5:1 이상, 24px 이상 큰 글자 3:1 이상
- 모든 상호작용 요소는 키보드로 접근되고 포커스가 보인다 (`--kyu-focus`)
- 아이콘·기호만 있는 버튼에는 `aria-label`
- 상태는 색만으로 구분하지 않는다 (글자 라벨을 함께 쓴다)
- `prefers-reduced-motion: reduce`에서 전환과 부드러운 스크롤을 끈다

## 6. 시안에서 발견한 불일치와 통일 기준

화면 시안 6개를 만들며 값이 조금씩 달랐던 곳을 아래 기준으로 통일한다. (시안 자체는 아직 고치지 않았다.)

| 항목 | 시안에서 쓴 값 | 통일 기준 |
| --- | --- | --- |
| 버튼 높이·패딩 | `17×23`, `15×22`, `10×16`, `11×18`, 높이 48/52 | L 52 / M 48 / S 44 세 가지만 |
| 라벨 크기 | 11px, 12px, 13px 혼용 | Label 11px(대문자 섹션 라벨), Caption 12px(메타) |
| 카드 썸네일 높이 | 260, 240, 220, 200, 180 | StoryCard 240, TourArchiveCard 200, EquipmentCard 180 (카드 종류별 1개) |
| 섹션 위아래 여백 | 110, 100, 90, 70 | 110 (하위 섹션 100, 모바일 70) |
| 칩 크기 | 10×20, 8×16 | 10×20 |
| 투어 제목 크기 | 24, 28 | 카드 안 Title 24, 폼·상세 H4 28 |
| 인용 카드 패딩 | 24, 28, 22 | 28 (모바일 22) |

## 7. 구현 시 메모

- 토큰은 CSS 변수로 한 파일에 둔다. 값은 `docs/DESIGN.md`와 이 문서가 기준이며, 코드의 색상 직접 입력을 금지한다
- 글꼴은 자체 호스팅 여부를 호스팅 결정 후 정한다 ([CONCEPT §7.8](CONCEPT.md))
- 컴포넌트 단위로 `app/`에 구현하고, 스토리북 등 별도 도구 도입은 스택 확정 후 판단한다
- 모바일 시안의 잘림 문제는 §2.2의 `nowrap` 지양, §4의 `min-width: 0` 규칙으로 해결한다

## 8. 서드파티 리소스와 라이선스 고지

| 리소스 | 라이선스 | 고지 의무 |
| --- | --- | --- |
| DM Sans | SIL OFL 1.1 | 글꼴 파일을 직접 배포(자체 호스팅)하면 저작권 고지와 OFL 사본을 함께 둔다 |
| Noto Sans KR | SIL OFL 1.1 | 위와 동일 |
| Lora | SIL OFL 1.1 | 위와 동일. 수정본은 Reserved Font Name 'Lora'를 쓸 수 없다 |
| Lucide | ISC (일부 MIT) | 소스에 포함되는 복사본에 저작권·허가 문구를 유지한다 |

구현 시 저장소 루트에 `THIRD-PARTY-NOTICES`(또는 `app/` 안)를 두고 위 항목의 저작권 문구와 라이선스 전문을 모은다. 세부 내용은 [CONCEPT §7.8](CONCEPT.md). 판매하는 상품에 들어가는 이미지·폰트도 같은 기준(상업 이용 가능 여부 확인)을 적용한다.

## 9. 구현 현황 (`app/`)

컴포넌트 이름은 §3의 후보 이름과 같다. 모양은 개발용 쇼케이스(`/dev/components`)에서 상태별로 확인한다 (운영에서는 기본 404, `ENABLE_COMPONENT_SHOWCASE=on`일 때만 열림).

| 컴포넌트 | 위치 | 상태 |
| --- | --- | --- |
| `Button` (primary / outline / dark, L·M·S, 링크·버튼 겸용, busy) | `components/ui/Button` | 구현 (단계 2) |
| `TextLink` | `components/ui/TextLink` | 구현 (단계 2) |
| `FilterChip`, `FilterChipGroup` (`aria-pressed`) | `components/ui/FilterChip` | 구현 (단계 2) |
| `StatusBadge` (7가지 상태, 글자 표시) | `components/ui/StatusBadge` | 구현 (단계 2) |
| `Section`, `SectionHeader`, `SectionLabel` | `components/ui/Section`, `SectionHeader` | 구현 (단계 2) |
| `TextField`, `Textarea`, `Checkbox`, `FormNotice` | `components/ui/Field` | 구현 (단계 2) |
| `Icon` (Lucide 20개), `SmartLink`, `Thumb` | `components/ui/` | 구현 (단계 2) |
| `StoryCard` (큰 카드 포함), `TourCard`, `TourArchiveCard`, `EquipmentCard`, `ReviewCard`, `InfoRow` | `components/site/` | 구현 (단계 2) |
| `SiteHeader` (데스크톱 메뉴·Freediving 하위 메뉴·모바일 패널), `SiteFooter`, `SkipLink`, `Logo`, `BackToTop` | `components/layout/` | 구현 (단계 3) |
| `AdminSidebar`, `StatCard`, `DataTable`, `EditorPanel` | — | 대기 (어드민 단계) |

**구현하면서 정한 것**
- 카드는 제목 링크를 카드 전체로 넓힌다 (stretched link). 카드 전체를 `<a>`로 감싸지 않아 스크린리더가 제목만 링크 이름으로 읽는다. 장비 카드의 행동 버튼은 카드 링크 위에 떠서 따로 눌린다.
- `TourCard`는 남색 카드라서 **밝은(페이퍼) 섹션 위에 놓는다.** 어두운 섹션에 두면 경계가 사라진다.
- `SmartLink`는 http(s) 링크를 새 탭 + `rel="noopener noreferrer"`로 열고, `javascript:`·`data:` 같은 스킴은 `#`으로 바꿔 렌더링하지 않는다 ([SECURITY §5](SECURITY.md)).
- 후기 카드는 원문을 가공 없이(`white-space: pre-line`, HTML 이스케이프) 보여 주고 평점 요소가 없다 ([SCREEN-SPEC §12](SCREEN-SPEC.md) 결정 4).
- 날짜·정원 같은 표시 문구는 컴포넌트가 만들지 않고 호출하는 쪽이 넘긴다 (데이터 계층이 정해지면 형식을 한 곳에서 정한다).
- **레이아웃(단계 3)**: 루트 레이아웃이 `SkipLink → SiteHeader → <main id="main"> → SiteFooter`를 감싼다. 각 페이지는 `<main>`을 다시 만들지 않고 `h1`만 하나 둔다. 메뉴 순서·하위 항목·푸터 링크는 `src/config/nav.ts`가 단일 출처다.
- Freediving 하위 메뉴(INT-02)는 호버·포커스로 열리고 150ms 지연 뒤 닫힌다. 링크 옆 토글 버튼(`aria-expanded`)을 누르면 열린 채로 **고정**되어 터치·키보드에서도 쓸 수 있고, ESC·바깥 포커스·다시 누르기로 닫는다.
- 모바일 메뉴(INT-01)는 680px 이하에서 패널로 열린다. 포커스를 가두고(MENU/CLOSE 버튼 포함), ESC·배경 클릭·항목 선택으로 닫히며, 닫히면 포커스가 버튼으로 돌아가고 본문 스크롤 잠금이 풀린다. 화면이 넓어지면 자동으로 닫는다.
- 404(`not-found.tsx`)와 오류(`error.tsx`, `global-error.tsx`)는 SCREEN-SPEC GL-ST 문구를 쓴다. 오류 상세는 화면에 쓰지 않고 `instrumentation.ts`의 `onRequestError`가 `request.error` 로그(오류 종류·digest·경로)로 남긴다.
- 푸터 SNS 링크(GL-F3)는 사이트 설정이 생기기 전까지 `SOCIAL_LINKS`가 비어 있어 표시되지 않는다. 저작권 연도는 렌더 시점 값이라 정적 페이지는 빌드한 해로 굳는다.
- 메뉴가 가리키는 페이지는 4단계에서 모두 생겼다 (미리 불러오기 404 예외와 현재 페이지 E2E 보류는 해소).

**페이지 틀(단계 4)에서 정한 것**
- 콘텐츠는 `src/data/`(읽기 입구)와 `src/types/content.ts`(스키마)를 거친다. 지금은 가상 데이터(`fixtures.ts`, 이름에 "(예시)")이며 저장소가 정해지면 `data/index.ts` 구현만 바꾼다. 날짜 표기는 `lib/format.ts` 한 곳.
- 카드의 제목 수준은 `headingLevel`(2 또는 3, 기본 3)로 정한다. 페이지 제목(h1) 바로 아래에 카드가 오면 2를 넘겨 **제목 단계를 건너뛰지 않는다** (E2E가 모든 화면을 검사).
- 칩 필터(`FilteredList`)는 선택을 URL 쿼리(`?tag=`, `?category=`, `?status=`, `?tour=`)에 남기고, 알 수 없는 값은 "전체"로 처리한다.
- 현재 메뉴 표시: 상세 페이지에서도 해당 메뉴를 라임색으로 강조(`data-current`)하고, `aria-current="page"`는 정확히 그 페이지일 때만 붙인다.
- 장비 카드는 어두운 배경용이다. 밝은 섹션에서는 쓰지 않는다 (상세 페이지의 "다른 장비"는 어두운 섹션).
- Contact 영역은 홈 하단과 `/contact`가 같은 컴포넌트(`ContactSection`)를 쓰고, 연락 주소는 예약 도메인 `contact@example.com` 자리표시다 (실수로 실제 메일이 나가지 않음).

**4단계에서 남겼던 것**: 폼은 0.15.0, 나머지(페이지 이동, 더 보기, 갤러리·영상, 고정 문의 버튼, 장비 이미지 전환, 구조화 데이터)는 0.16.0에서 구현했다. 아직 없는 것은 미리보기 띠(INT-12)뿐이다. 시안과의 나란히 비교는 0.14.1에서 했다(CHANGELOG 참고).

**폼(단계 5)에서 정한 것**
- 폼 검증은 서버가 기준이다. 브라우저 기본 검증은 `noValidate`로 끄고, 서버가 돌려준 필드별 오류(`role="alert"`)를 입력과 `aria-describedby`로 연결한다. 오류가 있으면 첫 오류 필드로 포커스를 옮긴다.
- 허니팟은 `display:none`이 아니라 화면 밖(`left:-9999px`)에 두고 `aria-hidden`, `tabIndex=-1`로 사람·보조기기·키보드에 닿지 않게 한다.
- 저장소가 없을 때(`INQUIRY_STORE` 비어 있음) 폼은 접수된 것처럼 보이지 않고 실패 안내와 입력 보존으로 응답한다.

**미구현 요소(단계 6)에서 정한 것**
- 길어지는 목록은 `FilteredList`의 `pagination`으로 처리한다 (`pages` = 번호 이동 + URL, `more` = 더 보기). `wide` 항목(큰 카드)은 개수에 세지 않고 첫 페이지에만 보인다.
- 외부 영상은 눌러야 불러온다. 허용 도메인 목록(`lib/video.ts`)에 없는 주소는 아예 렌더링하지 않는다.
- 오버레이(갤러리 확대)는 포커스 가둠 대상에서 **화면에 보이는 버튼만** 센다 (좁은 화면에서 숨겨지는 버튼 때문에 Tab 이 새지 않게).
- 구조화 데이터는 화면에 있는 내용만 담는다. 가격·결제 정보가 없는 투어는 `offers`를 만들지 않고, 답변이 없는 "답하는 질문"은 FAQ 구조화 데이터로 만들지 않는다.
