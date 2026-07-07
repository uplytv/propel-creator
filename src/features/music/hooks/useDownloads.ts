import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Track } from "../types";

const sb = supabase;

export function useDownloadedTracks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["downloaded-tracks", user?.id],
    queryFn: async () => {
      if (!user) return [] as Track[];
      const { data } = await sb
        .from("music_downloads")
        .select("track_id, downloaded_at, tracks(*)")
        .eq("user_id", user.id)
        .order("downloaded_at", { ascending: false });
      return ((data as any[]) ?? []).map((r) => r.tracks).filter(Boolean) as Track[];
    },
    enabled: !!user,
  });
}

export function useIsDownloaded(trackId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["downloaded-track", trackId, user?.id],
    queryFn: async () => {
      if (!user || !trackId) return false;
      const { data } = await sb
        .from("music_downloads")
        .select("id")
        .eq("user_id", user.id)
        .eq("track_id", trackId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!trackId,
  });
}

export function useToggleDownload(trackId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to download");
      const { data: existing } = await sb
        .from("music_downloads")
        .select("id")
        .eq("user_id", user.id)
        .eq("track_id", trackId)
        .maybeSingle();
      if (existing) {
        const { error } = await sb.from("music_downloads").delete().eq("id", existing.id);
        if (error) throw error;
        return false;
      }
      const { error } = await sb
        .from("music_downloads")
        .insert({ user_id: user.id, track_id: trackId });
      if (error) throw error;
      return true;
    },
    onSuccess: (downloaded) => {
      qc.invalidateQueries({ queryKey: ["downloaded-track", trackId, user?.id] });
      qc.invalidateQueries({ queryKey: ["downloaded-tracks", user?.id] });
      toast({ title: downloaded ? "Saved for offline" : "Removed from downloads" });
    },
    onError: (e: any) => toast({ title: "Download failed", description: e.message, variant: "destructive" }),
  });
}
