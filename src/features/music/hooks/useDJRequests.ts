import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface DJSongRequest {
  id: string;
  session_id: string;
  dj_id: string;
  fan_id: string;
  track_title: string;
  track_artist: string | null;
  message: string | null;
  tip_amount_cents: number;
  currency: string;
  status: "pending" | "playing" | "played" | "declined";
  position: number;
  created_at: string;
  fan_name?: string | null;
  fan_avatar?: string | null;
}

export function useDJRequestQueue(sessionId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["dj-requests", sessionId],
    queryFn: async () => {
      if (!sessionId) return [] as DJSongRequest[];
      const { data } = await supabase
        .from("dj_song_requests")
        .select("*")
        .eq("session_id", sessionId)
        .in("status", ["pending", "playing"])
        .order("status", { ascending: false })
        .order("tip_amount_cents", { ascending: false })
        .order("created_at", { ascending: true });
      const rows = (data as DJSongRequest[]) ?? [];
      const fanIds = [...new Set(rows.map((r) => r.fan_id))];
      if (fanIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id,display_name,avatar_url")
          .in("user_id", fanIds);
        const map = new Map<string, any>();
        (profiles ?? []).forEach((p: any) => map.set(p.user_id, p));
        rows.forEach((r) => {
          const p = map.get(r.fan_id);
          r.fan_name = p?.display_name ?? null;
          r.fan_avatar = p?.avatar_url ?? null;
        });
      }
      return rows;
    },
    enabled: !!sessionId,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`dj-req-${sessionId}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "dj_song_requests", filter: `session_id=eq.${sessionId}` },
        () => qc.invalidateQueries({ queryKey: ["dj-requests", sessionId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, qc]);

  return query;
}

export function useCreateDJRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: {
      session_id: string;
      dj_id: string;
      track_title: string;
      track_artist?: string;
      message?: string;
      tip_amount_cents?: number;
      currency?: string;
    }) => {
      if (!user) throw new Error("Sign in to request a song");
      const { data, error } = await supabase
        .from("dj_song_requests")
        .insert({
          session_id: params.session_id,
          dj_id: params.dj_id,
          fan_id: user.id,
          track_title: params.track_title,
          track_artist: params.track_artist ?? null,
          message: params.message ?? null,
          tip_amount_cents: params.tip_amount_cents ?? 0,
          currency: params.currency ?? "usd",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["dj-requests", vars.session_id] }),
  });
}

export function useUpdateDJRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      session_id,
      status,
    }: {
      id: string;
      session_id: string;
      status: DJSongRequest["status"];
    }) => {
      const { error } = await supabase
        .from("dj_song_requests")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      return session_id;
    },
    onSuccess: (sessionId) =>
      qc.invalidateQueries({ queryKey: ["dj-requests", sessionId] }),
  });
}

export function useCancelDJRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, session_id }: { id: string; session_id: string }) => {
      const { error } = await supabase
        .from("dj_song_requests")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return session_id;
    },
    onSuccess: (sessionId) =>
      qc.invalidateQueries({ queryKey: ["dj-requests", sessionId] }),
  });
}
