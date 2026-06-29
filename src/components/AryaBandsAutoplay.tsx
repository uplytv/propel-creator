import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";

const YT_ID = "gqYburgfJ9s"; // 150 BANDS — HUGEL, Arya XO, NBA YoungBoy

/**
 * Hidden YouTube IFrame player that auto-starts "150 BANDS" when the page
 * loads. Browsers block autoplay with sound until a user gesture, so we:
 *   1. Start the iframe muted (which most browsers allow).
 *   2. Try to unmute immediately.
 *   3. On the FIRST user interaction anywhere on the page, unmute + play.
 * A small floating chip lets the visitor pause/resume.
 */
export default function AryaBandsAutoplay() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const ensureApi = () =>
      new Promise<void>((resolve) => {
        const w = window as any;
        if (w.YT && w.YT.Player) return resolve();
        const existing = document.querySelector(
          'script[src="https://www.youtube.com/iframe_api"]',
        );
        if (!existing) {
          const tag = document.createElement("script");
          tag.src = "https://www.youtube.com/iframe_api";
          document.head.appendChild(tag);
        }
        const prev = w.onYouTubeIframeAPIReady;
        w.onYouTubeIframeAPIReady = () => {
          prev?.();
          resolve();
        };
      });

    (async () => {
      await ensureApi();
      if (cancelled || !containerRef.current) return;
      const w = window as any;
      playerRef.current = new w.YT.Player(containerRef.current, {
        videoId: YT_ID,
        width: "0",
        height: "0",
        playerVars: {
          autoplay: 1,
          controls: 0,
          playsinline: 1,
          modestbranding: 1,
          rel: 0,
          loop: 1,
          playlist: YT_ID,
        },
        events: {
          onReady: (e: any) => {
            setReady(true);
            try {
              e.target.mute();
              e.target.playVideo();
              // try to unmute right away (works on some browsers)
              setTimeout(() => {
                try {
                  e.target.unMute();
                  e.target.setVolume(80);
                  if (e.target.isMuted?.()) setNeedsTap(true);
                } catch {
                  setNeedsTap(true);
                }
              }, 400);
            } catch {
              setNeedsTap(true);
            }
          },
          onStateChange: (e: any) => {
            // 1 = playing, 2 = paused
            setPlaying(e.data === 1);
          },
        },
      });
    })();

    const onGesture = () => {
      const p = playerRef.current;
      if (!p) return;
      try {
        p.unMute();
        p.setVolume(80);
        p.playVideo();
      } catch {}
      setNeedsTap(false);
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    window.addEventListener("touchstart", onGesture, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("touchstart", onGesture);
      try {
        playerRef.current?.destroy?.();
      } catch {}
    };
  }, []);

  const toggle = () => {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (playing) {
        p.pauseVideo();
      } else {
        p.unMute();
        p.setVolume(80);
        p.playVideo();
      }
      setNeedsTap(false);
    } catch {}
  };

  return (
    <>
      {/* Hidden YT iframe host */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
          left: -9999,
          top: -9999,
        }}
      >
        <div ref={containerRef} />
      </div>

      {/* Floating now-playing chip */}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause 150 BANDS" : "Play 150 BANDS"}
        className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-full bg-black/80 backdrop-blur border border-white/15 px-3 py-2 text-white text-xs font-semibold shadow-lg hover:bg-black/90 transition"
        style={{ minHeight: 44 }}
      >
        {playing ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">
          {needsTap ? "Tap to play sound — 150 BANDS" : "150 BANDS · HUGEL × Arya XO"}
        </span>
        <span className="sm:hidden">150 BANDS</span>
        {ready && !needsTap && playing && (
          <Volume2 className="w-3.5 h-3.5 opacity-80" />
        )}
      </button>
    </>
  );
}
