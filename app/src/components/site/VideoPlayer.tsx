"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { parseVideoUrl } from "@/lib/video";
import styles from "./VideoPlayer.module.css";

/**
 * 스케치 영상 (TOUR-D09, INT-09). 누르기 전에는 외부 주소로 아무것도 요청하지 않는다(개인정보·성능).
 * 허용 도메인(YouTube, Vimeo)이 아닌 주소는 아예 재생 대상으로 삼지 않는다. 재생이 안 될 때를 위해 원본 링크를 항상 함께 둔다.
 */
export function VideoPlayer({ url, title }: { url: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const source = parseVideoUrl(url);
  if (!source) return null;

  return (
    <div className={styles.wrap}>
      {playing ? (
        <iframe
          className={styles.frame}
          src={source.embedUrl}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
        />
      ) : (
        <button type="button" className={styles.play} onClick={() => setPlaying(true)} aria-label={`${title} 재생`}>
          <Icon name="play" size={24} />
          <span>영상 재생</span>
        </button>
      )}
      <p className={styles.fallback}>
        <a href={source.watchUrl} target="_blank" rel="noopener noreferrer">
          재생이 안 되면 원본에서 보기
        </a>
      </p>
    </div>
  );
}
