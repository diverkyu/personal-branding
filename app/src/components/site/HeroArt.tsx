/** 홈 히어로 수중 일러스트 (HOME-07). 직접 제작한 SVG라 라이선스 이슈가 없다 (CONCEPT §7.8). 아치 모양은 부모가 만든다. */
export function HeroArt() {
  return (
    <svg viewBox="0 0 640 780" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" role="img" aria-label="깊은 바닷속으로 내려가는 다이버의 콘셉트 일러스트">
      <defs>
        <linearGradient id="hero-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8dbdb4" />
          <stop offset=".45" stopColor="#267786" />
          <stop offset="1" stopColor="#062432" />
        </linearGradient>
        <radialGradient id="hero-glow" cx=".5" cy=".05" r=".6">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="640" height="780" fill="url(#hero-sea)" />
      <rect width="640" height="780" fill="url(#hero-glow)" />
      <polygon points="200,0 260,0 420,780 300,780" fill="#ffffff" opacity=".08" />
      <polygon points="360,0 400,0 600,780 520,780" fill="#ffffff" opacity=".07" />
      <path d="M0 150 Q80 135 160 150 T320 150 T480 150 T640 150" stroke="#ffffff" strokeOpacity=".25" fill="none" />
      <path d="M0 210 Q80 195 160 210 T320 210 T480 210 T640 210" stroke="#ffffff" strokeOpacity=".15" fill="none" />
      <circle cx="470" cy="300" r="7" fill="none" stroke="#ffffff" strokeOpacity=".5" />
      <circle cx="495" cy="250" r="4" fill="none" stroke="#ffffff" strokeOpacity=".5" />
      <circle cx="450" cy="215" r="10" fill="none" stroke="#ffffff" strokeOpacity=".4" />
      <g transform="translate(340 365) rotate(-29)">
        <ellipse cx="0" cy="0" rx="92" ry="20" fill="#031a24" />
        <circle cx="-100" cy="-4" r="17" fill="#031a24" />
        <path d="M-80 -6 L-150 -34" stroke="#031a24" strokeWidth="12" strokeLinecap="round" />
        <path d="M88 4 L170 20 L205 6 L170 38 Z" fill="#031a24" />
        <path d="M60 8 L150 52" stroke="#031a24" strokeWidth="12" strokeLinecap="round" />
      </g>
      <text x="320" y="110" textAnchor="middle" fill="#f4f4ec" fontSize="15" letterSpacing="3" fontFamily="var(--kyu-font-sans)">
        01 / INTO THE BLUE
      </text>
      <text x="40" y="680" fill="#f4f4ec" fontSize="22" fontFamily="var(--kyu-font-sans)">
        한 호흡, 무한한 가능성.
      </text>
      <path d="M40 696v18M34 708l6 6l6-6" stroke="#d6f48a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="600" y="725" fill="#ffffff" fillOpacity=".7" fontSize="11" letterSpacing="2" textAnchor="end" fontFamily="var(--kyu-font-sans)">
        CONCEPT VISUAL
      </text>
    </svg>
  );
}
