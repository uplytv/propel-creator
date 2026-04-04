import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export interface StreamDestination {
  id: string;
  creator_id: string;
  platform: string;
  platform_label: string | null;
  rtmp_url: string;
  stream_key_last_four: string | null;
  is_enabled: boolean;
  is_verified: boolean;
  key_created_at: string;
  key_rotation_reminded_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface SimulcastSession {
  id: string;
  stream_id: string;
  creator_id: string;
  platform: string;
  status: string;
  retry_count: number;
  started_at: string | null;
  ended_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface MultistreamAlert {
  id: string;
  user_id: string;
  session_id: string | null;
  platform: string;
  alert_type: string;
  message: string;
  resolved: boolean;
  created_at: string;
}

const DEFAULT_RTMP: Record<string, string> = {
  youtube: "rtmp://a.rtmp.youtube.com/live2",
  twitch: "rtmp://live.twitch.tv/app",
  kick: "rtmp://fa723fc1b171.global-contribute.live-video.net/app",
};

export function useSimulcastDestinations() {
  const { user } = useAuth();
  const [destinations, setDestinations] = useState<StreamDestination[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDestinations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("creator_stream_destinations")
      .select("id, creator_id, platform, platform_label, rtmp_url, stream_key_last_four, is_enabled, is_verified, key_created_at, key_rotation_reminded_at, last_used_at, created_at")
      .eq("creator_id", user.id);
    setDestinations((data as any[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchDestinations(); }, [fetchDestinations]);

  const saveDestination = async (platform: string, rtmpUrl: string, streamKey: string, label?: string) => {
    if (!user) return;
    const lastFour = streamKey.slice(-4);
    
    const { error } = await supabase
      .from("creator_stream_destinations")
      .upsert({
        creator_id: user.id,
        platform,
        platform_label: label || null,
        rtmp_url: rtmpUrl || DEFAULT_RTMP[platform] || "",
        stream_key_encrypted: streamKey,
        stream_key_last_four: lastFour,
        is_verified: false,
        key_created_at: new Date().toISOString(),
      }, { onConflict: "creator_id,platform" });
    
    if (error) throw error;
    await fetchDestinations();
  };

  const validateAndSave = async (platform: string, rtmpUrl: string, streamKey: string, label?: string): Promise<{ valid: boolean; message: string }> => {
    if (!user) return { valid: false, message: "Not authenticated" };

    const { data, error } = await supabase.functions.invoke("validate-rtmp", {
      body: { user_id: user.id, rtmp_url: rtmpUrl, stream_key: streamKey, platform },
    });

    if (error) return { valid: false, message: error.message };
    if (!data?.valid) return { valid: false, message: data?.message || "Validation failed" };

    // Refresh destinations after validate-rtmp saved them
    await fetchDestinations();

    // Update label if provided
    if (label) {
      await supabase
        .from("creator_stream_destinations")
        .update({ platform_label: label })
        .eq("creator_id", user.id)
        .eq("platform", platform);
      await fetchDestinations();
    }

    return { valid: true, message: data.message };
  };

  const toggleDestination = async (platform: string, enabled: boolean) => {
    if (!user) return;
    await supabase
      .from("creator_stream_destinations")
      .update({ is_enabled: enabled })
      .eq("creator_id", user.id)
      .eq("platform", platform);
    await fetchDestinations();
  };

  const deleteDestination = async (platform: string) => {
    if (!user) return;
    await supabase
      .from("creator_stream_destinations")
      .delete()
      .eq("creator_id", user.id)
      .eq("platform", platform);
    await fetchDestinations();
  };

  const testConnection = async (platform: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Not authenticated" };
    const { data, error } = await supabase.functions.invoke("test-simulcast-connection", {
      body: { creator_id: user.id, platform },
    });
    if (error) return { success: false, error: error.message };
    return data;
  };

  return { destinations, loading, saveDestination, validateAndSave, toggleDestination, deleteDestination, testConnection, refetch: fetchDestinations };
}

export function useSimulcastSessions(streamId: string | null) {
  const [sessions, setSessions] = useState<SimulcastSession[]>([]);

  useEffect(() => {
    if (!streamId) return;

    supabase
      .from("stream_simulcast_sessions")
      .select("*")
      .eq("stream_id", streamId)
      .then(({ data }) => setSessions((data as any[]) || []));

    const channel = supabase
      .channel(`simulcast-${streamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stream_simulcast_sessions", filter: `stream_id=eq.${streamId}` },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setSessions((prev) => [...prev, payload.new]);
          } else if (payload.eventType === "UPDATE") {
            setSessions((prev) => prev.map((s) => (s.id === payload.new.id ? payload.new : s)));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  const startSimulcast = async (liveStreamId: string, creatorId: string, platform?: string) => {
    const { data, error } = await supabase.functions.invoke("start-simulcast", {
      body: { live_stream_id: liveStreamId, creator_id: creatorId, platform },
    });
    if (error) {
      toast.error("Failed to start simulcast");
      return;
    }
    for (const r of data?.results || []) {
      if (r.success) {
        toast.success(`Connecting to ${r.platform}...`);
      } else {
        toast.error(`${r.platform} failed — streaming on UPLY only`);
      }
    }
  };

  const stopSimulcast = async (liveStreamId: string, creatorId: string) => {
    await supabase.functions.invoke("stop-simulcast", {
      body: { live_stream_id: liveStreamId, creator_id: creatorId },
    });
  };

  return { sessions, startSimulcast, stopSimulcast };
}

// Stream heartbeat — call every 30 minutes during active multistream
export function useStreamHeartbeat(userId: string | undefined, sessionId: string | null, isStreaming: boolean) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId || !isStreaming) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const sendHeartbeat = async () => {
      try {
        await supabase.functions.invoke("stream-heartbeat", {
          body: { user_id: userId, session_id: sessionId },
        });
      } catch { /* heartbeat failure is non-critical */ }
    };

    // Send initial heartbeat after 1 minute, then every 30 minutes
    const timeout = setTimeout(() => {
      sendHeartbeat();
      intervalRef.current = setInterval(sendHeartbeat, 30 * 60 * 1000);
    }, 60_000);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userId, sessionId, isStreaming]);
}

// Realtime multistream alerts listener
export function useMultistreamAlerts(userId: string | undefined) {
  const [alerts, setAlerts] = useState<MultistreamAlert[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Fetch unresolved alerts
    supabase
      .from("multistream_alerts")
      .select("*")
      .eq("user_id", userId)
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setAlerts((data as any[]) || []));

    // Realtime subscription
    const channel = supabase
      .channel(`multistream-alerts-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "multistream_alerts", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const alert = payload.new as MultistreamAlert;
          setAlerts((prev) => [alert, ...prev]);

          // Show toast based on alert type
          const icons: Record<string, string> = {
            token_expired: "🔑",
            refresh_failed: "🔄",
            stream_dropped: "📡",
            connection_lost: "⚠️",
          };
          const icon = icons[alert.alert_type] || "⚠️";
          toast.error(`${icon} ${alert.platform}`, { description: alert.message, duration: 10000 });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const resolveAlert = async (alertId: string) => {
    await supabase
      .from("multistream_alerts")
      .update({ resolved: true })
      .eq("id", alertId);
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  return { alerts, resolveAlert };
}
