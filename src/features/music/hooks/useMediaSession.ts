import { useEffect } from "react";
import { usePlayerStore, currentTrack } from "./usePlayerStore";

/**
 * Wires the Media Session API so the OS lock-screen, notification shade,
 * Bluetooth headsets, CarPlay and Android Auto can control playback and
 * display "now playing" metadata (artwork, title, artist, album).
 *
 * Mount this once near the persistent audio element.
 */
export function useMediaSession(audioEl?: HTMLAudioElement | null) {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const positionSeconds = usePlayerStore((s) => s.positionSeconds);
  const durationSeconds = usePlayerStore((s) => s.durationSeconds);
  const playbackRate = usePlayerStore((s) => s.playbackRate);

  // Update metadata whenever the active track changes
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const track = currentTrack();
    if (!track) {
      navigator.mediaSession.metadata = null;
      return;
    }
    const cover = (track as any).cover_art_url || (track as any).cover_url || "";
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || "Untitled",
      artist: (track as any).artist_name || (track as any).creator_name || "Unknown Artist",
      album: (track as any).album_title || "",
      artwork: cover
        ? [
            { src: cover, sizes: "256x256", type: "image/jpeg" },
            { src: cover, sizes: "512x512", type: "image/jpeg" },
            { src: cover, sizes: "1024x1024", type: "image/jpeg" },
          ]
        : [],
    });
  }, [queue, currentIndex]);

  // Wire action handlers (play, pause, next, prev, seek, scrub)
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const store = usePlayerStore.getState;

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => store().play()],
      ["pause", () => store().pause()],
      ["previoustrack", () => store().prev()],
      ["nexttrack", () => store().next()],
      ["seekbackward", (d) => store().seek(Math.max(0, store().positionSeconds - (d.seekOffset || 10)))],
      ["seekforward", (d) => store().seek(store().positionSeconds + (d.seekOffset || 10))],
      ["seekto", (d) => { if (typeof d.seekTime === "number") store().seek(d.seekTime); }],
      ["stop", () => { store().pause(); store().seek(0); }],
    ];

    handlers.forEach(([action, h]) => {
      try { ms.setActionHandler(action, h); } catch { /* unsupported */ }
    });

    return () => {
      handlers.forEach(([action]) => {
        try { ms.setActionHandler(action, null); } catch { /* noop */ }
      });
    };
  }, []);

  // Sync playback state for CarPlay / lock-screen widgets
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // Update position state so OS scrubbers track in real time
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!("setPositionState" in navigator.mediaSession)) return;
    if (!durationSeconds || !isFinite(durationSeconds)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: durationSeconds,
        playbackRate: playbackRate || 1,
        position: Math.min(positionSeconds, durationSeconds),
      });
    } catch {
      /* invalid state */
    }
  }, [positionSeconds, durationSeconds, playbackRate]);

  // Background audio: hint the browser to keep the audio element going
  useEffect(() => {
    if (!audioEl) return;
    audioEl.preload = "auto";
    (audioEl as any).playsInline = true;
    audioEl.setAttribute("playsinline", "true");
  }, [audioEl]);
}
