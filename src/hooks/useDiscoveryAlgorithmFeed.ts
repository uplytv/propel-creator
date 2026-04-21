import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type DiscoveryTab =
  | "for-you"
  | "trending"
  | "new"
  | "following"
  | "live"
  | "category";

export type DiscoveryContentType =
  | "video"
  | "clip"
  | "recording"
  | "stream"
  | "post"
  | "product"
  | "podcast"
  | "event";

export interface DiscoveryItem {
  content_id: string;
  content_type: DiscoveryContentType;
  creator_id: string;
  category: string;
  score: number;
  watch_time_avg_pct: number;
  views: number;
  likes: number;
  is_new_creator_boosted: boolean;
  is_live?: boolean;
  is_boosted?: boolean;
  boost_tier?: string | null;
  boost_expires_at?: string | null;
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

      // Tab-specific filters
      if (tab === "live") {
        q = q.eq("is_live", true).order("score", { ascending: false });
      } else if (tab === "new") {
        q = q.eq("is_new_creator_boosted", true).order("score", { ascending: false });
      } else if (tab === "following" && user?.id) {
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);
        const ids = (follows ?? []).map((f: any) => f.following_id);
        if (ids.length === 0) return [];
        q = q.in("creator_id", ids).order("created_at", { ascending: false });
      } else if (tab === "trending") {
        q = q.order("momentum_score", { ascending: false, nullsFirst: false }).order("score", { ascending: false });
      } else {
        q = q.order("score", { ascending: false });
      }

      const { data: scores } = await q.limit(PAGE);
      if (!scores || scores.length === 0) return [];

      // Personalize for-you with category affinity
      let ranked: any[] = scores;
      if (tab === "for-you" && user?.id) {
        const { data: affinities } = await supabase
          .from("viewer_category_affinity")
          .select("category, watch_count")
          .eq("viewer_id", user.id)
          .gte("watch_count", 3);
        const boosted = new Set((affinities ?? []).map((a: any) => a.category));
        ranked = scores
          .map((s: any) => ({ ...s, score: boosted.has(s.category) ? s.score * 1.4 : s.score }))
          .sort((a: any, b: any) => b.score - a.score);
      }

      // Paid Discovery Boost: promote active-boosted content to the top.
      // Tier weight: pro > growth > starter. Skipped for "following" feed.
      if (tab !== "following") {
        const nowIso = new Date().toISOString();
        const { data: boosts } = await supabase
          .from("content_boosts")
          .select("content_id, content_type, tier, starts_at, expires_at, status")
          .eq("status", "active")
          .gt("expires_at", nowIso);

        const tierWeight: Record<string, number> = { pro: 3, growth: 2, starter: 1 };
        const boostMap = new Map<string, { tier: string; weight: number }>();
        (boosts ?? []).forEach((b: any) => {
          const key = `${b.content_type}:${b.content_id}`;
          const w = tierWeight[b.tier] ?? 1;
          const existing = boostMap.get(key);
          if (!existing || w > existing.weight) boostMap.set(key, { tier: b.tier, weight: w });
        });

        if (boostMap.size > 0) {
          ranked = ranked.map((r: any) => {
            const b = boostMap.get(`${r.content_type}:${r.content_id}`);
            return b ? { ...r, is_boosted: true, boost_tier: b.tier, _boostWeight: b.weight } : r;
          });
          // Stable sort: boosted first by weight desc, then by score desc
          ranked.sort((a: any, b: any) => {
            const aw = a._boostWeight ?? 0;
            const bw = b._boostWeight ?? 0;
            if (aw !== bw) return bw - aw;
            return (b.score ?? 0) - (a.score ?? 0);
          });
        }
      }

      // Bucket IDs by content_type for hydration
      const ids: Record<string, string[]> = {
        video: [], clip: [], recording: [], stream: [],
        post: [], product: [], podcast: [], event: [],
      };
      ranked.forEach((r) => { if (ids[r.content_type]) ids[r.content_type].push(r.content_id); });

      const fetchIfAny = (table: string, cols: string, list: string[]) =>
        list.length ? supabase.from(table as any).select(cols).in("id", list) : Promise.resolve({ data: [] as any[] });

      const [videos, clips, recordings, streams, posts, products, podcasts, events, profiles] = await Promise.all([
        fetchIfAny("videos", "id, title, thumbnail_url, playback_id, slug, duration_seconds", ids.video),
        fetchIfAny("clips", "id, caption, clip_playback_id, slug, duration_seconds", ids.clip),
        fetchIfAny("stream_recordings", "id, title, playback_id, slug, duration_seconds", ids.recording),
        fetchIfAny("mux_live_streams", "id, title, slug, status", ids.stream),
        fetchIfAny("community_posts", "id, title, image_url, slug, creator_id", ids.post),
        fetchIfAny("products", "id, name, image_url", ids.product),
        fetchIfAny("podcast_episodes", "id, title, audio_url, podcast_id", ids.podcast),
        fetchIfAny("events", "id, title, slug, cover_image_url, start_at", ids.event),
        supabase.from("profiles_public")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", Array.from(new Set(ranked.map((r) => r.creator_id)))),
      ]);

      const maps: Record<string, Map<string, any>> = {
        video: new Map((videos.data ?? []).map((v: any) => [v.id, v])),
        clip: new Map((clips.data ?? []).map((c: any) => [c.id, c])),
        recording: new Map((recordings.data ?? []).map((r: any) => [r.id, r])),
        stream: new Map((streams.data ?? []).map((s: any) => [s.id, s])),
        post: new Map((posts.data ?? []).map((p: any) => [p.id, p])),
        product: new Map((products.data ?? []).map((p: any) => [p.id, p])),
        podcast: new Map((podcasts.data ?? []).map((p: any) => [p.id, p])),
        event: new Map((events.data ?? []).map((e: any) => [e.id, e])),
      };
      const pMap = new Map((profiles.data ?? []).map((p: any) => [p.user_id, p]));

      return ranked
        .map((r: any): DiscoveryItem | null => {
          const meta: any = maps[r.content_type]?.get(r.content_id);
          if (!meta && r.content_type !== "post") {
            // For non-post types, drop if source is missing — but allow rows from video_discovery_scores own title fallback
            if (!r.title) return null;
          }
          const playback_id = meta?.playback_id ?? meta?.clip_playback_id ?? null;
          const thumb =
            meta?.image_url ??
            meta?.thumbnail_url ??
            meta?.cover_image_url ??
            r.thumbnail_url ??
            (playback_id ? `https://image.mux.com/${playback_id}/thumbnail.jpg?width=640` : null);
          return {
            ...r,
            title: meta?.title ?? meta?.caption ?? meta?.name ?? r.title ?? "Untitled",
            thumbnail_url: thumb,
            playback_id,
            slug: meta?.slug ?? null,
            duration_seconds: meta?.duration_seconds ?? 0,
            creator: pMap.get(r.creator_id),
          };
        })
        .filter(Boolean) as DiscoveryItem[];
    },
    staleTime: 30_000,
  });
}
