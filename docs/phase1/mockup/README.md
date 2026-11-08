# 화면 시안 (Phase 1)

문서 버전 0.9.0 · 2026-11-08 · [CONCEPT.md](../CONCEPT.md)의 사이트 구조와 톤 가이드를 화면으로 옮긴 시안이다.

## 보는 법

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
| `canvas.json` | 캔버스 배치 정보 |

## 주의

- 일정, 장소, 후기, 글 제목, 이메일은 **자리표시**다. 실제 콘텐츠가 아니며 후기 원문은 만들지 않았다.
- 색상, 확정 카피는 기존 시안(v0.1.0)을 따른다. 글꼴 일부(Georgia → Lora), 아이콘(글자 기호 → Lucide), 로고 `®` 제거는 0.8.0에서 바뀌었다.
- 모바일 시안(`HomeMobile`)은 폭이 맞지 않아 글자가 잘리는 곳이 있다. 추후 수정 예정이다.
- 사용 리소스(글꼴, 아이콘)의 라이선스는 [CONCEPT §7.8](../CONCEPT.md)에 있다.
