"use client";

/** 루트 레이아웃 자체가 실패했을 때의 마지막 화면. 글꼴·스타일 시트에 기대지 않고 직접 꾸민다. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, background: "#071e29", color: "#f4f4ec", fontFamily: "system-ui, sans-serif", padding: "80px 5%" }}>
        <h1 style={{ fontSize: 32, fontWeight: 500 }}>문제가 생겼습니다. 잠시 후 다시 시도해주세요.</h1>
        <p>
          <button type="button" onClick={reset} style={{ minHeight: 44, padding: "0 20px", background: "none", color: "#d6f48a", border: "1px solid #d6f48a", cursor: "pointer" }}>
            다시 시도
          </button>{" "}
          {/* 레이아웃이 깨진 상태이므로 클라이언트 라우터 대신 전체 새로고침으로 이동한다 */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" style={{ color: "#d6f48a", display: "inline-block", minHeight: 44, lineHeight: "44px" }}>
            홈으로
          </a>
        </p>
      </body>
    </html>
  );
}
