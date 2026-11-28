// Run from app/: node scripts/generate-share-image.mjs
// Original brand artwork. Uses existing design tokens and the existing KYU logo.
import { mkdir, readFile } from "node:fs/promises";
import sharp from "sharp";

const tokens = await readFile("src/styles/tokens.css", "utf8");
const color = (name) => {
  const value = new RegExp(`--kyu-${name}:\\s*(#[0-9a-f]+);`, "i").exec(tokens)?.[1];
  if (!value) throw new Error(`Missing token: ${name}`);
  return value;
};
const logo = (await readFile("public/icons/icon-512.png")).toString("base64");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${color("navy")}"/>
  <path d="M850 630V300a240 240 0 0 1 480 0v330" fill="${color("teal")}"/>
  <image href="data:image/png;base64,${logo}" x="62" y="58" width="136" height="136"/>
  <g font-family="Noto Sans KR, Malgun Gothic, sans-serif">
    <text x="80" y="278" fill="${color("paper")}" font-size="38" font-weight="700">이동규 · KYU</text>
    <text x="78" y="368" fill="${color("paper")}" font-size="66" font-weight="700">프리다이빙</text>
    <text x="78" y="452" fill="${color("lime")}" font-size="66" font-weight="700">AI 영상</text>
    <path d="M80 503H1120" stroke="${color("lime")}" stroke-opacity="0.35"/>
    <text x="80" y="560" fill="${color("paper")}" font-size="28">Dive deeper. Create beyond.</text>
  </g>
</svg>`;
await mkdir("public/images", { recursive: true });
await sharp(Buffer.from(svg)).png().toFile("public/images/kyu-share.png");
console.log("Created public/images/kyu-share.png (1200 × 630)");
