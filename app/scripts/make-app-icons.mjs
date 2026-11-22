/**
 * 홈 화면 추가(설치)용 아이콘을 만든다. 원본은 `src/app/icon.svg`와 같은 KYU 아치 모양이다.
 * 결과 파일은 저장소에 커밋한다 — 빌드 때마다 만들지 않는다. 로고가 바뀌면 이 스크립트를 다시 돌린다.
 *
 *   node scripts/make-app-icons.mjs
 *
 * - public/icons/icon-192.png, icon-512.png : 일반 아이콘(모서리 둥근 사각형)
 * - public/icons/icon-maskable-512.png      : 안드로이드가 원·둥근 사각형 등으로 잘라 쓰는 아이콘.
 *   배경을 가장자리까지 채우고, 모양은 가운데 안전 영역(지름 80%) 안에만 둔다
 * - src/app/apple-icon.png (180)            : iPhone 홈 화면. iOS 가 모서리를 직접 둥글리므로 사각형을 꽉 채운다
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// src/config/site.ts 의 themeColor, src/styles/tokens.css 의 --kyu-lime 과 같은 값
const NAVY = "#071e29";
const LIME = "#d6f48a";
const ARCH = "M9 24V15a7 7 0 0 1 14 0v9z"; // 32×32 좌표계, icon.svg 와 같은 모양

/** 32×32 아치를 scale 배율로 가운데에 놓는다 (scale 1 = icon.svg 와 같은 비율) */
function svg({ rounded, scale }) {
  const offset = 16 - 16 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" ${rounded ? 'rx="6"' : ""} fill="${NAVY}"/>
  <path d="${ARCH}" fill="${LIME}" transform="translate(${offset} ${offset}) scale(${scale})"/>
</svg>`;
}

const outputs = [
  { file: "public/icons/icon-192.png", size: 192, rounded: true, scale: 1 },
  { file: "public/icons/icon-512.png", size: 512, rounded: true, scale: 1 },
  // 아치(가로 14, 세로 16)가 안전 영역 원(지름 25.6) 안에 들도록 줄인다
  { file: "public/icons/icon-maskable-512.png", size: 512, rounded: false, scale: 0.8 },
  { file: "src/app/apple-icon.png", size: 180, rounded: false, scale: 0.9 },
];

for (const o of outputs) {
  const target = path.join(root, o.file);
  await mkdir(path.dirname(target), { recursive: true });
  await sharp(Buffer.from(svg(o)), { density: (72 * o.size) / 32 })
    .resize(o.size, o.size)
    .png({ compressionLevel: 9 })
    .toFile(target);
  process.stdout.write(`${o.file} (${o.size}×${o.size})\n`);
}
