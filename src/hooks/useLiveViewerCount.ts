import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to live viewer count for a stream. Polls every 10s as a fallback
 * and listens to realtime updates on `mux_live_streams.viewer_count`.
 */
export function useLiveViewerCount(streamId: string | null | undefined, initial = 0) {
  const [count, setCount] = useState(initial);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!streamId) return;
    let cancelled = false;

    const fetchOnce = async () => {
      const { data } = await supabase
        .from("mux_live_streams")
        .select("viewer_count, status")
        .eq("id", streamId)
        .maybeSingle();
      if (cancelled || !data) return;
      setCount(data.viewer_count ?? 0);
      setIsLive(data.status === "active");
    };

    fetchOnce();
    const poll = setInterval(fetchOnce, 10_000);

    const channel = supabase
      .channel(`live-viewers-${streamId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mux_live_streams", filter: `id=eq.${streamId}` },
        (payload: any) => {
          setCount(payload.new?.viewer_count ?? 0);
          setIsLive(payload.new?.status === "active");
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  return { count, isLive };
}
