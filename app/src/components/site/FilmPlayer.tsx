"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { parseVideoUrl } from "@/lib/video";
import styles from "./FilmPlayer.module.css";

/**
 * 작품 재생기 (FILMS-02, FILMD-02, INT-16). 포스터와 재생 버튼만 보여 주고, **누르기 전에는 외부 서비스로 아무것도 요청하지 않는다**(개인정보·성능).
 * 누르면 그 자리에서 허용 도메인(YouTube nocookie, Vimeo do-not-track)의 임베드로 바뀌어 재생된다.
 * 허용 도메인이 아닌 주소는 재생 대상으로 삼지 않는다. 재생이 안 될 때를 위해 원본 링크를 항상 둔다(FILMD-03).
 */
export function FilmPlayer({ videoUrl, title, poster, badge, showFallback = true }: { videoUrl: string; title: string; poster?: { src: string; alt: string }; badge?: string; showFallback?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const source = parseVideoUrl(videoUrl);
  if (!source) return null;
  const provider = source.provider === "youtube" ? "YouTube" : "Vimeo";
  const embed = new URL(source.embedUrl);
  embed.searchParams.set("autoplay", "1");

  return (
    <div>
      <div className={styles.wrap}>
        {playing ? (
          <iframe
            className={styles.frame}
            src={embed.toString()}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        ) : (
          <>
            {poster?.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.poster} src={poster.src} alt={poster.alt} loading="eager" decoding="async" />
            ) : null}
            <button type="button" className={styles.play} onClick={() => setPlaying(true)} aria-label={`${title} 재생`}>
              <span className={styles.circle}>
                <Icon name="play" size={24} />
              </span>
            </button>
          </>
        )}
        {badge && !playing ? <span className={styles.badge}>{badge}</span> : null}
      </div>
      {showFallback ? (
        <p className={styles.fallback}>
          재생이 안 되면{" "}
          <a href={source.watchUrl} target="_blank" rel="noopener noreferrer">
            원본 링크({provider})에서 보기
          </a>
        </p>
      ) : null}
    </div>
  );
}
