import { motion, AnimatePresence } from "framer-motion";
import { Radio, Search, Play, Film, Scissors, Users, ChevronRight, Eye, Flame, TrendingUp, Tv, MessageCircle, Smartphone } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import StreamCardNew from "@/components/live/StreamCardNew";

import { useFollows } from "@/hooks/useFollows";
import { CATEGORY_BUCKETS, countByBucket } from "@/lib/streamCategories";

// ─── Types ──────────────────────────────────────────────────────
interface LiveStream {
  id: string;
  user_id: string;
  mux_stream_id: string;
  mux_playback_id: string | null;
  stream_key: string | null;
  status: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  is_public: boolean | null;
  viewer_count: number | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string | null;
  energy_score?: number;
  /** Discovery Engine V2 score (video_discovery_scores.score, cron-refreshed). */
  discovery_score?: number;
  creator_name?: string;
  creator_avatar?: string;
  creator_tier?: number;
  creator_tier_name?: string;
}

const SECTION_TABS = [
  { id: "live", label: "Live Now", icon: Radio },
  { id: "shorts", label: "Shorts", icon: Smartphone },
  { id: "clips", label: "Clips", icon: Scissors },
  { id: "recordings", label: "Replays", icon: Film },
  { id: "community", label: "Community", icon: Users },
] as const;

const STREAM_TABS = [
  { id: "foryou", label: "For You" },
  { id: "following", label: "Following" },
  { id: "categories", label: "Categories" },
] as const;

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

function formatViewers(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();
}

