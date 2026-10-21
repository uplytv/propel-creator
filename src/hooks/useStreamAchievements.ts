import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  threshold: number;
  unlockedAt?: string;
  progress: number;
}

const ACHIEVEMENT_DEFS: Omit<Achievement, "unlockedAt" | "progress">[] = [
  { id: "first_stream", key: "streams", title: "First Stream", description: "Go live for the first time", icon: "🎬", threshold: 1 },
  { id: "stream_10", key: "streams", title: "Regular Broadcaster", description: "Complete 10 live streams", icon: "📡", threshold: 10 },
  { id: "stream_50", key: "streams", title: "Stream Veteran", description: "Complete 50 live streams", icon: "🎖️", threshold: 50 },
  { id: "stream_100", key: "streams", title: "Century Caster", description: "Complete 100 live streams", icon: "💯", threshold: 100 },
  { id: "viewers_100", key: "peak_viewers", title: "Growing Audience", description: "Reach 100 peak viewers", icon: "👀", threshold: 100 },
  { id: "viewers_1k", key: "peak_viewers", title: "Crowd Puller", description: "Reach 1,000 peak viewers", icon: "🏟️", threshold: 1000 },
  { id: "viewers_10k", key: "peak_viewers", title: "Viral Moment", description: "Reach 10,000 peak viewers", icon: "🌟", threshold: 10000 },
  { id: "hours_10", key: "hours_streamed", title: "10 Hours Live", description: "Stream for a total of 10 hours", icon: "⏱️", threshold: 10 },
  { id: "hours_100", key: "hours_streamed", title: "100 Hours Live", description: "Stream for a total of 100 hours", icon: "🕐", threshold: 100 },
  { id: "tips_50", key: "tips_received", title: "Tip Magnet", description: "Receive 50 tips", icon: "💰", threshold: 50 },
  { id: "members_100", key: "members", title: "Community Builder", description: "Reach 100 community members", icon: "👥", threshold: 100 },
  { id: "members_1k", key: "members", title: "1K Community", description: "Reach 1,000 community members", icon: "🏆", threshold: 1000 },
];

export function useStreamAchievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [newUnlock, setNewUnlock] = useState<Achievement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchProgress = async () => {
      // Get stream count
      const { count: streamCount } = await supabase
        .from("mux_live_streams")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Get peak viewers (max from sessions)
      const { data: sessions } = await supabase
        .from("live_stream_sessions")
        .select("peak_viewers")
        .eq("stream_id", user.id)
        .order("peak_viewers", { ascending: false })
        .limit(1);
      const peakViewers = sessions?.[0]?.peak_viewers || 0;

      // Get total hours from recordings
      const { data: recordings } = await supabase
        .from("stream_recordings")
        .select("duration_seconds")
        .eq("creator_id", user.id);
      const totalHours = (recordings || []).reduce((sum, r) => sum + (r.duration_seconds || 0), 0) / 3600;

      // Get tips count
      const { count: tipsCount } = await supabase
        .from("tip_transactions")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id);

      // Get members count
      const { count: membersCount } = await supabase
        .from("community_members")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", user.id);

      const progressMap: Record<string, number> = {
        streams: streamCount || 0,
        peak_viewers: peakViewers,
        hours_streamed: Math.floor(totalHours),
        tips_received: tipsCount || 0,
        members: membersCount || 0,
      };

      const computed = ACHIEVEMENT_DEFS.map((def) => {
        const progress = progressMap[def.key] || 0;
        const unlocked = progress >= def.threshold;
        return {
          ...def,
          progress: Math.min(progress, def.threshold),
          unlockedAt: unlocked ? new Date().toISOString() : undefined,
        };
      });

      setAchievements(computed);
      setLoading(false);
    };

    fetchProgress();
  }, [user]);

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;
  const totalCount = achievements.length;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return {
    achievements,
    unlockedCount,
    totalCount,
    progressPercent,
    newUnlock,
    clearNewUnlock: () => setNewUnlock(null),
    loading,
  };
}
