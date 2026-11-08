# 화면 시안 (Phase 1)

문서 버전 0.14.0 · 2026-11-08 · [CONCEPT.md](../CONCEPT.md)의 사이트 구조와 톤 가이드를 화면으로 옮긴 시안이다.

## 보는 법

**로그인 없이 보기 (권장)**: [`kyu-mockup.html`](kyu-mockup.html) 파일 하나를 내려받아 더블클릭하면 브라우저에서 열린다. 모든 화면(홈 데스크톱·모바일, Freediving, 투어 상세, Story, 어드민, 디자인 시스템)을 상단 버튼으로 바꿔 볼 수 있고, 데스크톱 화면은 폭을 데스크톱 / 태블릿 / 모바일로 바꿔 볼 수 있다. Claude 계정이나 설치가 필요 없다. (글꼴을 불러오려면 인터넷 연결이 필요하다.) GitHub에서는 코드로 보이므로 **"Download raw file"로 내려받아 연다.**


- 온라인 시안: <https://claude.ai/artifact/3VHorbKS61EHt2SxVWwre2> (**비공개 링크**. 소유자가 공유해야 열린다)
- 이 폴더의 파일은 시안의 **원본 소스**다. `.dc.html`은 Claude 디자인 캔버스용 형식이라 `./support.js`(캔버스 런타임)가 없으면 브라우저에서 단독으로 열리지 않는다. 디자인 이력 보존용이며, 실제 사이트 코드는 `app/`에서 새로 만든다.

## 화면

| 파일 | 화면 |
| --- | --- |
| `Main.dc.html` | 홈 (데스크톱) |
| `HomeMobile.dc.html` | 홈 (모바일) |
| `Freediving.dc.html` | Freediving 허브: 투어, 장비, 후기 |
| `Tour.dc.html` | 투어 상세 + 예약 문의 폼 |
| `Story.dc.html` | Story 목록 |
| `Admin.dc.html` | CMS 어드민 대시보드 |
| `DesignSystem.dc.html` | 디자인 시스템 (토큰·컴포넌트 보기). 명세는 [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) |
| `kyu-mockup.html` | 위 화면을 한 파일로 묶은 뷰어 (로그인 불필요) |
| `build-standalone.py` | `.dc.html` 소스에서 `kyu-mockup.html`을 다시 만드는 스크립트 |
| `canvas.json` | 캔버스 배치 정보 |

## 주의

- 일정, 장소, 후기, 글 제목, 이메일은 **자리표시**다. 실제 콘텐츠가 아니며 후기 원문은 만들지 않았다.
- 색상, 확정 카피는 기존 시안(v0.1.0)을 따른다. 글꼴 일부(Georgia → Lora), 아이콘(글자 기호 → Lucide), 로고 `®` 제거는 0.8.0에서 바뀌었다.
- 모바일 시안(`HomeMobile`)은 폭이 맞지 않아 글자가 잘리는 곳이 있다. 추후 수정 예정이다.
- 사용 리소스(글꼴, 아이콘)의 라이선스는 [CONCEPT §7.8](../CONCEPT.md)에 있다.

## 뷰어 다시 만들기

시안(`.dc.html`)을 고친 뒤 아래 명령으로 `kyu-mockup.html`을 갱신한다. Python 3만 있으면 된다.

```bash
python3 docs/phase1/mockup/build-standalone.py docs/phase1/mockup docs/phase1/mockup/kyu-mockup.html
```
