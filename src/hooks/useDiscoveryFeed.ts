import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFollows } from "@/hooks/useFollows";
import { useEffect, useState } from "react";

export type FeedItemType = "livestream" | "community" | "course" | "service" | "creator" | "recording" | "clip" | "post" | "video";
export type FilterCategory = "all" | "livestream" | "community" | "course" | "service" | "creator";
export type SortOption = "trending" | "newest" | "popular" | "price_low" | "price_high";
export type FeedTab = "foryou" | "following";

export interface FeedItem {
  id: string;
  type: FeedItemType;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  creatorId: string;
  creatorName: string;
  creatorUsername: string | null;
  creatorAvatar: string | null;
  creatorType: string | null;
  isLive: boolean;
  viewerCount: number;
  memberCount: number;
  engagementScore: number;
  trendingScore: number;
  createdAt: string;
  playbackId: string | null;
  spaceId: string | null;
  slug: string | null;
  tier: "live" | "new" | "trending";
}

const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

function isNew(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < FORTY_EIGHT_HOURS;
}

export function useDiscoveryFeed(
  filter: FilterCategory = "all",
  sort: SortOption = "trending",
  search: string = "",
  liveOnly: boolean = false,
  feedTab: FeedTab = "foryou"
) {
  const { followingIds } = useFollows();
  const [liveCount, setLiveCount] = useState(0);

  // Realtime subscription for live stream changes
  useEffect(() => {
    const channel = supabase
      .channel('discovery-live-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mux_live_streams' },
        () => {
          // Trigger refetch by invalidating
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const query = useQuery({
    queryKey: ["discovery-feed", filter, sort, search, liveOnly, feedTab, followingIds],
    queryFn: async () => {
      const items: FeedItem[] = [];
      const followingSet = new Set(followingIds);
      const isFollowingTab = feedTab === "following";

      // Fetch in parallel
      const [streamsRes, productsRes, spacesRes, creatorsRes, recordingsRes, clipsRes, videosRes] = await Promise.all([
        // Live streams
        (filter === "all" || filter === "livestream")
          ? supabase
              .from("mux_live_streams_public" as any)
              .select("*")
              .eq("is_public", true)
              .order("viewer_count", { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [], error: null }),

        // Products
        (filter === "all" || filter === "course" || filter === "community" || filter === "service")
          ? supabase
              .from("products_public" as any)
              .select("*")
              .order("created_at", { ascending: false })
              .limit(30)
          : Promise.resolve({ data: [], error: null }),

        // Creator spaces
        (filter === "all" || filter === "community")
          ? supabase
              .from("creator_spaces")
              .select("*")
              .eq("is_public", true)
              .order("created_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [], error: null }),

        // Creators
        (filter === "all" || filter === "creator")
          ? supabase
              .from("profiles_public" as any)
              .select("user_id, display_name, username, avatar_url, bio, creator_type, tier, tier_name, created_at")
              .not("display_name", "is", null)
              .order("created_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [], error: null }),

        // Recordings (videos)
        (filter === "all" || filter === "livestream")
          ? supabase
              .from("stream_recordings")
              .select("*")
              .eq("is_published", true)
              .order("created_at", { ascending: false })
              .limit(30)
          : Promise.resolve({ data: [], error: null }),

        // Clips
        (filter === "all" || filter === "livestream")
          ? supabase
              .from("clips")
              .select("*")
              .eq("is_public", true)
              .order("created_at", { ascending: false })
              .limit(30)
          : Promise.resolve({ data: [], error: null }),

        // Standalone videos
        (filter === "all" || filter === "livestream")
          ? (supabase as any)
              .from("videos")
              .select("*")
              .eq("is_public", true)
              .order("created_at", { ascending: false })
              .limit(30)
          : Promise.resolve({ data: [], error: null }),
      ]);

      // Collect all unique user IDs
      const userIds = new Set<string>();
      if (streamsRes.data) (streamsRes.data as any[]).forEach((s) => userIds.add(s.user_id));
      if (productsRes.data) (productsRes.data as any[]).forEach((p) => userIds.add(p.user_id));
      if (spacesRes.data) (spacesRes.data as any[]).forEach((sp) => userIds.add(sp.creator_id));
      if (recordingsRes.data) (recordingsRes.data as any[]).forEach((r) => userIds.add(r.creator_id));
      if (clipsRes.data) (clipsRes.data as any[]).forEach((c) => userIds.add(c.creator_id));

      // Batch fetch profiles
      const [profilesRes, memberCountsRes] = await Promise.all([
        userIds.size > 0
          ? supabase
              .from("profiles_public" as any)
              .select("user_id, display_name, username, avatar_url, creator_type")
              .in("user_id", Array.from(userIds))
          : Promise.resolve({ data: [] }),
        userIds.size > 0
          ? supabase
              .from("community_members")
              .select("creator_id")
              .in("creator_id", Array.from(userIds))
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map<string, { display_name: string | null; username: string | null; avatar_url: string | null; creator_type: string | null }>();
      if (profilesRes.data) {
        for (const p of (profilesRes.data as any[])) {
          profileMap.set(p.user_id, p);
        }
      }

      const memberCountMap = new Map<string, number>();
      if (memberCountsRes.data) {
        for (const m of (memberCountsRes.data as any[])) {
          memberCountMap.set(m.creator_id, (memberCountMap.get(m.creator_id) || 0) + 1);
        }
      }

      // Helper
      const getProfile = (userId: string) => profileMap.get(userId) || { display_name: null, username: null, avatar_url: null, creator_type: null };

      // Map livestreams
      let activeLiveCount = 0;
      if (streamsRes.data) {
        for (const s of streamsRes.data as any[]) {
          const live = s.status === "active";
          if (live) activeLiveCount++;
          if (liveOnly && !live) continue;
          if (isFollowingTab && !followingSet.has(s.user_id)) continue;
          const p = getProfile(s.user_id);
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
            creatorName: p.display_name || "Creator",
            creatorUsername: p.username || p.display_name,
            creatorAvatar: p.avatar_url,
            creatorType: p.creator_type,
            isLive: live,
            viewerCount: s.viewer_count || 0,
            memberCount: 0,
            engagementScore: (s.viewer_count || 0) * 10 + (live ? 500 : 0),
            trendingScore: s.trending_score || 0,
            createdAt: s.created_at,
            playbackId: s.mux_playback_id,
            spaceId: null,
            slug: s.slug,
            tier: live ? "live" : isNew(s.created_at) ? "new" : "trending",
          });
        }
      }

      // Map recordings
      if (recordingsRes.data && !liveOnly) {
        for (const r of recordingsRes.data as any[]) {
          if (isFollowingTab && !followingSet.has(r.creator_id)) continue;
          const p = getProfile(r.creator_id);
          items.push({
            id: r.id,
            type: "recording",
            title: r.title || "Untitled Recording",
            description: r.description,
            imageUrl: r.playback_id
              ? `https://image.mux.com/${r.playback_id}/thumbnail.webp?width=640&height=360&time=2`
              : null,
            price: r.is_free ? 0 : 5,
            creatorId: r.creator_id,
            creatorName: p.display_name || "Creator",
            creatorUsername: p.username || p.display_name,
            creatorAvatar: p.avatar_url,
            creatorType: p.creator_type,
            isLive: false,
            viewerCount: r.view_count || 0,
            memberCount: 0,
            engagementScore: (r.view_count || 0) + (r.trending_score || 0),
            trendingScore: r.trending_score || 0,
            createdAt: r.created_at,
            playbackId: r.playback_id,
            spaceId: null,
            slug: r.slug,
            tier: isNew(r.created_at) ? "new" : "trending",
          });
        }
      }

      // Map clips
      if (clipsRes.data && !liveOnly) {
        for (const c of clipsRes.data as any[]) {
          if (isFollowingTab && !followingSet.has(c.creator_id)) continue;
          const p = getProfile(c.creator_id);
          items.push({
            id: c.id,
            type: "clip",
            title: c.caption || "Clip",
            description: null,
            imageUrl: c.clip_playback_id
              ? `https://image.mux.com/${c.clip_playback_id}/thumbnail.webp?width=640&height=360&time=1`
              : null,
            price: 0,
            creatorId: c.creator_id,
            creatorName: p.display_name || "Creator",
            creatorUsername: p.username || p.display_name,
            creatorAvatar: p.avatar_url,
            creatorType: p.creator_type,
            isLive: false,
            viewerCount: c.view_count || 0,
            memberCount: 0,
            engagementScore: (c.view_count || 0) + (c.like_count || 0) * 3 + (c.trending_score || 0),
            trendingScore: c.trending_score || 0,
            createdAt: c.created_at,
            playbackId: c.clip_playback_id,
            spaceId: null,
            slug: c.slug,
            tier: isNew(c.created_at) ? "new" : "trending",
          });
        }
      }

      // Map products
      if (productsRes.data && !liveOnly) {
        for (const p of productsRes.data as any[]) {
          if (isFollowingTab && !followingSet.has(p.user_id)) continue;
          const pType: FeedItemType =
            p.type === "course" ? "course" :
            p.type === "community" ? "community" : "service";
          if (filter !== "all" && filter !== pType) continue;
          const memberCount = (p.sales || 0) + (memberCountMap.get(p.user_id) || 0);
          const prof = getProfile(p.user_id);
          items.push({
            id: p.id,
            type: pType,
            title: p.name,
            description: p.description,
            imageUrl: p.image_url,
            price: p.price || 0,
            creatorId: p.user_id,
            creatorName: prof.display_name || "Creator",
            creatorUsername: prof.username || prof.display_name,
            creatorAvatar: prof.avatar_url,
            creatorType: prof.creator_type,
            isLive: false,
            viewerCount: 0,
            memberCount,
            engagementScore: memberCount * 8 + (p.revenue || 0) * 0.2 + (p.sales || 0) * 5,
            trendingScore: 0,
            createdAt: p.created_at,
            playbackId: null,
            spaceId: null,
            slug: null,
            tier: isNew(p.created_at) ? "new" : "trending",
          });
        }
      }

      // Map spaces
      if (spacesRes.data && !liveOnly) {
        for (const sp of spacesRes.data as any[]) {
          if (isFollowingTab && !followingSet.has(sp.creator_id)) continue;
          const alreadyHasCommunity = items.some(
            (i) => i.type === "community" && i.creatorId === sp.creator_id
          );
          if (alreadyHasCommunity) continue;
          const spMemberCount = memberCountMap.get(sp.creator_id) || 0;
          const prof = getProfile(sp.creator_id);
          items.push({
            id: sp.id,
            type: "community",
            title: sp.name,
            description: sp.description,
            imageUrl: sp.cover_image_url,
            price: sp.is_free ? 0 : sp.price || 0,
            creatorId: sp.creator_id,
            creatorName: prof.display_name || "Creator",
            creatorUsername: prof.username || prof.display_name,
            creatorAvatar: prof.avatar_url,
            creatorType: prof.creator_type,
            isLive: false,
            viewerCount: 0,
            memberCount: spMemberCount,
            engagementScore: spMemberCount * 10 + 50,
            trendingScore: 0,
            createdAt: sp.created_at,
            playbackId: null,
            spaceId: sp.id,
            slug: sp.slug,
            tier: isNew(sp.created_at) ? "new" : "trending",
          });
        }
      }

      // Map creators
      if (creatorsRes.data && !liveOnly) {
        for (const c of creatorsRes.data as any[]) {
          if (isFollowingTab && !followingSet.has(c.user_id)) continue;
          const isNewCreator = new Date(c.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
          items.push({
            id: c.user_id,
            type: "creator",
            title: c.display_name || "Creator",
            description: c.bio,
            imageUrl: c.avatar_url,
            price: 0,
            creatorId: c.user_id,
            creatorName: c.display_name || "Creator",
            creatorUsername: c.username || c.display_name,
            creatorAvatar: c.avatar_url,
            creatorType: c.creator_type,
            isLive: false,
            viewerCount: 0,
            memberCount: 0,
            engagementScore: (isNewCreator ? 200 : 0),
            trendingScore: 0,
            createdAt: c.created_at,
            playbackId: null,
            spaceId: null,
            slug: null,
            tier: isNew(c.created_at) ? "new" : "trending",
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

      // Apply tiered sorting: LIVE → NEW → TRENDING
      const liveItems = filtered.filter((i) => i.tier === "live")
        .sort((a, b) => b.viewerCount - a.viewerCount);
      const newItems = filtered.filter((i) => i.tier === "new" && !i.isLive)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const trendingItems = filtered.filter((i) => i.tier === "trending" && !i.isLive)
        .sort((a, b) => {
          if (sort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          if (sort === "popular") return (b.viewerCount + b.memberCount) - (a.viewerCount + a.memberCount);
          if (sort === "price_low") return a.price - b.price;
          if (sort === "price_high") return b.price - a.price;
          return b.engagementScore - a.engagementScore;
        });

      return {
        live: liveItems,
        new: newItems,
        trending: trendingItems,
        all: [...liveItems, ...newItems, ...trendingItems],
        liveCount: activeLiveCount,
      };
    },
    refetchInterval: 10000,
  });

  return query;
}
