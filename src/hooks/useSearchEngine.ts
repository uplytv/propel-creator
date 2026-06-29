import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCuratedResults } from "@/lib/curatedSearch";

export interface SearchEngineResult {
  id: string;
  type: "video" | "clip" | "recording" | "creator" | "artist" | "page" | "blog" | "track";
  title: string;
  subtitle?: string;
  thumbnail?: string | null;
  link: string;
  combined_score: number;
}

export function useSearchEngine(term: string) {
  return useQuery({
    queryKey: ["search-engine", term],
    enabled: term.trim().length >= 2,
    queryFn: async (): Promise<SearchEngineResult[]> => {
      const t = `%${term.trim()}%`;

      // Log term (fire & forget)
      supabase.rpc("bump_trending_search", { p_term: term.trim() });

      const [videos, clips, recordings, creators] = await Promise.all([
        supabase.from("videos")
          .select("id, title, description, slug, thumbnail_url, playback_id, creator_id")
          .or(`title.ilike.${t},description.ilike.${t}`).eq("is_public", true).limit(20),
        supabase.from("clips")
          .select("id, caption, slug, clip_playback_id, creator_id")
          .ilike("caption", t).eq("is_public", true).limit(20),
        supabase.from("stream_recordings")
          .select("id, title, slug, playback_id, creator_id")
          .ilike("title", t).eq("is_published", true).limit(20),
        supabase.from("profiles_public")
          .select("user_id, display_name, username, avatar_url")
          .or(`display_name.ilike.${t},username.ilike.${t}`).limit(10),
      ]);

      const allContentIds = [
        ...(videos.data ?? []).map((v: any) => v.id),
        ...(clips.data ?? []).map((c: any) => c.id),
        ...(recordings.data ?? []).map((r: any) => r.id),
      ];
      const { data: scoresRaw } = allContentIds.length
        ? await supabase.from("video_discovery_scores").select("content_id, score").in("content_id", allContentIds)
        : { data: [] as any[] };
      const scoreMap = new Map((scoresRaw ?? []).map((s: any) => [s.content_id, Number(s.score)]));

      const score = (id: string, titleMatch: number) => {
        const ds = scoreMap.get(id) ?? 0;
        return titleMatch * 50 + ds;
      };

      const out: SearchEngineResult[] = [
        ...(videos.data ?? []).map((v: any) => ({
          id: v.id, type: "video" as const, title: v.title,
          subtitle: "Video",
          thumbnail: v.playback_id ? `https://image.mux.com/${v.playback_id}/thumbnail.jpg?width=320` : v.thumbnail_url,
          link: `/videos/${v.slug || v.id}`,
          combined_score: score(v.id, v.title?.toLowerCase().includes(term.toLowerCase()) ? 2 : 1),
        })),
        ...(clips.data ?? []).map((c: any) => ({
          id: c.id, type: "clip" as const, title: c.caption || "Clip",
          subtitle: "Short",
          thumbnail: c.clip_playback_id ? `https://image.mux.com/${c.clip_playback_id}/thumbnail.jpg?width=320` : null,
          link: `/clips/${c.slug || c.id}`,
          combined_score: score(c.id, 1),
        })),
        ...(recordings.data ?? []).map((r: any) => ({
          id: r.id, type: "recording" as const, title: r.title,
          subtitle: "Recording",
          thumbnail: r.playback_id ? `https://image.mux.com/${r.playback_id}/thumbnail.jpg?width=320` : null,
          link: `/stream/${r.slug || r.id}?type=recording`,
          combined_score: score(r.id, r.title?.toLowerCase().includes(term.toLowerCase()) ? 2 : 1),
        })),
        ...(creators.data ?? []).map((p: any) => ({
          id: p.user_id, type: "creator" as const,
          title: p.display_name || p.username || "Creator",
          subtitle: p.username ? `@${p.username}` : "Creator",
          thumbnail: p.avatar_url, link: `/creator/${p.username || p.user_id}`,
          combined_score: 100, // creators surface high
        })),
      ];

      out.sort((a, b) => b.combined_score - a.combined_score);
      return out;
    },
  });
}

export function useTrendingSearches(limit = 10) {
  return useQuery({
    queryKey: ["trending-searches", limit],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { data } = await supabase.from("trending_searches")
        .select("term, search_count")
        .gte("last_searched_at", since)
        .order("search_count", { ascending: false })
        .limit(limit);
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}
