import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFollows } from "@/hooks/useFollows";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

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
  durationSeconds: number;
  algorithmScore: number;
}

// ─── ALGORITHM ────────────────────────────────────────────────────────────────
const DECAY_LAMBDA = 0.08;

function timeDecay(createdAt: string): number {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  return Math.exp(-DECAY_LAMBDA * ageHours);
}

function recencyBoost(createdAt: string): number {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  if (ageHours < 6) return 3.0;
  if (ageHours < 24) return 2.0;
  if (ageHours < 48) return 1.5;
  if (ageHours < 168) return 1.2;
  return 1.0;
}

function computeAlgorithmScore(opts: {
  likes: number; comments: number; views: number; saves: number; shares: number;
  trendingScore: number; createdAt: string; isFollowing: boolean; isLongFormVideo: boolean;
}): number {
  const { likes, comments, views, saves, shares, trendingScore, createdAt, isFollowing, isLongFormVideo } = opts;
  const rawEngagement = (saves * 5) + (shares * 4) + (likes * 3) + (comments * 2) + (views * 1);
  const decay = timeDecay(createdAt);
  const recency = recencyBoost(createdAt);
  const following = isFollowing ? 1.4 : 1.0;
  const content = isLongFormVideo ? 1.2 : 1.0;
  const external = trendingScore * 0.5;
  return (rawEngagement * decay * recency * following * content) + external;
}

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
function isNew(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < FORTY_EIGHT_HOURS_MS;
}

