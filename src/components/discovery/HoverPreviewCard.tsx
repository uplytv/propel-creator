import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import DiscoveryFeedCard from "./DiscoveryFeedCard";
import type { DiscoveryItem } from "@/hooks/useDiscoveryAlgorithmFeed";

interface Props {
  item: DiscoveryItem;
  /** ms to wait before starting preview after hover (Netflix uses ~600ms) */
  hoverDelay?: number;
}

/**
 * Netflix-style hover preview wrapper for carousel cards.
 * - Wraps the existing DiscoveryFeedCard (no changes to card behavior).
 * - On hover, after a short delay, plays a muted Mux preview video over the thumbnail.
 * - On mouse leave / blur / scroll, stops and resets.
 * - Falls back to the static card when no playback_id is available.
 */
export default function HoverPreviewCard({ item, hoverDelay = 600 }: Props) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const previewSrc = item.playback_id
    ? `https://stream.mux.com/${item.playback_id}/low.mp4`
    : null;

  // Start/stop preview based on hover state
  useEffect(() => {
    if (!previewSrc) return;
    if (isHovering) {
      timerRef.current = window.setTimeout(() => setIsPlaying(true), hoverDelay);
    } else {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      setIsPlaying(false);
      const v = videoRef.current;
      if (v) {
        v.pause();
        v.currentTime = 0;
      }
    }
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [isHovering, hoverDelay, previewSrc]);

  // Stop preview if user scrolls (mouseleave isn't always fired during scroll)
  useEffect(() => {
    if (!isPlaying) return;
    const onScroll = () => setIsHovering(false);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [isPlaying]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onFocus={() => setIsHovering(true)}
      onBlur={() => setIsHovering(false)}
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
            autoPlay
            muted={muted}
            loop
            playsInline
            preload="none"
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
