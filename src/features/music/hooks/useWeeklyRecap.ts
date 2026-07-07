import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { Track } from "../types";

const sb = supabase;

export interface WeeklyRecap {
  totalPlays: number;
  estimatedMinutes: number;
  topTracks: Track[];
  topArtists: Array<{ creator_id: string; display_name: string; avatar_url: string | null; plays: number }>;
}

export function useWeeklyRecap() {
  const { user } = useAuth();
  return useQuery<WeeklyRecap | null>({
    queryKey: ["music-weekly-recap", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400_000).toISOString();
      const { data: rows } = await sb
        .from("music_recently_played")
        .select("track_id, played_at")
        .eq("user_id", user!.id)
        .gte("played_at", since)
        .limit(2000);

      const plays = (rows as { track_id: string }[]) ?? [];
      if (!plays.length) return null;

      const counts = new Map<string, number>();
      for (const p of plays) counts.set(p.track_id, (counts.get(p.track_id) ?? 0) + 1);

      const ids = Array.from(counts.keys());
      const { data: tracks } = await sb.from("tracks").select("*").in("id", ids);
      const tracksList = (tracks as Track[]) ?? [];
      const tMap = new Map(tracksList.map((t) => [t.id, t]));

      const topTracks = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => tMap.get(id))
        .filter(Boolean) as Track[];

      const artistCounts = new Map<string, number>();
      for (const [tid, c] of counts.entries()) {
        const t = tMap.get(tid);
        if (!t) continue;
        artistCounts.set(t.creator_id, (artistCounts.get(t.creator_id) ?? 0) + c);
      }
      const artistIds = Array.from(artistCounts.keys());
      const { data: profiles } = await sb
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", artistIds);
      const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      const topArtists = Array.from(artistCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, c]) => {
          const p: any = pMap.get(id);
          return {
            creator_id: id,
            display_name: p?.display_name || p?.username || "Unknown",
            avatar_url: p?.avatar_url ?? null,
            plays: c,
          };
        });

      const estimatedMinutes = Math.round(
        plays.reduce((acc, p) => acc + ((tMap.get(p.track_id)?.duration_seconds ?? 180) / 60), 0)
      );

      return {
        totalPlays: plays.length,
        estimatedMinutes,
        topTracks,
        topArtists,
      };
    },
  });
}
