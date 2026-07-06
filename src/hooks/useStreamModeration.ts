import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Stream chat moderation (migration 20260706153000_moderation.sql).
 * Tables `chat_moderation` + `mux_live_streams.slow_mode_seconds` are not in
 * the generated types yet, hence the (supabase as any) casts.
 */

export interface ChatRestriction {
  kind: "ban" | "timeout";
  expires_at: string | null;
}

export function useStreamModeration(
  streamId: string | undefined,
  creatorUserId: string | undefined,
  viewerUserId: string | undefined
) {
  const isOwner = !!viewerUserId && !!creatorUserId && viewerUserId === creatorUserId;
  const [restriction, setRestriction] = useState<ChatRestriction | null>(null);
  const [slowModeSeconds, setSlowModeSeconds] = useState(0);

  // ── Viewer: am I banned / timed out for this creator's chat? ──
  const refreshRestriction = useCallback(async () => {
    if (!viewerUserId || !creatorUserId || isOwner) {
      setRestriction(null);
      return;
    }
    const { data } = await (supabase as any)
      .from("chat_moderation")
      .select("kind, expires_at")
      .eq("stream_creator_id", creatorUserId)
      .eq("target_user_id", viewerUserId);
    const rows = (data || []) as ChatRestriction[];
    const ban = rows.find((r) => r.kind === "ban");
    const timeout = rows.find(
      (r) => r.kind === "timeout" && r.expires_at && new Date(r.expires_at) > new Date()
    );
    setRestriction(ban || timeout || null);
  }, [viewerUserId, creatorUserId, isOwner]);

  useEffect(() => {
    refreshRestriction();
  }, [refreshRestriction]);

  // Auto-clear an expired timeout
  useEffect(() => {
    if (!restriction || restriction.kind !== "timeout" || !restriction.expires_at) return;
    const ms = new Date(restriction.expires_at).getTime() - Date.now();
    if (ms <= 0) {
      setRestriction(null);
      return;
    }
    const t = setTimeout(() => refreshRestriction(), ms + 500);
    return () => clearTimeout(t);
  }, [restriction, refreshRestriction]);

  // Realtime: lock the input as soon as a restriction lands on me
  useEffect(() => {
    if (!viewerUserId || isOwner) return;
    const channel = supabase
      .channel(`chat-moderation-${viewerUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_moderation",
          filter: `target_user_id=eq.${viewerUserId}`,
        },
        () => refreshRestriction()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewerUserId, isOwner, refreshRestriction]);

  // ── Slow mode (readable for public streams; owner can set) ──
  useEffect(() => {
    if (!streamId) return;
    (supabase as any)
      .from("mux_live_streams")
      .select("slow_mode_seconds")
      .eq("id", streamId)
      .maybeSingle()
      .then(({ data }: { data: { slow_mode_seconds?: number } | null }) => {
        setSlowModeSeconds(data?.slow_mode_seconds ?? 0);
      });
  }, [streamId]);

  const setSlowMode = useCallback(
    async (seconds: number): Promise<string | undefined> => {
      if (!streamId) return "No stream";
      const { error } = await (supabase as any)
        .from("mux_live_streams")
        .update({ slow_mode_seconds: seconds })
        .eq("id", streamId);
      if (!error) setSlowModeSeconds(seconds);
      return error?.message;
    },
    [streamId]
  );

  // ── Owner actions ──
  const deleteMessage = useCallback(async (messageId: string): Promise<string | undefined> => {
    const { error } = await supabase.from("live_chat_messages").delete().eq("id", messageId);
    return error?.message;
  }, []);

  const timeoutUser = useCallback(
    async (targetUserId: string, minutes = 5): Promise<string | undefined> => {
      if (!creatorUserId || !viewerUserId) return "Not authorized";
      const { error } = await (supabase as any).from("chat_moderation").upsert(
        {
          stream_creator_id: creatorUserId,
          target_user_id: targetUserId,
          kind: "timeout",
          expires_at: new Date(Date.now() + minutes * 60_000).toISOString(),
          created_by: viewerUserId,
        },
        { onConflict: "stream_creator_id,target_user_id,kind" }
      );
      return error?.message;
    },
    [creatorUserId, viewerUserId]
  );

  const banUser = useCallback(
    async (targetUserId: string): Promise<string | undefined> => {
      if (!creatorUserId || !viewerUserId) return "Not authorized";
      const { error } = await (supabase as any).from("chat_moderation").upsert(
        {
          stream_creator_id: creatorUserId,
          target_user_id: targetUserId,
          kind: "ban",
          expires_at: null,
          created_by: viewerUserId,
        },
        { onConflict: "stream_creator_id,target_user_id,kind" }
      );
      return error?.message;
    },
    [creatorUserId, viewerUserId]
  );

  return {
    isOwner,
    restriction,
    refreshRestriction,
    slowModeSeconds,
    setSlowMode,
    deleteMessage,
    timeoutUser,
    banUser,
  };
}
