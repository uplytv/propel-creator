import { motion, AnimatePresence } from "framer-motion";
import { Radio, Film, Tv, ChevronRight, Users } from "lucide-react";
import StreamCardNew from "./StreamCardNew";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useFollows } from "@/hooks/useFollows";
import { useAuth } from "@/context/AuthContext";

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
  creator_name?: string;
  creator_avatar?: string;
  creator_tier?: number;
  creator_tier_name?: string;
}

const HARDCODED_CATEGORIES = [
  { emoji: "💪", name: "Fitness" },
  { emoji: "💰", name: "Finance" },
  { emoji: "🎮", name: "Gaming" },
  { emoji: "💬", name: "Just Chatting" },
  { emoji: "🎵", name: "Music" },
  { emoji: "📚", name: "Education" },
  { emoji: "🌍", name: "IRL" },
];

const TABS = [
  { id: "foryou", label: "For You" },
  { id: "following", label: "Following" },
  { id: "categories", label: "Categories" },
] as const;

interface Props {
  searchQuery?: string;
}

export default function LiveDiscoveryFeed({ searchQuery = "" }: Props) {
  const { user } = useAuth();
  const { followingIds } = useFollows();
  const [activeTab, setActiveTab] = useState<string>("foryou");
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [vodAssets, setVodAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const navigate = useNavigate();
  const categoriesRef = useRef<HTMLDivElement>(null);

  const fetchLiveStreams = async () => {
    const { data: streams, error } = await supabase
      .from('mux_live_streams')
      .select('*')
      .eq('status', 'active')
      .eq('is_public', true);

    if (error || !streams || streams.length === 0) {
      setLiveStreams([]);
      setCategoryCounts({});
    } else {
      const userIds = [...new Set(streams.map((s: any) => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, tier, tier_name')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const enriched = streams.map((s: any) => {
        const profile = profileMap.get(s.user_id);
        return {
          ...s,
          creator_name: profile?.display_name || 'Creator',
          creator_avatar: profile?.avatar_url || (profile?.display_name?.slice(0, 2).toUpperCase() || 'CR'),
          creator_tier: profile?.tier || 1,
          creator_tier_name: profile?.tier_name || 'Starter',
        };
      });
      setLiveStreams(enriched);

      // Count streams per category
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
    }
  };

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
        .select('user_id, display_name, avatar_url, tier, tier_name')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      setVodAssets(assets.map((a: any) => {
        const profile = profileMap.get(a.user_id);
        return { ...a, creator_name: profile?.display_name || 'Creator', creator_avatar: profile?.avatar_url, creator_tier: profile?.tier || 1, creator_tier_name: profile?.tier_name || 'Starter' };
      }));
    }
  };

  useEffect(() => {
    Promise.all([fetchLiveStreams(), fetchVodAssets()]).then(() => setLoading(false));

    const channel = supabase
      .channel('live-discovery')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mux_live_streams' }, () => {
        fetchLiveStreams();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mux_assets' }, () => {
        fetchVodAssets();
      })
      .subscribe();

    const pollInterval = setInterval(() => {
      fetchLiveStreams();
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, []);

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
  const allStreams = liveStreams.map(toMockFormat);

  let filtered = searchQuery
    ? allStreams.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allStreams;

  // Filter by following tab
  if (activeTab === "following" && hasLiveStreams) {
    filtered = filtered.filter((s) => 'userId' in s && followingIds.includes((s as any).userId));
  }

  const liveCount = hasLiveStreams ? liveStreams.length : filtered.filter(s => s.isLive).length;

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === "categories" && categoriesRef.current) {
      categoriesRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // ─── Skeleton Loading ─────────────────────────────────────────
  if (loading) {
    return (
      <div>
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-5">
          <div className="h-7 w-40 rounded bg-card animate-pulse" />
          <div className="h-5 w-28 rounded bg-card animate-pulse" />
        </div>
        {/* Tab skeleton */}
        <div className="flex gap-6 mb-6">
          <div className="h-5 w-16 rounded bg-card animate-pulse" />
          <div className="h-5 w-20 rounded bg-card animate-pulse" />
        </div>
        {/* Grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <div className="aspect-video rounded-lg bg-card animate-pulse" />
              <div className="mt-2.5 flex gap-2.5">
                <div className="w-9 h-9 rounded-full bg-card animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 rounded bg-card animate-pulse" />
                  <div className="h-3 w-full rounded bg-card animate-pulse" />
                  <div className="h-3 w-16 rounded bg-card animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ─── Header Row ────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="flex items-center gap-2 text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
            Live Now
          </span>
        </h2>
        <span className="text-sm font-medium text-primary">
          {liveCount} stream{liveCount !== 1 ? 's' : ''} live
        </span>
      </div>

      {/* ─── Tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-6 mb-6 border-b border-white/5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`pb-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? "text-white"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="live-tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* ─── Empty State ───────────────────────────────────────── */}
      {activeTab === "following" && filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-muted-foreground mb-4" />
          {!user ? (
            <>
              <p className="text-white font-semibold mb-1">Log in to see who you follow</p>
              <button
                onClick={() => navigate('/auth')}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-foreground text-sm font-bold hover:brightness-110 transition-all"
              >
                Log in
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : followingIds.length === 0 ? (
            <>
              <p className="text-white font-semibold mb-1">You're not following anyone yet.</p>
              <p className="text-muted-foreground text-sm">Follow creators to see their streams here.</p>
              <button
                onClick={() => navigate('/discover')}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-foreground text-sm font-bold hover:brightness-110 transition-all"
              >
                Discover creators
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <p className="text-white font-semibold mb-1">None of your followed creators are live.</p>
              <p className="text-muted-foreground text-sm">Check back later or explore other streams.</p>
              <button
                onClick={() => setActiveTab('foryou')}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-foreground text-sm font-bold hover:brightness-110 transition-all"
              >
                Browse all streams
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Tv className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-white font-semibold mb-1">No one is live right now.</p>
          <button
            onClick={() => navigate('/go-live')}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-foreground text-sm font-bold hover:brightness-110 transition-all"
          >
            Be the first to go live
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          {/* ─── Stream Grid ─────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((s, i) => (
                <StreamCardNew key={s.id} stream={s} index={i} />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* ─── Top Categories ────────────────────────────────────── */}
      <div ref={categoriesRef} className="mt-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Top Categories
          </h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-4 lg:grid-cols-7 sm:overflow-visible">
          {HARDCODED_CATEGORIES.map((cat) => (
            <div
              key={cat.name}
              className="flex-shrink-0 w-28 sm:w-auto cursor-pointer group"
            >
              <div className="aspect-square rounded-lg bg-background border border-white/5 flex items-center justify-center text-4xl group-hover:border-primary/40 transition-colors">
                {cat.emoji}
              </div>
              <p className="text-sm font-medium text-white mt-2 text-center truncate">{cat.name}</p>
              <p className="text-[11px] text-muted-foreground text-center">
                {categoryCounts[cat.name] || 0} live
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Recent Recordings ─────────────────────────────────── */}
      {vodAssets.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <Film className="w-5 h-5 text-muted-foreground" />
              Recent Recordings
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {vodAssets.map((asset: any, i: number) => {
              const thumb = asset.mux_playback_id
                ? `https://image.mux.com/${asset.mux_playback_id}/thumbnail.png?width=640&height=360&time=2`
                : null;
              const duration = asset.duration
                ? `${Math.floor(asset.duration / 60)}:${Math.floor(asset.duration % 60).toString().padStart(2, '0')}`
                : null;
              return (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/stream/${asset.id}?type=vod`)}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-background border-2 border-transparent group-hover:border-primary transition-all duration-200 group-hover:scale-[1.02]">
                    {thumb ? (
                      <img src={thumb} alt={asset.title || 'Recording'} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-8 h-8 text-muted-foreground/40" />
                      </div>
                    )}
                    {duration && (
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono text-white bg-black/70">
                        {duration}
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 flex gap-2.5">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-card flex items-center justify-center text-[11px] font-bold text-muted-foreground overflow-hidden">
                      {asset.creator_avatar ? (
                        <img src={asset.creator_avatar} alt={asset.creator_name || 'Creator'} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        (asset.creator_name || 'C').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{asset.title || 'Untitled Recording'}</p>
                      <p className="text-xs text-muted-foreground">{asset.creator_name || 'Creator'}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}
