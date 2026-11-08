/** 서버에서 확인된 관리자. requireAdmin() 만 만들어 낸다 — 어드민 데이터 함수는 이 값을 받아야 호출할 수 있다 (ADMIN-DESIGN §4.4). */
export interface AdminSession {
  userId: string;
  name: string;
  email: string;
}
