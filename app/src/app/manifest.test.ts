import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import manifest from "./manifest";

const appRoot = path.resolve(__dirname, "../..");

describe("홈 화면 추가 manifest (GL-F5)", () => {
  const m = manifest();

  it("설치 조건: 이름·시작 주소·standalone·192/512 아이콘", () => {
    expect(m.name).toBe(siteConfig.defaultTitle);
    expect(m.short_name).toBe("KYU");
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.theme_color).toBe(siteConfig.themeColor);
    const sizes = (m.icons ?? []).filter((i) => i.purpose !== "maskable").map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(m.icons?.some((i) => i.purpose === "maskable")).toBe(true);
  });

  it("아이콘 파일이 있고 적힌 크기와 같다", async () => {
    for (const icon of m.icons ?? []) {
      const file = path.join(appRoot, "public", icon.src);
      expect(existsSync(file), icon.src).toBe(true);
      const meta = await sharp(file).metadata();
      expect(`${meta.width}x${meta.height}`, icon.src).toBe(icon.sizes);
      expect(meta.format).toBe("png");
    }
  });

  it("iPhone 홈 화면 아이콘(apple-icon.png)은 180×180", async () => {
    const meta = await sharp(path.join(appRoot, "src/app/apple-icon.png")).metadata();
    expect([meta.width, meta.height]).toEqual([180, 180]);
  });
});
