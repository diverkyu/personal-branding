@AGENTS.md

## 보안 점검 플러그인 (요약 — 자세히는 AGENTS §9)

- 작업 시작 시 `security-guidance` 가 켜져 있는지 확인한다. 꺼져 있으면 코드를 고치기 전에 사용자에게 알린다.

  ```bash
  claude plugin list | grep -A3 security-guidance   # Status: ✔ enabled 이어야 한다
  ```

- 경고·검토 결과(고침 / 문제 아님과 근거 / 발견 없음 / 미검증)를 PR "검증"에 적는다.
- 경고를 끄는 환경변수·설정 변경, 경고를 피하려는 코드 모양 바꾸기를 하지 않는다.

## 디자인 플러그인 (요약 — 자세히는 AGENTS §10)

- `frontend-design` 은 새 화면·큰 개편·디자인 점검에만 쓴다. 버그성 화면 수정에는 쓰지 않는다.
- DESIGN-SYSTEM 의 토큰·컴포넌트가 우선이다. 새 색·글꼴·컴포넌트는 시안 → 규강 결정 → DESIGN-SYSTEM 반영 뒤에 쓴다.
- 글꼴은 상업 이용이 명확하고 자체 호스팅 가능한 것만.
- 수정 전후를 390/768/1440 같은 조건으로 캡처해 PR 에 붙인다.

  ```bash
  claude plugin list | grep -A3 frontend-design   # Status: ✔ enabled 이어야 한다
  ```
