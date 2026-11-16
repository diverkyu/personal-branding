import { describe, expect, it } from "vitest";
import { PROVIDER_LABELS, parseVideoUrl } from "./video";

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

  it("YouTube Shorts 는 세로 영상으로, 일반 영상은 가로로 해석한다", () => {
    const shorts = parseVideoUrl("https://www.youtube.com/shorts/aqz-KE-bpKQ?feature=share");
    expect(shorts).toMatchObject({ provider: "youtube", orientation: "portrait", id: "aqz-KE-bpKQ", watchUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ" });
    expect(parseVideoUrl("https://youtu.be/aqz-KE-bpKQ")?.orientation).toBe("landscape");
    expect(parseVideoUrl("https://vimeo.com/76979871")?.orientation).toBe("landscape");
  });

  it("Instagram 릴스·게시물 주소는 코드만 남기고 추적 값은 버려 공식 임베드 주소로 바꾼다", () => {
    const share = "https://www.instagram.com/reel/DfyQydRMWBw/?utm_source=ig_web_copy_link&rpxt=MzRlODBiNWFlZA==&srtk=MzRlODBiNWFlZA==";
    expect(parseVideoUrl(share)).toEqual({
      provider: "instagram",
      orientation: "portrait",
      id: "DfyQydRMWBw",
      embedUrl: "https://www.instagram.com/reel/DfyQydRMWBw/embed/",
      watchUrl: "https://www.instagram.com/reel/DfyQydRMWBw/",
    });
    for (const u of ["https://instagram.com/reel/DfyQydRMWBw", "https://www.instagram.com/p/DfyQydRMWBw/", "https://www.instagram.com/tv/DfyQydRMWBw/", "https://www.instagram.com/kyureative/reel/DfyQydRMWBw/", "https://m.instagram.com/reel/DfyQydRMWBw/"]) {
      expect(parseVideoUrl(u)?.provider, u).toBe("instagram");
    }
    expect(parseVideoUrl("https://www.instagram.com/p/DfyQydRMWBw/")?.embedUrl).toBe("https://www.instagram.com/p/DfyQydRMWBw/embed/");
    expect(PROVIDER_LABELS.instagram).toBe("Instagram");
  });

  it("Instagram 의 프로필·탐색·잘못된 코드·다른 도메인은 거부한다", () => {
    for (const u of [
      "https://www.instagram.com/kyureative/",
      "https://www.instagram.com/reels/",
      "https://www.instagram.com/explore/tags/freedive/",
      "https://www.instagram.com/reel/",
      "https://www.instagram.com/reel/ab/",
      "https://www.instagram.com/reel/DfyQydRMWBw%22onload=x/",
      "https://www.instagram.com/stories/kyureative/123456789/",
      "http://www.instagram.com/reel/DfyQydRMWBw/",
      "https://instagram.com.evil.example/reel/DfyQydRMWBw/",
      "https://notinstagram.com/reel/DfyQydRMWBw/",
    ]) {
      expect(parseVideoUrl(u), u).toBeNull();
    }
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
