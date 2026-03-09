import { motion } from "framer-motion";
import { Flame, TrendingUp, Compass, Sparkles, Radio, Film } from "lucide-react";
import StreamCard from "./StreamCard";
import { mockStreams, categories } from "@/data/mockStreams";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

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
  // Joined from profiles
  creator_name?: string;
  creator_avatar?: string;
  creator_tier?: number;
  creator_tier_name?: string;
}

const sections = [
  { id: "trending", label: "Trending Live", icon: Flame, description: "Most-watched streams right now" },
  { id: "rising", label: "Rising Creators", icon: TrendingUp, description: "Breakout creators gaining momentum" },
  { id: "category", label: "By Category", icon: Compass, description: "Find streams in your niche" },
  { id: "foryou", label: "For You", icon: Sparkles, description: "Personalized picks based on your interests" },
];

interface Props {
  searchQuery?: string;
}

export default function LiveDiscoveryFeed({ searchQuery = "" }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveStreams = async () => {
    const { data: streams, error } = await supabase
      .from('mux_live_streams')
      .select('*')
      .eq('status', 'active')
      .eq('is_public', true);

    if (error || !streams || streams.length === 0) {
      setLiveStreams([]);
      setLoading(false);
      return;
    }

    // Fetch profiles for these streams
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
    setLoading(false);
  };

  useEffect(() => {
    fetchLiveStreams();

    const channel = supabase
      .channel('live-discovery')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mux_live_streams' }, () => {
        fetchLiveStreams();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Convert live streams to MockStream format for StreamCard compatibility
  const toMockFormat = (s: LiveStream) => ({
    id: s.id,
    creatorName: s.creator_name || 'Creator',
    creatorAvatar: s.creator_avatar || 'CR',
    creatorTier: s.creator_tier || 1,
    creatorTierName: s.creator_tier_name || 'Starter',
    title: s.title || 'Untitled Stream',
    category: s.category || 'General',
    viewers: s.viewer_count || 0,
    isLive: s.status === 'active',
    isPublic: s.is_public ?? true,
    thumbnailGradient: 'from-primary/20 via-primary/10 to-background',
    communityPrice: 19,
    startedAt: s.started_at ? getTimeAgo(s.started_at) : 'just now',
    description: s.description || '',
    muxPlaybackId: s.mux_playback_id,
  });

  const hasLiveStreams = liveStreams.length > 0;
  const allStreams = hasLiveStreams ? liveStreams.map(toMockFormat) : mockStreams;

  const filtered = searchQuery
    ? allStreams.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allStreams;

  const trendingStreams = [...filtered].sort((a, b) => b.viewers - a.viewers).slice(0, 4);
  const risingStreams = filtered.filter((s) => s.creatorTier <= 2).slice(0, 4);
  const categoryStreams = selectedCategory
    ? filtered.filter((s) => s.category === selectedCategory)
    : filtered.slice(0, 4);
  const forYouStreams = [...filtered].sort(() => Math.random() - 0.5).slice(0, 4);

  if (loading) {
    return (
      <div className="space-y-16">
        {[0, 1].map((i) => (
          <section key={i}>
            <div className="flex items-center gap-3 mb-6">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[0, 1, 2, 3].map((j) => (
                <div key={j}>
                  <Skeleton className="aspect-video rounded-xl" />
                  <div className="mt-3 flex gap-3">
                    <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (!hasLiveStreams) {
    // Show mock streams as fallback with a notice
    return (
      <div className="space-y-16">
        <div className="glass-card p-4 flex items-center gap-3 mb-4">
          <Radio className="w-5 h-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No creators are live right now. Showing example streams — <span className="text-primary font-medium cursor-pointer" onClick={() => window.location.href = '/go-live'}>be the first to go live!</span>
          </p>
        </div>

        {/* Trending Live */}
        <section>
          <SectionHeader section={sections[0]} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {trendingStreams.map((s, i) => (
              <StreamCard key={s.id} stream={s} index={i} />
            ))}
          </div>
        </section>

        {/* Rising Creators */}
        <section>
          <SectionHeader section={sections[1]} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {risingStreams.map((s, i) => (
              <StreamCard key={s.id} stream={s} index={i} />
            ))}
          </div>
        </section>

        {/* By Category */}
        <section>
          <SectionHeader section={sections[2]} />
          <div className="flex gap-2 flex-wrap mb-6">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {categoryStreams.map((s, i) => (
              <StreamCard key={s.id} stream={s} index={i} />
            ))}
          </div>
        </section>

        {/* For You */}
        <section>
          <SectionHeader section={sections[3]} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {forYouStreams.map((s, i) => (
              <StreamCard key={s.id} stream={s} index={i} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {/* Trending Live */}
      <section>
        <SectionHeader section={sections[0]} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {trendingStreams.map((s, i) => (
            <StreamCard key={s.id} stream={s} index={i} />
          ))}
        </div>
      </section>

      {trendingStreams.length === 0 && (
        <div className="text-center py-12">
          <Radio className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No live streams match your search.</p>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ section }: { section: (typeof sections)[0] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      className="flex items-center gap-3 mb-6"
    >
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <section.icon className="w-4.5 h-4.5 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground">{section.label}</h2>
        <p className="text-xs text-muted-foreground">{section.description}</p>
      </div>
    </motion.div>
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
