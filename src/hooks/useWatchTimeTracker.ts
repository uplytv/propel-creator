import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface Args {
  contentId?: string;
  contentType: "video" | "clip" | "recording";
  durationSeconds?: number;
  category?: string;
  /** Function returning current playback time in seconds */
  getCurrentTime?: () => number;
  enabled?: boolean;
}

/**
 * Fires a heartbeat every 10s with current watched seconds, plus a final
 * event on unmount. Powers the most important signal in UPLY's discovery
 * algorithm: watch_time_percentage.
 */
export function useWatchTimeTracker({
  contentId, contentType, durationSeconds, category, getCurrentTime, enabled = true,
}: Args) {
  const { user } = useAuth();
  const sessionId = useRef<string>(crypto.randomUUID());
  const peakSeconds = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !contentId || !durationSeconds || durationSeconds < 1) return;

    const send = async (final: boolean) => {
      const watched = Math.max(peakSeconds.current, getCurrentTime?.() ?? 0);
      if (watched < 1) return;
      try {
        await supabase.functions.invoke("track-watch-time", {
          body: {
            content_id: contentId, content_type: contentType,
            viewer_id: user?.id ?? null, session_id: sessionId.current,
            watched_seconds: Math.floor(watched),
            duration_seconds: Math.floor(durationSeconds),
            is_final: final, category: category ?? null,
          },
        });
      } catch { /* swallow */ }
    };

    const tick = setInterval(() => {
      const t = getCurrentTime?.() ?? 0;
      if (t > peakSeconds.current) peakSeconds.current = t;
      send(false);
    }, 10_000);

    const onHide = () => { if (document.visibilityState === "hidden") send(true); };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onHide);
      send(true);
    };
  }, [contentId, contentType, durationSeconds, category, enabled, user?.id, getCurrentTime]);
}