export function useDiscoveryFeed(
  filter: FilterCategory = "all",
  sort: SortOption = "trending",
  search: string = "",
  liveOnly: boolean = false,
  feedTab: FeedTab = "foryou"
) {
  const { followingIds } = useFollows();
  const { user } = useAuth();

  useEffect(() => {
    const channel = supabase
      .channel("discovery-live-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "mux_live_streams" }, () => {})
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return useQuery({
    queryKey: ["discovery-feed-v2", filter, sort, search, liveOnly, feedTab, followingIds, user?.id],
    staleTime: 14_000,
    refetchInterval: 15_000,
    queryFn: async () => {
      const items: FeedItem[] = [];
      const followingSet = new Set(followingIds);
      const isFollowingTab = feedTab === "following";

      const [streamsRes, productsRes, spacesRes, creatorsRes, recordingsRes, clipsRes, videosRes] = await Promise.all([
        (filter === "all" || filter === "livestream")
          ? supabase.from("mux_live_streams_public").select("*").eq("is_public", true).eq("status", "active").order("viewer_count", { ascending: false }).limit(50)
          : Promise.resolve({ data: [], error: null }),
        (filter === "all" || filter === "course" || filter === "community" || filter === "service")
          ? supabase.from("products_public").select("*").order("created_at", { ascending: false }).limit(30)
          : Promise.resolve({ data: [], error: null }),
        (filter === "all" || filter === "community")
          ? supabase.from("creator_spaces").select("*").eq("is_public", true).order("created_at", { ascending: false }).limit(20)
          : Promise.resolve({ data: [], error: null }),
        (filter === "all" || filter === "creator")
          ? supabase.from("profiles_public").select("user_id, display_name, username, avatar_url, bio, creator_type, tier, tier_name, created_at").not("display_name", "is", null).order("created_at", { ascending: false }).limit(20)
          : Promise.resolve({ data: [], error: null }),
        (filter === "all" || filter === "livestream")
          ? supabase.from("stream_recordings").select("*").eq("is_published", true).order("created_at", { ascending: false }).limit(60)
          : Promise.resolve({ data: [], error: null }),
        (filter === "all" || filter === "livestream")
          ? supabase.from("clips").select("*").eq("is_public", true).order("created_at", { ascending: false }).limit(60)
          : Promise.resolve({ data: [], error: null }),
        (filter === "all" || filter === "livestream")
          ? supabase.from("videos").select("*").eq("is_public", true).order("created_at", { ascending: false }).limit(60)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const userIds = new Set<string>();
      if (streamsRes.data) (streamsRes.data as any[]).forEach(s => userIds.add(s.user_id));
      if (productsRes.data) (productsRes.data as any[]).forEach(p => userIds.add(p.user_id));
      if (spacesRes.data) (spacesRes.data as any[]).forEach(sp => userIds.add(sp.creator_id));
      if (recordingsRes.data) (recordingsRes.data as any[]).forEach(r => userIds.add(r.creator_id));
      if (clipsRes.data) (clipsRes.data as any[]).forEach(c => userIds.add(c.creator_id));
      if (videosRes.data) (videosRes.data as any[]).forEach((v: any) => userIds.add(v.creator_id));

      const [profilesRes, memberCountsRes] = await Promise.all([
        userIds.size > 0
          ? supabase.from("profiles_public").select("user_id, display_name, username, avatar_url, creator_type").in("user_id", Array.from(userIds))
          : Promise.resolve({ data: [] }),
        userIds.size > 0
          ? supabase.from("community_members").select("creator_id").in("creator_id", Array.from(userIds))
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map<string, { display_name: string | null; username: string | null; avatar_url: string | null; creator_type: string | null }>();
      if (profilesRes.data) {
        for (const p of profilesRes.data as any[]) profileMap.set(p.user_id, p);
      }

      const memberCountMap = new Map<string, number>();
      if (memberCountsRes.data) {
        for (const m of memberCountsRes.data as any[]) memberCountMap.set(m.creator_id, (memberCountMap.get(m.creator_id) || 0) + 1);
      }

      const getProfile = (userId: string) =>
        profileMap.get(userId) || { display_name: null, username: null, avatar_url: null, creator_type: null };

      // ── LIVESTREAMS ──
      let activeLiveCount = 0;
      if (streamsRes.data) {
        for (const s of streamsRes.data as any[]) {
          if (s.status !== "active") continue;
          activeLiveCount++;
          if (isFollowingTab && !followingSet.has(s.user_id)) continue;
          const p = getProfile(s.user_id);
          const isFollowing = followingSet.has(s.user_id);
          items.push({
            id: s.id, type: "livestream",
            title: s.title || "Untitled Stream", description: s.description,
            imageUrl: s.mux_playback_id ? `https://image.mux.com/${s.mux_playback_id}/thumbnail.webp?width=640&height=360&time=0` : null,
            price: 0, creatorId: s.user_id, creatorName: p.display_name || "Creator",
            creatorUsername: p.username || p.display_name, creatorAvatar: p.avatar_url, creatorType: p.creator_type,
            isLive: true, viewerCount: s.viewer_count || 0, memberCount: 0,
            engagementScore: (s.viewer_count || 0) * 10 + 500, trendingScore: s.trending_score || 0,
            createdAt: s.created_at, playbackId: s.mux_playback_id, spaceId: null, slug: s.slug,
            tier: "live", durationSeconds: 0,
            algorithmScore: 100_000 + (s.viewer_count || 0) * 100 + (isFollowing ? 50_000 : 0),
          });
        }
      }

      // ── VIDEOS ──
      if (videosRes.data && !liveOnly) {
        for (const v of videosRes.data as any[]) {
          if (isFollowingTab && !followingSet.has(v.creator_id)) continue;
          const p = getProfile(v.creator_id);
          const score = computeAlgorithmScore({
            likes: v.like_count || 0, comments: v.comment_count || 0, views: v.view_count || 0,
            saves: 0, shares: 0, trendingScore: v.trending_score || 0,
            createdAt: v.created_at, isFollowing: followingSet.has(v.creator_id), isLongFormVideo: true,
          });
          items.push({
            id: v.id, type: "video" as FeedItemType,
            title: v.title || "Untitled Video", description: v.description,
            imageUrl: v.playback_id ? `https://image.mux.com/${v.playback_id}/thumbnail.webp?width=640&height=360&time=2` : v.thumbnail_url,
            price: 0, creatorId: v.creator_id, creatorName: p.display_name || "Creator",
            creatorUsername: p.username || p.display_name, creatorAvatar: p.avatar_url, creatorType: p.creator_type,
            isLive: false, viewerCount: v.view_count || 0, memberCount: 0,
            engagementScore: score, trendingScore: v.trending_score || 0,
            createdAt: v.created_at, playbackId: v.playback_id, spaceId: null, slug: v.slug,
            tier: isNew(v.created_at) ? "new" : "trending",
            durationSeconds: v.duration_seconds || 0, algorithmScore: score,
          });
        }
      }

      // ── RECORDINGS ──
      if (recordingsRes.data && !liveOnly) {
        for (const r of recordingsRes.data as any[]) {
          if (isFollowingTab && !followingSet.has(r.creator_id)) continue;
          const p = getProfile(r.creator_id);
          const score = computeAlgorithmScore({
            likes: r.like_count || 0, comments: 0, views: r.view_count || 0,
            saves: 0, shares: r.share_count || 0, trendingScore: r.trending_score || 0,
            createdAt: r.created_at, isFollowing: followingSet.has(r.creator_id), isLongFormVideo: true,
          });
          items.push({
            id: r.id, type: "recording",
            title: r.title || "Untitled Recording", description: r.description,
            imageUrl: r.playback_id ? `https://image.mux.com/${r.playback_id}/thumbnail.webp?width=640&height=360&time=2` : null,
            price: r.is_free ? 0 : 5, creatorId: r.creator_id, creatorName: p.display_name || "Creator",
            creatorUsername: p.username || p.display_name, creatorAvatar: p.avatar_url, creatorType: p.creator_type,
            isLive: false, viewerCount: r.view_count || 0, memberCount: 0,
            engagementScore: score, trendingScore: r.trending_score || 0,
            createdAt: r.created_at, playbackId: r.playback_id, spaceId: null, slug: r.slug,
            tier: isNew(r.created_at) ? "new" : "trending",
            durationSeconds: r.duration_seconds || 0, algorithmScore: score,
          });
        }
      }

      // ── CLIPS ──
      if (clipsRes.data && !liveOnly) {
        for (const c of clipsRes.data as any[]) {
          if (isFollowingTab && !followingSet.has(c.creator_id)) continue;
          const p = getProfile(c.creator_id);
          const score = computeAlgorithmScore({
            likes: c.like_count || 0, comments: 0, views: c.view_count || 0,
            saves: 0, shares: c.share_count || 0, trendingScore: c.trending_score || 0,
            createdAt: c.created_at, isFollowing: followingSet.has(c.creator_id), isLongFormVideo: false,
          });
          items.push({
            id: c.id, type: "clip",
            title: c.caption || "Clip", description: null,
            imageUrl: c.clip_playback_id ? `https://image.mux.com/${c.clip_playback_id}/thumbnail.webp?width=640&height=360&time=1` : null,
            price: 0, creatorId: c.creator_id, creatorName: p.display_name || "Creator",
            creatorUsername: p.username || p.display_name, creatorAvatar: p.avatar_url, creatorType: p.creator_type,
            isLive: false, viewerCount: c.view_count || 0, memberCount: 0,
            engagementScore: score, trendingScore: c.trending_score || 0,
            createdAt: c.created_at, playbackId: c.clip_playback_id, spaceId: null, slug: c.slug,
            tier: isNew(c.created_at) ? "new" : "trending",
            durationSeconds: c.duration_seconds || 0, algorithmScore: score,
          });
        }
      }

      // ── PRODUCTS ──
      if (productsRes.data && !liveOnly) {
        for (const p of productsRes.data as any[]) {
          if (isFollowingTab && !followingSet.has(p.user_id)) continue;
          const pType: FeedItemType = p.type === "course" ? "course" : p.type === "community" ? "community" : "service";
          if (filter !== "all" && filter !== pType) continue;
          const memberCount = (p.sales || 0) + (memberCountMap.get(p.user_id) || 0);
          const prof = getProfile(p.user_id);
          const score = computeAlgorithmScore({
            likes: 0, comments: 0, views: p.sales || 0, saves: 0, shares: 0,
            trendingScore: 0, createdAt: p.created_at,
            isFollowing: followingSet.has(p.user_id), isLongFormVideo: false,
          });
          items.push({
            id: p.id, type: pType, title: p.name, description: p.description, imageUrl: p.image_url,
            price: p.price || 0, creatorId: p.user_id, creatorName: prof.display_name || "Creator",
            creatorUsername: prof.username || prof.display_name, creatorAvatar: prof.avatar_url, creatorType: prof.creator_type,
            isLive: false, viewerCount: 0, memberCount,
            engagementScore: score, trendingScore: 0, createdAt: p.created_at,
            playbackId: null, spaceId: null, slug: null,
            tier: isNew(p.created_at) ? "new" : "trending", durationSeconds: 0, algorithmScore: score,
          });
        }
      }

      // ── SPACES ──
      if (spacesRes.data && !liveOnly) {
        for (const sp of spacesRes.data as any[]) {
          if (isFollowingTab && !followingSet.has(sp.creator_id)) continue;
          if (items.some(i => i.type === "community" && i.creatorId === sp.creator_id)) continue;
          const spMemberCount = memberCountMap.get(sp.creator_id) || 0;
          const prof = getProfile(sp.creator_id);
          const score = computeAlgorithmScore({
            likes: 0, comments: 0, views: spMemberCount, saves: 0, shares: 0,
            trendingScore: 0, createdAt: sp.created_at,
            isFollowing: followingSet.has(sp.creator_id), isLongFormVideo: false,
          });
          items.push({
            id: sp.id, type: "community", title: sp.name, description: sp.description, imageUrl: sp.cover_image_url,
            price: sp.is_free ? 0 : sp.price || 0, creatorId: sp.creator_id, creatorName: prof.display_name || "Creator",
            creatorUsername: prof.username || prof.display_name, creatorAvatar: prof.avatar_url, creatorType: prof.creator_type,
            isLive: false, viewerCount: 0, memberCount: spMemberCount,
            engagementScore: score, trendingScore: 0, createdAt: sp.created_at,
            playbackId: null, spaceId: sp.id, slug: sp.slug,
            tier: isNew(sp.created_at) ? "new" : "trending", durationSeconds: 0, algorithmScore: score,
          });
        }
      }

      // ── CREATORS ──
      if (creatorsRes.data && !liveOnly) {
        for (const c of creatorsRes.data as any[]) {
          if (isFollowingTab && !followingSet.has(c.user_id)) continue;
          const score = computeAlgorithmScore({
            likes: 0, comments: 0, views: 0, saves: 0, shares: 0,
            trendingScore: 0, createdAt: c.created_at,
            isFollowing: followingSet.has(c.user_id), isLongFormVideo: false,
          });
          items.push({
            id: c.user_id, type: "creator", title: c.display_name || "Creator", description: c.bio, imageUrl: c.avatar_url,
            price: 0, creatorId: c.user_id, creatorName: c.display_name || "Creator",
            creatorUsername: c.username || c.display_name, creatorAvatar: c.avatar_url, creatorType: c.creator_type,
            isLive: false, viewerCount: 0, memberCount: 0,
            engagementScore: score, trendingScore: 0, createdAt: c.created_at,
            playbackId: null, spaceId: null, slug: null,
            tier: isNew(c.created_at) ? "new" : "trending", durationSeconds: 0, algorithmScore: score,
          });
        }
      }

      // ── SEARCH ──
      let filtered = items;
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(i =>
          i.title.toLowerCase().includes(q) ||
          i.creatorName.toLowerCase().includes(q) ||
          (i.description || "").toLowerCase().includes(q) ||
          (i.creatorType || "").toLowerCase().includes(q)
        );
      }

      // ── SORT ──
      const liveItems = filtered.filter(i => i.tier === "live").sort((a, b) => b.viewerCount - a.viewerCount);
      const nonLive = filtered.filter(i => i.tier !== "live");

      let sortedNonLive: FeedItem[];
      if (sort === "newest") {
        sortedNonLive = nonLive.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (sort === "popular") {
        sortedNonLive = nonLive.sort((a, b) => (b.viewerCount + b.memberCount) - (a.viewerCount + a.memberCount));
      } else if (sort === "price_low") {
        sortedNonLive = nonLive.sort((a, b) => a.price - b.price);
      } else if (sort === "price_high") {
        sortedNonLive = nonLive.sort((a, b) => b.price - a.price);
      } else {
        sortedNonLive = nonLive.sort((a, b) => b.algorithmScore - a.algorithmScore);
      }

      // Pin newest video to top when trending + no search
      let finalNonLive = sortedNonLive;
      if (sort === "trending" && !search) {
        const videoTypes: FeedItemType[] = ["video", "recording", "clip"];
        const newestVideo = [...nonLive]
          .filter(i => videoTypes.includes(i.type))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        if (newestVideo) {
          finalNonLive = [newestVideo, ...sortedNonLive.filter(i => i.id !== newestVideo.id)];
        }
      }

      return {
        live: liveItems,
        new: finalNonLive.filter(i => i.tier === "new"),
        trending: finalNonLive.filter(i => i.tier === "trending"),
        all: [...liveItems, ...finalNonLive],
        liveCount: activeLiveCount,
      };
    },
  });
}
