import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import DiscoveryFeedCard from "./DiscoveryFeedCard";
import type { DiscoveryItem } from "@/hooks/useDiscoveryAlgorithmFeed";

interface Props {
  item: DiscoveryItem;
  /** ms to wait before prefetching + playing preview after hover (Netflix uses ~600ms) */
  hoverDelay?: number;
}

/**
 * Netflix-style hover preview wrapper for carousel cards.
 *
 * Loading strategy (optimized):
 *  - On hover: start a delay timer. Do NOT touch the network yet.
 *  - After delay: prefetch ONE low-res Mux frame via fetch() with an AbortController.
 *  - When the frame finishes loading, mount the <video> and play.
 *  - On mouse leave / blur / scroll: abort any in-flight prefetch, clear the timer,
 *    pause + reset the video, and unmount the overlay.
 *  - Falls back to the static card when no playback_id is available.
 */
export default function HoverPreviewCard({ item, hoverDelay = 600 }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const playbackId = item.playback_id ?? null;
  const previewSrc = playbackId ? `https://stream.mux.com/${playbackId}/low.mp4` : null;
  // Single low-res frame from Mux — tiny (~5–15 KB) and serves as both prefetch probe + poster
  const frameUrl = playbackId
    ? `https://image.mux.com/${playbackId}/thumbnail.jpg?width=320&fit_mode=preserve`
    : null;

  const cancelAll = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPosterUrl(null);
    setIsPlaying(false);
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };

  const startPreview = () => {
    if (!previewSrc || !frameUrl) return;
    cancelAll();
    timerRef.current = window.setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(frameUrl, { signal: controller.signal, cache: "force-cache" });
        if (!res.ok) return;
        const blob = await res.blob();
        if (controller.signal.aborted) return;
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setPosterUrl(url);
        setIsPlaying(true);
      } catch {
        // aborted or network error — silently no-op
      }
    }, hoverDelay);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelAll();
     
  }, []);

  // Stop preview if user scrolls (mouseleave isn't always fired during scroll)
  useEffect(() => {
    if (!isPlaying) return;
    const onScroll = () => cancelAll();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [isPlaying]);

  return (
    <div
      className="relative"
      onMouseEnter={startPreview}
      onMouseLeave={cancelAll}
      onFocus={startPreview}
      onBlur={cancelAll}
    >
      <DiscoveryFeedCard item={item} />

      {previewSrc && isPlaying && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 aspect-video rounded-lg overflow-hidden ring-1 ring-border bg-black animate-fade-in z-10"
          aria-hidden="true"
        >
          <video
            ref={videoRef}
            src={previewSrc}
            poster={posterUrl ?? undefined}
            autoPlay
            muted={muted}
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMuted((m) => !m);
            }}
            className="pointer-events-auto absolute bottom-2 right-2 w-8 h-8 grid place-items-center rounded-full bg-background/70 backdrop-blur-sm border border-border hover:bg-background transition-colors"
            aria-label={muted ? "Unmute preview" : "Mute preview"}
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-foreground" />
            ) : (
              <Volume2 className="w-4 h-4 text-foreground" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
