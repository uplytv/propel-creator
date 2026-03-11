import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FeedItemType = "livestream" | "community" | "course" | "service" | "creator";
export type FilterCategory = "all" | "livestream" | "community" | "course" | "service" | "creator";
export type SortOption = "trending" | "newest" | "popular" | "price_low" | "price_high";

export interface FeedItem {
  id: string;
  type: FeedItemType;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string | null;
  creatorType: string | null;
  isLive: boolean;
  viewerCount: number;
  memberCount: number;
  engagementScore: number;
  createdAt: string;
  playbackId: string | null;
  spaceId: string | null;
}

export function useDiscoveryFeed(
  filter: FilterCategory = "all",
  sort: SortOption = "trending",
  search: string = "",
  liveOnly: boolean = false
) {
  return useQuery({
    queryKey: ["discovery-feed", filter, sort, search, liveOnly],
    queryFn: async () => {
      const items: FeedItem[] = [];

      // Fetch in parallel
      const [streamsRes, productsRes, spacesRes, creatorsRes] = await Promise.all([
        // Live streams
        (filter === "all" || filter === "livestream")
          ? supabase
              .from("mux_live_streams")
              .select("*, profiles!inner(display_name, avatar_url, creator_type)")
              .eq("is_public", true)
              .order("viewer_count", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [], error: null }),

        // Products (courses, communities, services)
        (filter === "all" || filter === "course" || filter === "community" || filter === "service")
          ? supabase
              .from("products")
              .select("*, profiles!inner(display_name, avatar_url, creator_type)")
              .eq("status", "active")
              .order("sales", { ascending: false })
              .limit(30)
          : Promise.resolve({ data: [], error: null }),

        // Creator spaces
        (filter === "all" || filter === "community")
          ? supabase
              .from("creator_spaces")
              .select("*, profiles!inner(display_name, avatar_url, creator_type)")
              .eq("is_public", true)
              .order("created_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [], error: null }),

        // Trending creators
        (filter === "all" || filter === "creator")
          ? supabase
              .from("profiles")
              .select("user_id, display_name, avatar_url, bio, creator_type, members, total_revenue, created_at")
              .not("display_name", "is", null)
              .order("total_revenue", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [], error: null }),
      ]);

      // Map livestreams
      if (streamsRes.data) {
        for (const s of streamsRes.data as any[]) {
          const isLive = s.status === "active";
          if (liveOnly && !isLive) continue;
          items.push({
            id: s.id,
            type: "livestream",
            title: s.title || "Untitled Stream",
            description: s.description,
            imageUrl: s.mux_playback_id
              ? `https://image.mux.com/${s.mux_playback_id}/thumbnail.webp?width=640&height=360&time=0`
              : null,
            price: 0,
            creatorId: s.user_id,
            creatorName: s.profiles?.display_name || "Creator",
            creatorAvatar: s.profiles?.avatar_url,
            creatorType: s.profiles?.creator_type,
            isLive,
            viewerCount: s.viewer_count || 0,
            memberCount: 0,
            engagementScore: (s.viewer_count || 0) * 10 + (isLive ? 500 : 0),
            createdAt: s.created_at,
            playbackId: s.mux_playback_id,
            spaceId: null,
          });
        }
      }

      // Map products
      if (productsRes.data) {
        for (const p of productsRes.data as any[]) {
          if (liveOnly) continue;
          const pType: FeedItemType =
            p.type === "course" ? "course" :
            p.type === "community" ? "community" : "service";
          if (filter !== "all" && filter !== pType) continue;
          items.push({
            id: p.id,
            type: pType,
            title: p.name,
            description: p.description,
            imageUrl: p.image_url,
            price: p.price || 0,
            creatorId: p.user_id,
            creatorName: p.profiles?.display_name || "Creator",
            creatorAvatar: p.profiles?.avatar_url,
            creatorType: p.profiles?.creator_type,
            isLive: false,
            viewerCount: 0,
            memberCount: p.sales || 0,
            engagementScore: (p.sales || 0) * 5 + (p.revenue || 0) * 0.1,
            createdAt: p.created_at,
            playbackId: null,
            spaceId: null,
          });
        }
      }

      // Map spaces
      if (spacesRes.data) {
        for (const sp of spacesRes.data as any[]) {
          if (liveOnly) continue;
          // Avoid duplicating if we already have a community product for this creator
          const alreadyHasCommunity = items.some(
            (i) => i.type === "community" && i.creatorId === sp.creator_id
          );
          if (alreadyHasCommunity) continue;
          items.push({
            id: sp.id,
            type: "community",
            title: sp.name,
            description: sp.description,
            imageUrl: sp.cover_image_url,
            price: sp.is_free ? 0 : sp.price || 0,
            creatorId: sp.creator_id,
            creatorName: sp.profiles?.display_name || "Creator",
            creatorAvatar: sp.profiles?.avatar_url,
            creatorType: sp.profiles?.creator_type,
            isLive: false,
            viewerCount: 0,
            memberCount: 0,
            engagementScore: 50,
            createdAt: sp.created_at,
            playbackId: null,
            spaceId: sp.id,
          });
        }
      }

      // Map creators
      if (creatorsRes.data) {
        for (const c of creatorsRes.data as any[]) {
          if (liveOnly) continue;
          const isNew =
            new Date(c.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
          items.push({
            id: c.user_id,
            type: "creator",
            title: c.display_name || "Creator",
            description: c.bio,
            imageUrl: c.avatar_url,
            price: 0,
            creatorId: c.user_id,
            creatorName: c.display_name || "Creator",
            creatorAvatar: c.avatar_url,
            creatorType: c.creator_type,
            isLive: false,
            viewerCount: 0,
            memberCount: c.members || 0,
            engagementScore:
              (c.total_revenue || 0) * 0.01 +
              (c.members || 0) * 3 +
              (isNew ? 200 : 0),
            createdAt: c.created_at,
            playbackId: null,
            spaceId: null,
          });
        }
      }

      // Search filter
      let filtered = items;
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            i.creatorName.toLowerCase().includes(q) ||
            (i.description || "").toLowerCase().includes(q) ||
            (i.creatorType || "").toLowerCase().includes(q)
        );
      }

      // Sort
      switch (sort) {
        case "trending":
          filtered.sort((a, b) => b.engagementScore - a.engagementScore);
          break;
        case "newest":
          filtered.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          break;
        case "popular":
          filtered.sort(
            (a, b) =>
              b.viewerCount + b.memberCount - (a.viewerCount + a.memberCount)
          );
          break;
        case "price_low":
          filtered.sort((a, b) => a.price - b.price);
          break;
        case "price_high":
          filtered.sort((a, b) => b.price - a.price);
          break;
      }

      // Boost live streams to top in trending
      if (sort === "trending") {
        const live = filtered.filter((i) => i.isLive);
        const rest = filtered.filter((i) => !i.isLive);
        filtered = [...live, ...rest];
      }

      return filtered;
    },
    refetchInterval: 30000,
  });
}