export default function Live() {
  const { user } = useAuth();
  const { followingIds } = useFollows();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState("live");
  const [activeStreamTab, setActiveStreamTab] = useState("foryou");
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [vodAssets, setVodAssets] = useState<any[]>([]);
  const [clips, setClips] = useState<any[]>([]);
  const [shorts, setShorts] = useState<any[]>([]);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const categoriesRef = useRef<HTMLDivElement>(null);

  // ─── Fetch Live Streams ─────────────────────────────────────
  const fetchLiveStreams = async () => {
    const { data: streams } = await supabase
      .from('mux_live_streams')
      .select('*')
      .eq('status', 'active')
      .eq('is_public', true);

    if (!streams || streams.length === 0) {
      setLiveStreams([]);
      setCategoryCounts({});
      return;
    }

    const userIds = [...new Set(streams.map((s: any) => s.user_id))];
    const streamIds = streams.map((s: any) => s.id);
    // Profiles + Discovery Engine V2 scores (recalculated every 5 min by the
    // recalculate-discovery-scores cron; live streams are floored at 30).
    const [{ data: profiles }, { data: scoreRows }] = await Promise.all([
      supabase
        .from('profiles_public')
        .select('user_id, display_name, avatar_url, tier, tier_name')
        .in('user_id', userIds),
      supabase
        .from('video_discovery_scores')
        .select('content_id, score')
        .eq('content_type', 'stream')
        .in('content_id', streamIds),
    ]);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const scoreMap = new Map((scoreRows || []).map((r: any) => [r.content_id, Number(r.score) || 0]));

    const enriched = streams.map((s: any) => {
      const profile = profileMap.get(s.user_id);
      return {
        ...s,
        discovery_score: scoreMap.get(s.id) ?? 0,
        creator_name: profile?.display_name || 'Creator',
        creator_avatar: profile?.avatar_url || '',
        creator_tier: profile?.tier || 1,
        creator_tier_name: profile?.tier_name || 'Starter',
      };
    });
    setLiveStreams(enriched);

    // Real per-bucket counts from the shared taxonomy (no substring guessing).
    setCategoryCounts(countByBucket(streams.map((s: any) => s.category)));
  };

  // ─── Fetch Clips ────────────────────────────────────────────
  const fetchClips = async () => {
    const { data } = await supabase
      .from('clips')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(12);
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c: any) => c.creator_id))];
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setClips(data.map((c: any) => ({
        ...c,
        creator_name: profileMap.get(c.creator_id)?.display_name || 'Creator',
        creator_avatar: profileMap.get(c.creator_id)?.avatar_url,
      })));
    }
  };

  // ─── Fetch Shorts ───────────────────────────────────────────
  const fetchShorts = async () => {
    const { data } = await supabase
      .from('shorts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((s: any) => s.creator_id))];
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setShorts(data.map((s: any) => ({
        ...s,
        creator_name: profileMap.get(s.creator_id)?.display_name || 'Creator',
        creator_avatar: profileMap.get(s.creator_id)?.avatar_url,
      })));
    }
  };

  // ─── Fetch Recordings ───────────────────────────────────────
  const fetchRecordings = async () => {
    const { data } = await supabase
      .from('stream_recordings')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(12);
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((r: any) => r.creator_id))];
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setRecordings(data.map((r: any) => ({
        ...r,
        creator_name: profileMap.get(r.creator_id)?.display_name || 'Creator',
        creator_avatar: profileMap.get(r.creator_id)?.avatar_url,
      })));
    }
  };

  // ─── Fetch Community Posts ──────────────────────────────────
  const fetchCommunityPosts = async () => {
    const { data } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((p: any) => p.author_id))];
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setCommunityPosts(data.map((p: any) => ({
        ...p,
        author_name: profileMap.get(p.author_id)?.display_name || 'Member',
        author_avatar: profileMap.get(p.author_id)?.avatar_url,
      })));
    }
  };

  // ─── Fetch VOD ──────────────────────────────────────────────
  const fetchVodAssets = async () => {
    const { data: assets } = await supabase
      .from('mux_assets')
      .select('*')
      .eq('is_public', true)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(12);
    if (assets && assets.length > 0) {
      const userIds = [...new Set(assets.map((a: any) => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setVodAssets(assets.map((a: any) => ({
        ...a,
        creator_name: profileMap.get(a.user_id)?.display_name || 'Creator',
        creator_avatar: profileMap.get(a.user_id)?.avatar_url,
      })));
    }
  };

  useEffect(() => {
    Promise.all([fetchLiveStreams(), fetchVodAssets(), fetchClips(), fetchShorts(), fetchRecordings(), fetchCommunityPosts()])
      .catch((e) => console.error("[Live] initial load failed", e))
      .finally(() => setLoading(false));

    const channel = supabase
      .channel('live-hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mux_live_streams' }, fetchLiveStreams)
      .subscribe();

    const poll = setInterval(fetchLiveStreams, 5000);
    return () => { clearInterval(poll); supabase.removeChannel(channel); };
  }, []);

  // ─── Stream formatting ─────────────────────────────────────
  const toMockFormat = (s: LiveStream) => ({
    id: s.id,
    userId: s.user_id,
    creatorName: s.creator_name || 'Creator',
    creatorAvatar: s.creator_avatar || 'CR',
    creatorTier: s.creator_tier || 1,
    creatorTierName: s.creator_tier_name || 'Starter',
    title: s.title || 'Untitled Stream',
    category: s.category || 'General',
    viewers: s.viewer_count || 0,
    // Energy = Discovery Engine V2 score; mux_live_streams.energy_score is a
    // legacy column that is never written (always 0), so it's only a fallback.
    energyScore: (s.discovery_score ?? 0) > 0 ? (s.discovery_score as number) : (s.energy_score || 0),
    startedAtMs: s.started_at ? new Date(s.started_at).getTime() : 0,
    isLive: s.status === 'active',
    isPublic: s.is_public ?? true,
    thumbnailGradient: '',
    communityPrice: 0,
    startedAt: s.started_at ? getTimeAgo(s.started_at) : 'just now',
    description: s.description || '',
    muxPlaybackId: s.mux_playback_id,
    isPpv: !!(s as any).is_ppv,
    ppvPrice: (s as any).ppv_price ?? null,
  });

  // For You ranking: followed creators first, then energy (discovery score)
  // desc, then live viewers desc, then most recently started.
  const followingSet = new Set(followingIds);
  const rankStreams = <T extends { userId: string; energyScore: number; viewers: number; startedAtMs: number }>(list: T[]): T[] =>
    [...list].sort((a, b) => {
      const aFollowed = followingSet.has(a.userId) ? 1 : 0;
      const bFollowed = followingSet.has(b.userId) ? 1 : 0;
      if (aFollowed !== bFollowed) return bFollowed - aFollowed;
      if (a.energyScore !== b.energyScore) return b.energyScore - a.energyScore;
      if (a.viewers !== b.viewers) return b.viewers - a.viewers;
      return b.startedAtMs - a.startedAtMs;
    });

  const hasLiveStreams = liveStreams.length > 0;
  const allStreams = liveStreams.map(toMockFormat);
  let filtered = search
    ? allStreams.filter(s => s.title.toLowerCase().includes(search.toLowerCase()) || s.creatorName.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()))
    : allStreams;
  if (activeStreamTab === "following" && hasLiveStreams) {
    filtered = filtered.filter(s => 'userId' in s && followingIds.includes((s as any).userId));
  }
  filtered = rankStreams(filtered);
  const liveCount = liveStreams.length;

  // Hero stream = top of the For You ranking (followed > energy > viewers > recency)
  const heroStream = filtered.length > 0 ? filtered[0] : null;
  const gridStreams = heroStream ? filtered.filter(s => s.id !== heroStream.id) : filtered;

  const totalViewers = allStreams.reduce((sum, s) => sum + s.viewers, 0);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Live Hub" description="Watch live streams, clips, replays, and connect with the creator community on Uply." />

      {/* ─── Top Nav ────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="UPLY" className="h-[60px] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate("/")} loading="eager" />
            <span className="text-foreground/10">|</span>
            <div className="flex items-center gap-1.5 text-primary">
              <Radio className="w-4 h-4" />
              <span className="text-sm font-semibold">Live Hub</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search streams, creators, clips..."
                className="w-full rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 border border-border"  />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button size="sm" onClick={() => navigate("/go-live")} className="bg-primary text-primary-foreground font-bold hover:brightness-110 border-0">
                  <Radio className="w-3.5 h-3.5 mr-1.5" />Go Live
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => navigate("/dashboard")}>Dashboard</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => navigate("/auth")}>Log in</Button>
                <Button size="sm" className="bg-primary text-primary-foreground font-bold hover:brightness-110 border-0" onClick={() => navigate("/auth")}>Start Free</Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Mobile Search ──────────────────────────────────── */}
      <div className="md:hidden pt-16 px-4 pb-2 bg-background">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
            className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 border border-border"  />
        </div>
      </div>

      <div className="pt-4 md:pt-20 pb-24">
        <div className="container">

          {/* ─── Stats Bar ─────────────────────────────────── */}
          <div className="flex items-center gap-4 mb-6 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs font-semibold text-foreground">{liveCount} Live</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card flex-shrink-0">
              <Eye className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{formatViewers(totalViewers)} watching</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card flex-shrink-0">
              <Scissors className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{clips.length} clips</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card flex-shrink-0">
              <Film className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{recordings.length + vodAssets.length} replays</span>
            </div>
          </div>

          {/* ─── Hero Stream ───────────────────────────────── */}
          {heroStream && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 cursor-pointer group"
              onClick={() => navigate(`/stream/${heroStream.id}`)}
            >
              <div className="relative rounded-xl overflow-hidden border border-border group-hover:border-primary/40 transition-all">
                <div className="aspect-[21/9] sm:aspect-[21/9] bg-card relative">
                  {heroStream.muxPlaybackId ? (
                    <img src={`https://image.mux.com/${heroStream.muxPlaybackId}/thumbnail.jpg?time=0&width=1280`} alt={heroStream.title} className="w-full h-full object-cover" loading="eager" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 via-card to-background flex items-center justify-center">
                      <img src="/logo.png" alt="UPLY" className="h-12 opacity-20" loading="eager" />
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  {/* Content overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold text-foreground bg-destructive">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-primary/15 text-primary">
                        {formatViewers(heroStream.viewers)} watching
                      </span>
                      {(heroStream as any).isPpv && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold text-white" style={{ background: "linear-gradient(135deg, #3D7CFF, #B025FF)" }}>
                          🎟️ {(heroStream as any).ppvPrice != null ? `$${Number((heroStream as any).ppvPrice).toFixed(0)}` : "PPV"}
                        </span>
                      )}
                      <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-muted-foreground">
                        {heroStream.category}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-2xl font-bold text-foreground leading-tight line-clamp-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {heroStream.title}
                    </h2>
                    <div className="flex items-center gap-2.5 mt-2">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground overflow-hidden">
                        {heroStream.creatorAvatar && String(heroStream.creatorAvatar).startsWith('http') ? (
                          <img src={String(heroStream.creatorAvatar)} alt={heroStream.creatorName} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          String(heroStream.creatorAvatar || heroStream.creatorName.slice(0, 2)).toUpperCase()
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground/80">{heroStream.creatorName}</span>
                      <span className="text-xs text-muted-foreground">· {heroStream.startedAt}</span>
                    </div>
                  </div>
                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                      <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Section Tabs ──────────────────────────────── */}
          <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {SECTION_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.id === 'live' && <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-destructive text-foreground' : 'bg-secondary text-muted-foreground'}`}>{liveCount}</span>}
                </button>
              );
            })}
          </div>

          {/* ─── Loading ───────────────────────────────────── */}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i}>
                  <div className="aspect-video rounded-lg bg-secondary animate-pulse" />
                  <div className="mt-2.5 flex gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-secondary animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-3/4 rounded bg-secondary animate-pulse" />
                      <div className="h-3 w-full rounded bg-secondary animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              SECTION: LIVE NOW
            ═══════════════════════════════════════════════════ */}
          {!loading && activeSection === 'live' && (
            <div>
              {/* Stream sub-tabs */}
              <div className="flex gap-6 mb-5 border-b border-border">
                {STREAM_TABS.map(tab => (
                  <button key={tab.id} onClick={() => {
                    setActiveStreamTab(tab.id);
                    if (tab.id === "categories") categoriesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }} className={`pb-2.5 text-sm font-medium transition-colors relative ${activeStreamTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    {tab.label}
                    {activeStreamTab === tab.id && <motion.div layoutId="live-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
                  </button>
                ))}
              </div>

              {/* Empty states */}
              {activeStreamTab === "following" && filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-foreground font-semibold mb-1">{!user ? "Log in to see who you follow" : followingIds.length === 0 ? "You're not following anyone yet." : "None of your followed creators are live."}</p>
                  <button onClick={() => !user ? navigate('/auth') : followingIds.length === 0 ? navigate('/discover') : setActiveStreamTab('foryou')}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:brightness-110 transition-all">
                    {!user ? "Log in" : followingIds.length === 0 ? "Discover creators" : "Browse all streams"}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Tv className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-foreground font-semibold mb-1">No one is live right now.</p>
                  <p className="text-sm text-muted-foreground">Be the first to start streaming!</p>
                  <button onClick={() => navigate('/go-live')}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:brightness-110 transition-all">
                    Go Live <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  {/* Stream Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    <AnimatePresence mode="popLayout">
                      {gridStreams.map((s, i) => <StreamCardNew key={s.id} stream={s} index={i} />)}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {/* Categories */}
              <div ref={categoriesRef} className="mt-10">
                <h3 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Top Categories</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-4 lg:grid-cols-8 sm:overflow-visible">
                  {CATEGORY_BUCKETS.map(cat => (
                    <div key={cat.name} className="flex-shrink-0 w-24 sm:w-auto cursor-pointer group">
                      <div className={`aspect-square rounded-lg bg-gradient-to-br ${cat.gradient} border border-border flex items-center justify-center text-3xl group-hover:border-primary/40 transition-colors`}>
                        {cat.emoji}
                      </div>
                      <p className="text-xs font-medium text-foreground mt-1.5 text-center truncate">{cat.name}</p>
                      <p className="text-[10px] text-muted-foreground text-center">{categoryCounts[cat.name] || 0} live</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* VOD Assets */}
              {vodAssets.length > 0 && (
                <div className="mt-10">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <Film className="w-5 h-5 text-muted-foreground" />Recent Uploads
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {vodAssets.slice(0, 8).map((asset: any, i: number) => {
                      const thumb = asset.mux_playback_id ? `https://image.mux.com/${asset.mux_playback_id}/thumbnail.png?width=640&height=360&time=2` : null;
                      const duration = asset.duration ? `${Math.floor(asset.duration / 60)}:${Math.floor(asset.duration % 60).toString().padStart(2, '0')}` : null;
                      return (
                        <motion.div key={asset.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                          onClick={() => navigate(`/stream/${asset.id}?type=vod`)} className="group cursor-pointer">
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-card border-2 border-transparent group-hover:border-primary transition-all duration-200 group-hover:scale-[1.02]">
                            {thumb ? <img src={thumb} alt={asset.title || 'Recording'} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Film className="w-8 h-8 text-muted-foreground/40" /></div>}
                            {duration && <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono text-foreground bg-black/70">{duration}</span>}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground overflow-hidden">
                              {asset.creator_avatar ? <img src={asset.creator_avatar} alt={asset.creator_name || ''} className="w-full h-full object-cover" loading="lazy" /> : (asset.creator_name || 'C').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{asset.title || 'Untitled'}</p>
                              <p className="text-xs text-muted-foreground">{asset.creator_name}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              SECTION: CLIPS
            ═══════════════════════════════════════════════════ */}
          {!loading && activeSection === 'clips' && (
            <div>
              {clips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Scissors className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-foreground font-semibold mb-1">No clips yet</p>
                  <p className="text-muted-foreground text-sm">Clips from live streams will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {clips.map((clip: any, i: number) => {
                    const thumb = clip.clip_playback_id ? `https://image.mux.com/${clip.clip_playback_id}/thumbnail.png?width=640&height=360&time=1` : null;
                    const dur = clip.duration_seconds ? `${Math.floor(clip.duration_seconds / 60)}:${(clip.duration_seconds % 60).toString().padStart(2, '0')}` : null;
                    return (
                      <motion.div key={clip.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="group cursor-pointer">
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-card border-2 border-transparent group-hover:border-primary transition-all group-hover:scale-[1.02]">
                          {thumb ? <img src={thumb} alt={clip.caption} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Scissors className="w-8 h-8 text-muted-foreground/40" /></div>}
                          {dur && <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono text-foreground bg-black/70">{dur}</span>}
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-primary bg-primary/10 border border-primary/30">CLIP</div>
                          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-foreground bg-black/60">
                            <Eye className="w-3 h-3" />{clip.view_count || 0}
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground overflow-hidden">
                            {clip.creator_avatar ? <img src={clip.creator_avatar} alt={clip.creator_name || ''} className="w-full h-full object-cover" loading="lazy" /> : (clip.creator_name || 'C').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{clip.caption || 'Untitled clip'}</p>
                            <p className="text-xs text-muted-foreground">{clip.creator_name}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              SECTION: SHORTS
            ═══════════════════════════════════════════════════ */}
          {!loading && activeSection === 'shorts' && (
            <div>
              {shorts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Smartphone className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-foreground font-semibold mb-1">No shorts yet</p>
                  <p className="text-muted-foreground text-sm">Short-form vertical videos will appear here.</p>
                  <button onClick={() => navigate('/shorts')} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:brightness-110 transition-all">
                    Go to Shorts feed <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">{shorts.length} shorts</p>
                    <button onClick={() => navigate('/shorts')} className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                      Full-screen feed <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {shorts.map((short: any, i: number) => {
                      const thumb = short.playback_id ? `https://image.mux.com/${short.playback_id}/thumbnail.png?width=360&height=640&time=1` : null;
                      return (
                        <motion.div key={short.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                          onClick={() => navigate('/shorts')} className="group cursor-pointer">
                          <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-card border-2 border-transparent group-hover:border-primary transition-all group-hover:scale-[1.02]">
                            {thumb ? (
                              <img src={thumb} alt={short.caption} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-b from-secondary to-background flex items-center justify-center">
                                <Smartphone className="w-6 h-6 text-muted-foreground/40" />
                              </div>
                            )}
                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            {/* Play icon */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-10 h-10 rounded-full bg-secondary backdrop-blur-sm flex items-center justify-center">
                                <Play className="w-5 h-5 text-foreground ml-0.5" fill="white" />
                              </div>
                            </div>
                            {/* Stats */}
                            <div className="absolute bottom-2 left-2 right-2">
                              <div className="flex items-center gap-2 text-[10px] text-foreground/80">
                                <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{short.view_count || 0}</span>
                                <span className="flex items-center gap-0.5"><Flame className="w-3 h-3" />{short.like_count || 0}</span>
                              </div>
                            </div>
                            {/* Creator type tag */}
                            {short.creator_type_tag && (
                              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold text-primary bg-black/50 backdrop-blur-sm">
                                {short.creator_type_tag}
                              </div>
                            )}
                          </div>
                          <div className="mt-1.5">
                            <p className="text-xs font-medium text-foreground truncate">{short.caption || 'Untitled'}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{short.creator_name}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              SECTION: RECORDINGS / REPLAYS
            ═══════════════════════════════════════════════════ */}
          {!loading && activeSection === 'recordings' && (
            <div>
              {recordings.length === 0 && vodAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Film className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-foreground font-semibold mb-1">No replays yet</p>
                  <p className="text-muted-foreground text-sm">Recorded streams and uploads will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...recordings, ...vodAssets].map((item: any, i: number) => {
                    const playbackId = item.playback_id || item.mux_playback_id;
                    const thumb = playbackId ? `https://image.mux.com/${playbackId}/thumbnail.png?width=640&height=360&time=2` : null;
                    const durSec = item.duration_seconds || item.duration || 0;
                    const dur = durSec ? `${Math.floor(durSec / 60)}:${Math.floor(durSec % 60).toString().padStart(2, '0')}` : null;
                    return (
                      <motion.div key={item.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        onClick={() => navigate(item.playback_id ? `/stream/${item.id}?type=recording` : `/stream/${item.id}?type=vod`)} className="group cursor-pointer">
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-card border-2 border-transparent group-hover:border-primary transition-all group-hover:scale-[1.02]">
                          {thumb ? <img src={thumb} alt={item.title || 'Replay'} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Film className="w-8 h-8 text-muted-foreground/40" /></div>}
                          {dur && <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono text-foreground bg-black/70">{dur}</span>}
                          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-foreground bg-black/60">
                            <Eye className="w-3 h-3" />{item.view_count || 0}
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground overflow-hidden">
                            {item.creator_avatar ? <img src={item.creator_avatar} alt={item.creator_name || ''} className="w-full h-full object-cover" loading="lazy" /> : (item.creator_name || 'C').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{item.title || 'Untitled replay'}</p>
                            <p className="text-xs text-muted-foreground">{item.creator_name || 'Creator'}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              SECTION: COMMUNITY FEED
            ═══════════════════════════════════════════════════ */}
          {!loading && activeSection === 'community' && (
            <div>
              {communityPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-foreground font-semibold mb-1">No community posts yet</p>
                  <p className="text-muted-foreground text-sm">Join a creator's community to see posts here.</p>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-4">
                  {communityPosts.map((post: any, i: number) => (
                    <motion.div key={post.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className={`p-4 rounded-xl bg-card border ${post.is_pinned ? 'border-l-[3px] border-l-primary border-border' : 'border-border'} hover:border-border transition-colors`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground overflow-hidden">
                          {post.author_avatar ? <img src={post.author_avatar} alt={post.author_name || ''} className="w-full h-full object-cover" loading="lazy" /> : (post.author_name || 'M').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{post.author_name}</p>
                          <p className="text-[11px] text-muted-foreground">{getTimeAgo(post.created_at)}</p>
                        </div>
                        {post.category && post.category !== 'General' && (
                          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground">{post.category}</span>
                        )}
                      </div>
                      {post.title && <h4 className="text-sm font-bold text-foreground mb-1">{post.title}</h4>}
                      <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">{post.body}</p>
                      {post.image_url && <img src={post.image_url} alt={post.title || ''} className="mt-3 rounded-lg w-full max-h-60 object-cover" loading="lazy" />}
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Flame className="w-3.5 h-3.5" />{post.like_count || 0}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><MessageCircle className="w-3.5 h-3.5" />{post.comment_count || 0}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
