import { describe, expect, it } from "vitest";
import { parseVideoUrl } from "./video";

describe("영상 주소 해석 (허용 도메인만)", () => {
  it("YouTube 주소를 개인정보 보호 도메인 임베드로 바꾼다", () => {
    for (const u of ["https://www.youtube.com/watch?v=aqz-KE-bpKQ", "https://youtu.be/aqz-KE-bpKQ", "https://m.youtube.com/watch?v=aqz-KE-bpKQ"]) {
      const v = parseVideoUrl(u);
      expect(v?.provider, u).toBe("youtube");
      expect(v?.embedUrl).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/aqz-KE-bpKQ/);
    }
  });

  it("Vimeo 주소를 해석한다", () => {
    expect(parseVideoUrl("https://vimeo.com/76979871")?.embedUrl).toBe("https://player.vimeo.com/video/76979871?dnt=1");
  });

  it("허용하지 않는 도메인·스킴·형식은 거부한다", () => {
    for (const u of [
      "http://www.youtube.com/watch?v=aqz-KE-bpKQ",
      "https://evil.example/watch?v=aqz-KE-bpKQ",
      "https://youtube.com.evil.example/watch?v=aqz-KE-bpKQ",
      "https://www.youtube.com/watch?v=short",
      "https://www.youtube.com/watch?v=aqz-KE-bpKQ%22onload=x",
      "javascript:alert(1)",
      "data:text/html,<script>",
      "not a url",
      "https://vimeo.com/abc",
    ]) {
      expect(parseVideoUrl(u), u).toBeNull();
    }
  });
});
