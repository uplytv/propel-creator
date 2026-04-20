import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type DiscoveryTab = "for-you" | "trending" | "new";

export interface DiscoveryItem {
  content_id: string;
  content_type: "video" | "clip" | "recording";
  creator_id: string;
  category: string;
  score: number;
  watch_time_avg_pct: number;
  views: number;
  likes: number;
  is_new_creator_boosted: boolean;
  created_at: string;
  // joined
  title?: string;
  thumbnail_url?: string | null;
  playback_id?: string | null;
  slug?: string | null;
  duration_seconds?: number;
  creator?: { display_name?: string; username?: string; avatar_url?: string | null };
}

const PAGE = 50;

export function useDiscoveryAlgorithmFeed(tab: DiscoveryTab, category?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["discovery-feed", tab, category, user?.id],
    queryFn: async (): Promise<DiscoveryItem[]> => {
      let q = supabase.from("video_discovery_scores").select("*");

      if (category && category !== "all") q = q.eq("category", category);

      if (tab === "new") q = q.order("created_at", { ascending: false });
      else q = q.order("score", { ascending: false });

      const { data: scores } = await q.limit(PAGE);
      if (!scores || scores.length === 0) return [];

      // Personalize for-you with category affinity
      let ranked = scores;
      if (tab === "for-you" && user?.id) {
        const { data: affinities } = await supabase
          .from("viewer_category_affinity")
          .select("category, watch_count")
          .eq("viewer_id", user.id)
          .gte("watch_count", 3);
        const boosted = new Set((affinities ?? []).map((a) => a.category));
        ranked = scores
          .map((s) => ({ ...s, score: boosted.has(s.category) ? s.score * 1.3 : s.score }))
          .sort((a, b) => b.score - a.score);
      }

      // Hydrate metadata
      const ids = { video: [], clip: [], recording: [] } as Record<string, string[]>;
      ranked.forEach((r) => ids[r.content_type].push(r.content_id));

      const [videos, clips, recordings, profiles] = await Promise.all([
        ids.video.length ? supabase.from("videos")
          .select("id, title, thumbnail_url, playback_id, slug, duration_seconds")
          .in("id", ids.video) : Promise.resolve({ data: [] }),
        ids.clip.length ? supabase.from("clips")
          .select("id, caption, clip_playback_id, slug, duration_seconds")
          .in("id", ids.clip) : Promise.resolve({ data: [] }),
        ids.recording.length ? supabase.from("stream_recordings")
          .select("id, title, playback_id, slug, duration_seconds")
          .in("id", ids.recording) : Promise.resolve({ data: [] }),
        supabase.from("profiles_public")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", Array.from(new Set(ranked.map((r) => r.creator_id)))),
      ]);

      const vMap = new Map((videos.data ?? []).map((v: any) => [v.id, v]));
      const cMap = new Map((clips.data ?? []).map((c: any) => [c.id, c]));
      const rMap = new Map((recordings.data ?? []).map((r: any) => [r.id, r]));
      const pMap = new Map((profiles.data ?? []).map((p: any) => [p.user_id, p]));

      return ranked.map((r: any): DiscoveryItem => {
        let meta: any = null;
        if (r.content_type === "video") meta = vMap.get(r.content_id);
        else if (r.content_type === "clip") meta = cMap.get(r.content_id);
        else meta = rMap.get(r.content_id);

        const playback_id = meta?.playback_id ?? meta?.clip_playback_id ?? null;
        const thumb = playback_id ? `https://image.mux.com/${playback_id}/thumbnail.jpg?width=640` : meta?.thumbnail_url ?? null;
        return {
          ...r,
          title: meta?.title ?? meta?.caption ?? "Untitled",
          thumbnail_url: thumb,
          playback_id,
          slug: meta?.slug ?? null,
          duration_seconds: meta?.duration_seconds ?? 0,
          creator: pMap.get(r.creator_id),
        };
      }).filter((i) => i.playback_id); // hide rows whose source was deleted
    },
    staleTime: 60_000,
  });
}
