import { motion, AnimatePresence } from "framer-motion";
import { Radio, Search, Play, Film, Scissors, Users, ChevronRight, Eye, Flame, TrendingUp, Tv, MessageCircle, Smartphone } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import StreamCardNew from "@/components/live/StreamCardNew";
import { mockStreams } from "@/data/mockStreams";
import { useFollows } from "@/hooks/useFollows";

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
  creator_name?: string;
  creator_avatar?: string;
  creator_tier?: number;
  creator_tier_name?: string;
}

const HARDCODED_CATEGORIES = [
  { emoji: "💪", name: "Fitness", gradient: "from-emerald-500/20 to-teal-500/10" },
  { emoji: "💰", name: "Finance", gradient: "from-amber-500/20 to-yellow-500/10" },
  { emoji: "🎮", name: "Gaming", gradient: "from-violet-500/20 to-purple-500/10" },
  { emoji: "💬", name: "Just Chatting", gradient: "from-sky-500/20 to-blue-500/10" },
  { emoji: "🎵", name: "Music", gradient: "from-rose-500/20 to-pink-500/10" },
  { emoji: "📚", name: "Education", gradient: "from-indigo-500/20 to-blue-500/10" },
  { emoji: "🌍", name: "IRL", gradient: "from-green-500/20 to-emerald-500/10" },
];

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
    const { data: profiles } = await supabase
      .from('profiles_public' as any)
      .select('user_id, display_name, avatar_url, tier, tier_name')
      .in('user_id', userIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    const enriched = streams.map((s: any) => {
      const profile = profileMap.get(s.user_id);
      return {
        ...s,
        creator_name: profile?.display_name || 'Creator',
        creator_avatar: profile?.avatar_url || '',
        creator_tier: profile?.tier || 1,
        creator_tier_name: profile?.tier_name || 'Starter',
      };
    });
    setLiveStreams(enriched);

    const counts: Record<string, number> = {};
    streams.forEach((s: any) => {
      const cat = (s.category || '').toLowerCase();
      HARDCODED_CATEGORIES.forEach(hc => {
        if (cat.includes(hc.name.toLowerCase())) {
          counts[hc.name] = (counts[hc.name] || 0) + 1;
        }
      });
    });
    setCategoryCounts(counts);
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
        .from('profiles_public' as any)
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
        .from('profiles_public' as any)
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
        .from('profiles_public' as any)
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
        .from('profiles')
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
        .from('profiles')
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
      .then(() => setLoading(false));

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
    isLive: s.status === 'active',
    isPublic: s.is_public ?? true,
    thumbnailGradient: '',
    communityPrice: 0,
    startedAt: s.started_at ? getTimeAgo(s.started_at) : 'just now',
    description: s.description || '',
    muxPlaybackId: s.mux_playback_id,
  });

  const hasLiveStreams = liveStreams.length > 0;
  const allStreams = hasLiveStreams ? liveStreams.map(toMockFormat) : mockStreams;
  let filtered = search
    ? allStreams.filter(s => s.title.toLowerCase().includes(search.toLowerCase()) || s.creatorName.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()))
    : allStreams;
  if (activeStreamTab === "following" && hasLiveStreams) {
    filtered = filtered.filter(s => 'userId' in s && followingIds.includes((s as any).userId));
  }
  const liveCount = hasLiveStreams ? liveStreams.length : filtered.filter(s => s.isLive).length;

  // Hero stream = highest viewers
  const heroStream = filtered.length > 0 ? [...filtered].sort((a, b) => b.viewers - a.viewers)[0] : null;
  const gridStreams = heroStream ? filtered.filter(s => s.id !== heroStream.id) : filtered;

  const totalViewers = allStreams.reduce((sum, s) => sum + s.viewers, 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0A0A' }}>
      <SEOHead title="Live Hub" description="Watch live streams, clips, replays, and connect with the creator community on Uply." />

      {/* ─── Top Nav ────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5" style={{ backgroundColor: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Uply" className="h-[60px] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate("/")} />
            <span className="text-white/10">|</span>
            <div className="flex items-center gap-1.5 text-[#00FF85]">
              <Radio className="w-4 h-4" />
              <span className="text-sm font-semibold">Live Hub</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search streams, creators, clips..."
                className="w-full rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-[#888] focus:outline-none focus:ring-1 focus:ring-[#00FF85]/50 border border-white/10" style={{ backgroundColor: '#111' }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button size="sm" onClick={() => navigate("/go-live")} className="bg-[#00FF85] text-[#0A0A0A] font-bold hover:brightness-110 border-0">
                  <Radio className="w-3.5 h-3.5 mr-1.5" />Go Live
                </Button>
                <Button variant="ghost" size="sm" className="text-[#888] hover:text-white" onClick={() => navigate("/dashboard")}>Dashboard</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="text-[#888] hover:text-white" onClick={() => navigate("/auth")}>Log in</Button>
                <Button size="sm" className="bg-[#00FF85] text-[#0A0A0A] font-bold hover:brightness-110 border-0" onClick={() => navigate("/auth")}>Start Free</Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Mobile Search ──────────────────────────────────── */}
      <div className="md:hidden pt-16 px-4 pb-2" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
            className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-[#888] focus:outline-none focus:ring-1 focus:ring-[#00FF85]/50 border border-white/10" style={{ backgroundColor: '#111' }} />
        </div>
      </div>

      <div className="pt-4 md:pt-20 pb-24">
        <div className="container">

          {/* ─── Stats Bar ─────────────────────────────────── */}
          <div className="flex items-center gap-4 mb-6 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-[#111] flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#FF3B3B] animate-pulse" />
              <span className="text-xs font-semibold text-white">{liveCount} Live</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-[#111] flex-shrink-0">
              <Eye className="w-3 h-3 text-[#888]" />
              <span className="text-xs text-[#888]">{formatViewers(totalViewers)} watching</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-[#111] flex-shrink-0">
              <Scissors className="w-3 h-3 text-[#888]" />
              <span className="text-xs text-[#888]">{clips.length} clips</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-[#111] flex-shrink-0">
              <Film className="w-3 h-3 text-[#888]" />
              <span className="text-xs text-[#888]">{recordings.length + vodAssets.length} replays</span>
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
              <div className="relative rounded-xl overflow-hidden border border-white/5 group-hover:border-[#00FF85]/40 transition-all">
                <div className="aspect-[21/9] sm:aspect-[21/9] bg-[#111] relative">
                  {heroStream.muxPlaybackId ? (
                    <img src={`https://image.mux.com/${heroStream.muxPlaybackId}/thumbnail.jpg?time=0&width=1280`} alt={heroStream.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#00FF85]/10 via-[#111] to-[#0A0A0A] flex items-center justify-center">
                      <img src="/logo.png" alt="UPLY" className="h-12 opacity-20" />
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
                  {/* Content overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold text-white bg-[#FF3B3B]">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#00FF85]/15 text-[#00FF85]">
                        {formatViewers(heroStream.viewers)} watching
                      </span>
                      <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-white/5 text-[#888]">
                        {heroStream.category}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-2xl font-bold text-white leading-tight line-clamp-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {heroStream.title}
                    </h2>
                    <div className="flex items-center gap-2.5 mt-2">
                      <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[10px] font-bold text-[#888] overflow-hidden">
                        {heroStream.creatorAvatar && String(heroStream.creatorAvatar).startsWith('http') ? (
                          <img src={String(heroStream.creatorAvatar)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          String(heroStream.creatorAvatar || heroStream.creatorName.slice(0, 2)).toUpperCase()
                        )}
                      </div>
                      <span className="text-sm font-medium text-white/80">{heroStream.creatorName}</span>
                      <span className="text-xs text-[#888]">· {heroStream.startedAt}</span>
                    </div>
                  </div>
                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 rounded-full bg-[#00FF85] flex items-center justify-center shadow-lg shadow-[#00FF85]/20">
                      <Play className="w-7 h-7 text-[#0A0A0A] ml-1" fill="#0A0A0A" />
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
                      ? "bg-[#00FF85]/10 text-[#00FF85] border border-[#00FF85]/30"
                      : "text-[#888] hover:text-white border border-transparent hover:border-white/10"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.id === 'live' && <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-[#FF3B3B] text-white' : 'bg-white/5 text-[#888]'}`}>{liveCount}</span>}
                </button>
              );
            })}
          </div>

          {/* ─── Loading ───────────────────────────────────── */}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i}>
                  <div className="aspect-video rounded-lg bg-[#1a1a1a] animate-pulse" />
                  <div className="mt-2.5 flex gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#1a1a1a] animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-3/4 rounded bg-[#1a1a1a] animate-pulse" />
                      <div className="h-3 w-full rounded bg-[#1a1a1a] animate-pulse" />
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
              <div className="flex gap-6 mb-5 border-b border-white/5">
                {STREAM_TABS.map(tab => (
                  <button key={tab.id} onClick={() => {
                    setActiveStreamTab(tab.id);
                    if (tab.id === "categories") categoriesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }} className={`pb-2.5 text-sm font-medium transition-colors relative ${activeStreamTab === tab.id ? "text-white" : "text-[#888] hover:text-white"}`}>
                    {tab.label}
                    {activeStreamTab === tab.id && <motion.div layoutId="live-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00FF85] rounded-full" />}
                  </button>
                ))}
              </div>

              {/* Empty states */}
              {activeStreamTab === "following" && filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="w-10 h-10 text-[#888] mb-3" />
                  <p className="text-white font-semibold mb-1">{!user ? "Log in to see who you follow" : followingIds.length === 0 ? "You're not following anyone yet." : "None of your followed creators are live."}</p>
                  <button onClick={() => !user ? navigate('/auth') : followingIds.length === 0 ? navigate('/discover') : setActiveStreamTab('foryou')}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00FF85] text-[#0A0A0A] text-sm font-bold hover:brightness-110 transition-all">
                    {!user ? "Log in" : followingIds.length === 0 ? "Discover creators" : "Browse all streams"}
                    <ChevronRight className="w-4 h-4" />
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

                  {!hasLiveStreams && (
                    <div className="mt-4 flex items-center gap-2.5 px-4 py-3 rounded-lg bg-[#111] border border-white/5">
                      <Radio className="w-4 h-4 text-[#888] flex-shrink-0" />
                      <p className="text-xs text-[#888]">
                        Showing example streams — <span className="text-[#00FF85] font-medium cursor-pointer" onClick={() => navigate('/go-live')}>be the first to go live!</span>
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Categories */}
              <div ref={categoriesRef} className="mt-10">
                <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Top Categories</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-4 lg:grid-cols-7 sm:overflow-visible">
                  {HARDCODED_CATEGORIES.map(cat => (
                    <div key={cat.name} className="flex-shrink-0 w-24 sm:w-auto cursor-pointer group">
                      <div className={`aspect-square rounded-lg bg-gradient-to-br ${cat.gradient} border border-white/5 flex items-center justify-center text-3xl group-hover:border-[#00FF85]/40 transition-colors`}>
                        {cat.emoji}
                      </div>
                      <p className="text-xs font-medium text-white mt-1.5 text-center truncate">{cat.name}</p>
                      <p className="text-[10px] text-[#888] text-center">{categoryCounts[cat.name] || 0} live</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* VOD Assets */}
              {vodAssets.length > 0 && (
                <div className="mt-10">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <Film className="w-5 h-5 text-[#888]" />Recent Uploads
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {vodAssets.slice(0, 8).map((asset: any, i: number) => {
                      const thumb = asset.mux_playback_id ? `https://image.mux.com/${asset.mux_playback_id}/thumbnail.png?width=640&height=360&time=2` : null;
                      const duration = asset.duration ? `${Math.floor(asset.duration / 60)}:${Math.floor(asset.duration % 60).toString().padStart(2, '0')}` : null;
                      return (
                        <motion.div key={asset.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                          onClick={() => navigate(`/stream/${asset.id}?type=vod`)} className="group cursor-pointer">
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-[#111] border-2 border-transparent group-hover:border-[#00FF85] transition-all duration-200 group-hover:scale-[1.02]">
                            {thumb ? <img src={thumb} alt={asset.title || 'Recording'} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Film className="w-8 h-8 text-[#888]/40" /></div>}
                            {duration && <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono text-white bg-black/70">{duration}</span>}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[10px] font-bold text-[#888] overflow-hidden">
                              {asset.creator_avatar ? <img src={asset.creator_avatar} alt="" className="w-full h-full object-cover" /> : (asset.creator_name || 'C').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{asset.title || 'Untitled'}</p>
                              <p className="text-xs text-[#888]">{asset.creator_name}</p>
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
                  <Scissors className="w-12 h-12 text-[#888] mb-4" />
                  <p className="text-white font-semibold mb-1">No clips yet</p>
                  <p className="text-[#888] text-sm">Clips from live streams will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {clips.map((clip: any, i: number) => {
                    const thumb = clip.clip_playback_id ? `https://image.mux.com/${clip.clip_playback_id}/thumbnail.png?width=640&height=360&time=1` : null;
                    const dur = clip.duration_seconds ? `${Math.floor(clip.duration_seconds / 60)}:${(clip.duration_seconds % 60).toString().padStart(2, '0')}` : null;
                    return (
                      <motion.div key={clip.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="group cursor-pointer">
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-[#111] border-2 border-transparent group-hover:border-[#00FF85] transition-all group-hover:scale-[1.02]">
                          {thumb ? <img src={thumb} alt={clip.caption} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Scissors className="w-8 h-8 text-[#888]/40" /></div>}
                          {dur && <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono text-white bg-black/70">{dur}</span>}
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-[#00FF85] bg-[#00FF85]/10 border border-[#00FF85]/30">CLIP</div>
                          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white bg-black/60">
                            <Eye className="w-3 h-3" />{clip.view_count || 0}
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[10px] font-bold text-[#888] overflow-hidden">
                            {clip.creator_avatar ? <img src={clip.creator_avatar} alt="" className="w-full h-full object-cover" /> : (clip.creator_name || 'C').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{clip.caption || 'Untitled clip'}</p>
                            <p className="text-xs text-[#888]">{clip.creator_name}</p>
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
                  <Smartphone className="w-12 h-12 text-[#888] mb-4" />
                  <p className="text-white font-semibold mb-1">No shorts yet</p>
                  <p className="text-[#888] text-sm">Short-form vertical videos will appear here.</p>
                  <button onClick={() => navigate('/shorts')} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00FF85] text-[#0A0A0A] text-sm font-bold hover:brightness-110 transition-all">
                    Go to Shorts feed <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-[#888]">{shorts.length} shorts</p>
                    <button onClick={() => navigate('/shorts')} className="text-sm text-[#00FF85] font-medium hover:underline flex items-center gap-1">
                      Full-screen feed <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {shorts.map((short: any, i: number) => {
                      const thumb = short.playback_id ? `https://image.mux.com/${short.playback_id}/thumbnail.png?width=360&height=640&time=1` : null;
                      return (
                        <motion.div key={short.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                          onClick={() => navigate('/shorts')} className="group cursor-pointer">
                          <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-[#111] border-2 border-transparent group-hover:border-[#00FF85] transition-all group-hover:scale-[1.02]">
                            {thumb ? (
                              <img src={thumb} alt={short.caption} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-b from-[#1a1a1a] to-[#111] flex items-center justify-center">
                                <Smartphone className="w-6 h-6 text-[#888]/40" />
                              </div>
                            )}
                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            {/* Play icon */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                              </div>
                            </div>
                            {/* Stats */}
                            <div className="absolute bottom-2 left-2 right-2">
                              <div className="flex items-center gap-2 text-[10px] text-white/80">
                                <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{short.view_count || 0}</span>
                                <span className="flex items-center gap-0.5"><Flame className="w-3 h-3" />{short.like_count || 0}</span>
                              </div>
                            </div>
                            {/* Creator type tag */}
                            {short.creator_type_tag && (
                              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold text-[#00FF85] bg-black/50 backdrop-blur-sm">
                                {short.creator_type_tag}
                              </div>
                            )}
                          </div>
                          <div className="mt-1.5">
                            <p className="text-xs font-medium text-white truncate">{short.caption || 'Untitled'}</p>
                            <p className="text-[10px] text-[#888] truncate">{short.creator_name}</p>
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
                  <Film className="w-12 h-12 text-[#888] mb-4" />
                  <p className="text-white font-semibold mb-1">No replays yet</p>
                  <p className="text-[#888] text-sm">Recorded streams and uploads will appear here.</p>
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
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-[#111] border-2 border-transparent group-hover:border-[#00FF85] transition-all group-hover:scale-[1.02]">
                          {thumb ? <img src={thumb} alt={item.title || 'Replay'} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Film className="w-8 h-8 text-[#888]/40" /></div>}
                          {dur && <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono text-white bg-black/70">{dur}</span>}
                          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white bg-black/60">
                            <Eye className="w-3 h-3" />{item.view_count || 0}
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[10px] font-bold text-[#888] overflow-hidden">
                            {item.creator_avatar ? <img src={item.creator_avatar} alt="" className="w-full h-full object-cover" /> : (item.creator_name || 'C').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{item.title || 'Untitled replay'}</p>
                            <p className="text-xs text-[#888]">{item.creator_name || 'Creator'}</p>
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
                  <MessageCircle className="w-12 h-12 text-[#888] mb-4" />
                  <p className="text-white font-semibold mb-1">No community posts yet</p>
                  <p className="text-[#888] text-sm">Join a creator's community to see posts here.</p>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-4">
                  {communityPosts.map((post: any, i: number) => (
                    <motion.div key={post.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className={`p-4 rounded-xl bg-[#111] border ${post.is_pinned ? 'border-l-[3px] border-l-[#00FF85] border-white/5' : 'border-white/5'} hover:border-white/10 transition-colors`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-xs font-bold text-[#888] overflow-hidden">
                          {post.author_avatar ? <img src={post.author_avatar} alt="" className="w-full h-full object-cover" /> : (post.author_name || 'M').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{post.author_name}</p>
                          <p className="text-[11px] text-[#888]">{getTimeAgo(post.created_at)}</p>
                        </div>
                        {post.category && post.category !== 'General' && (
                          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-[#888]">{post.category}</span>
                        )}
                      </div>
                      {post.title && <h4 className="text-sm font-bold text-white mb-1">{post.title}</h4>}
                      <p className="text-sm text-[#ccc] leading-relaxed line-clamp-3">{post.body}</p>
                      {post.image_url && <img src={post.image_url} alt="" className="mt-3 rounded-lg w-full max-h-60 object-cover" />}
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                        <span className="flex items-center gap-1 text-xs text-[#888]"><Flame className="w-3.5 h-3.5" />{post.like_count || 0}</span>
                        <span className="flex items-center gap-1 text-xs text-[#888]"><MessageCircle className="w-3.5 h-3.5" />{post.comment_count || 0}</span>
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
