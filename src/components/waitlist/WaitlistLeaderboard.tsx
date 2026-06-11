import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Flame, Trophy, Medal, TrendingUp, Star } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  full_name: string;
  referral_count: number;
  avatar_url?: string | null;
}

const PODIUM_COLORS = [
  { ring: "ring-yellow-400/40", bg: "bg-gradient-to-br from-yellow-400/20 to-amber-500/10", text: "text-yellow-400", icon: Crown },
  { ring: "ring-slate-300/30", bg: "bg-gradient-to-br from-slate-300/15 to-slate-400/5", text: "text-slate-300", icon: Trophy },
  { ring: "ring-amber-600/30", bg: "bg-gradient-to-br from-amber-600/15 to-orange-500/5", text: "text-amber-500", icon: Medal },
];

export default function WaitlistLeaderboard({ currentEmail }: { currentEmail: string }) {
  const [top, setTop] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardEntry & { rank: number } | null>(null);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from("waitlist")
      .select("id, full_name, referral_count")
      .order("referral_count", { ascending: false })
      .limit(10) as any;
    if (data) setTop(data);

    const { data: me } = await supabase
      .from("waitlist")
      .select("id, full_name, referral_count")
      .eq("email", currentEmail)
      .maybeSingle() as any;
    if (me) {
      const { count } = await supabase
        .from("waitlist")
        .select("*", { count: "exact", head: true })
        .gt("referral_count", me.referral_count) as any;
      setCurrentUser({ ...me, rank: (count || 0) + 1 });
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const channel = supabase
      .channel("waitlist-leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "waitlist" }, () => fetchLeaderboard())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentEmail]);

  const formatName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };

  const isCurrentInTop = currentUser && top.some((t) => t.id === currentUser.id);
  const topThree = top.slice(0, 3);
  const rest = top.slice(3);

  const getBadge = (count: number) => {
    if (count >= 25) return { label: "Founding Creator", emoji: "👑", className: "bg-yellow-400/15 text-yellow-400 border border-yellow-400/20" };
    if (count >= 10) return { label: "Top 100", emoji: "🔥", className: "bg-primary/10 text-primary border border-primary/20" };
    if (count >= 3) return { label: "Early Access", emoji: "🚀", className: "bg-primary/10 text-primary border border-primary/20" };
    return null;
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-card">
      {/* Header */}
      <div className="relative px-6 pt-6 pb-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-yellow-500/5 pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Top Inviters
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              The creators bringing the most talent to UPLY
            </p>
          </div>
          {top.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              <TrendingUp className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-semibold text-primary">LIVE</span>
            </div>
          )}
        </div>
      </div>

      {/* Podium - Top 3 */}
      {topThree.length >= 3 && (
        <div className="px-6 pb-4">
          <div className="flex items-end justify-center gap-3">
            {[topThree[1], topThree[0], topThree[2]].map((entry, i) => {
              const podiumOrder = [2, 1, 3];
              const rank = podiumOrder[i];
              const isFirst = rank === 1;
              const style = PODIUM_COLORS[rank - 1];
              const PodiumIcon = style.icon;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.1 }}
                  className={`flex flex-col items-center ${isFirst ? "order-none -mt-2" : "mt-2"}`}
                  style={{ width: isFirst ? "40%" : "30%" }}
                >
                  <PodiumIcon className={`w-4 h-4 ${style.text} mb-1.5`} />
                  <div className={`relative rounded-full ${style.bg} p-0.5 ring-2 ${style.ring} mb-1.5`}>
                    {entry.avatar_url ? (
                      <img src={entry.avatar_url} alt="" loading="lazy" className={`rounded-full object-cover ${isFirst ? "w-14 h-14" : "w-10 h-10"}`} />
                    ) : (
                      <div className={`rounded-full flex items-center justify-center font-bold ${style.text} ${isFirst ? "w-14 h-14 text-lg" : "w-10 h-10 text-sm"}`}>
                        {formatName(entry.full_name)[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full ${rank === 1 ? "bg-yellow-400" : rank === 2 ? "bg-slate-300" : "bg-amber-600"} flex items-center justify-center`}>
                      <span className="text-[10px] font-bold text-black">{rank}</span>
                    </div>
                  </div>
                  <p className="font-semibold text-xs text-foreground text-center truncate max-w-full mt-1">{formatName(entry.full_name)}</p>
                  <span className="text-xs font-bold text-primary tabular-nums">{entry.referral_count}</span>
                  <span className="text-[9px] text-muted-foreground">referrals</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="mx-6 border-t border-border" />

      {/* Rest of the list */}
      <div className="px-6 py-3 space-y-1">
        {top.length === 0 ? (
          <div className="text-center py-8">
            <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground mb-1">No referrals yet</p>
            <p className="text-xs text-muted-foreground">Be the first to invite a friend!</p>
          </div>
        ) : (
          <AnimatePresence>
            {(topThree.length < 3 ? top : rest).map((entry, i) => {
              const rank = topThree.length < 3 ? i + 1 : i + 4;
              const isMe = currentUser?.id === entry.id;
              const badge = getBadge(entry.referral_count);

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-center gap-3 py-2.5 px-2 rounded-lg transition-colors ${isMe ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-secondary/50"}`}
                >
                  <span className="font-bold text-xs w-6 text-center tabular-nums text-muted-foreground">#{rank}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden ${isMe ? "bg-primary/20 text-primary ring-1 ring-primary/30" : "bg-secondary text-muted-foreground"}`}>
                    {entry.avatar_url ? (
                      <img src={entry.avatar_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      formatName(entry.full_name)[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-semibold truncate block ${isMe ? "text-primary" : "text-foreground"}`}>
                      {formatName(entry.full_name)}{isMe ? " (You)" : ""}
                    </span>
                  </div>
                  {badge && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${badge.className}`}>
                      {badge.emoji} {badge.label}
                    </span>
                  )}
                  <span className="text-xs font-bold text-primary tabular-nums flex-shrink-0">{entry.referral_count}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Pinned current user if not in top 10 */}
      {currentUser && !isCurrentInTop && (
        <>
          <div className="mx-6 border-t border-border">
            <p className="text-center text-xs py-1 text-muted-foreground">•••</p>
          </div>
          <div className="px-6 pb-4">
            <div className="flex items-center gap-3 py-2.5 px-2 rounded-lg bg-primary/5 ring-1 ring-primary/20">
              <span className="font-bold text-xs w-6 text-center tabular-nums text-primary">#{currentUser.rank}</span>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 ring-1 ring-primary/30">
                {formatName(currentUser.full_name)[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-primary font-semibold flex-1">{formatName(currentUser.full_name)} (You)</span>
              <span className="text-xs font-bold text-primary tabular-nums">{currentUser.referral_count}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
