"use client";

import { useEffect, useRef, useState } from "react";
import { embedSandbox } from "@/lib/video";
import styles from "./InstagramFrame.module.css";

const ORIGIN = "https://www.instagram.com";
const MIN_HEIGHT = 320;
const MAX_HEIGHT = 1400;
const START_HEIGHT = 640;
/** 이 높이 이상이면 내용이 올라온 것으로 본다(릴스·게시물 카드는 머리·바닥 줄만 해도 이보다 크다) */
const LOADED_HEIGHT = 400;
/** 이 시간이 지나면 안내 문구를 걷고 iframe 에 있는 것을 그대로 보여 준다 */
const GIVE_UP_MS = 15_000;

/**
 * Instagram 임베드 화면. Instagram 은 자동 재생을 막아서, 이 화면이 열린 뒤 안에서 재생 버튼을 한 번 더 눌러야 한다.
 * 내용 높이가 폭에 따라 달라서, Instagram 이 보내는 크기 알림(MEASURE)을 받아 높이를 맞춘다.
 * 알림은 **이 iframe 에서 온 것만** 받고(주소·창 둘 다 확인) 숫자 높이만 쓴다. 높이가 정해져도 내용이 올라오기까지 몇 초 걸려서,
 * 실제 높이(400px 이상)가 올 때까지, 또는 15초가 지날 때까지 안내 문구를 보여 준다. 오래 걸리면 안내 문구가 원본 링크를 가리킨다.
 * (MOUNTED 알림은 내용이 그려지기 전에 먼저 오므로 기준으로 쓰지 않는다.)
 */
export function InstagramFrame({ src, title }: { src: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(START_HEIGHT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== ORIGIN || event.source !== frame.current?.contentWindow) return;
      let data: unknown = event.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || typeof data !== "object") return;
      const { type, details } = data as { type?: unknown; details?: { height?: unknown } };
      if (type === "MEASURE" && typeof details?.height === "number" && Number.isFinite(details.height)) {
        const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(details.height)));
        setHeight(next);
        // 처음에는 작은 높이가 오고, 내용이 올라오면 실제 높이가 온다. 실제 높이가 오면 안내 문구를 지운다
        if (next >= LOADED_HEIGHT) setReady(true);
      }
    }
    window.addEventListener("message", onMessage);
    const timer = window.setTimeout(() => setReady(true), GIVE_UP_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className={styles.box} style={{ minHeight: ready ? undefined : START_HEIGHT }}>
      {!ready ? (
        <p className={styles.loading} role="status">
          Instagram 화면을 불러오는 중입니다…
          <br />
          오래 걸리면 아래 원본 링크에서 보실 수 있습니다.
        </p>
      ) : null}
      <iframe
        ref={frame}
        className={styles.frame}
        style={{ height }}
        src={src}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox={embedSandbox("instagram")}
      />
    </div>
  );
}
