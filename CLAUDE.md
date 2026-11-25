@AGENTS.md

## 보안 점검 플러그인 (요약 — 자세히는 AGENTS §9)

- 작업 시작 시 `security-guidance` 가 켜져 있는지 확인한다. 꺼져 있으면 코드를 고치기 전에 사용자에게 알린다.

  ```bash
  claude plugin list | grep -A3 security-guidance   # Status: ✔ enabled 이어야 한다
  ```

- 경고·검토 결과(고침 / 문제 아님과 근거 / 발견 없음 / 미검증)를 PR "검증"에 적는다.
- 경고를 끄는 환경변수·설정 변경, 경고를 피하려는 코드 모양 바꾸기를 하지 않는다.
