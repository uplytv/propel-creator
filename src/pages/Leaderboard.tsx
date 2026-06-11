import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Crown, Medal, Users, TrendingUp, ArrowLeft, Search, Flame, Star, Sparkles, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useLeaderboard } from "@/hooks/useLeaderboard";

function formatScore(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString();
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const row = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" as const } } };

const PODIUM_STYLES = [
  { gradient: "from-yellow-400/20 to-amber-500/5", ring: "ring-yellow-400/40", text: "text-yellow-400", bg: "bg-yellow-400", icon: Crown },
  { gradient: "from-slate-300/15 to-slate-400/5", ring: "ring-slate-300/30", text: "text-slate-300", bg: "bg-slate-300", icon: Trophy },
  { gradient: "from-amber-600/15 to-orange-500/5", ring: "ring-amber-600/30", text: "text-amber-500", bg: "bg-amber-600", icon: Medal },
];

export default function Leaderboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data: entries = [], isLoading } = useLeaderboard();

  const filtered = search
    ? entries.filter((e: any) => (e.display_name || "").toLowerCase().includes(search.toLowerCase()))
    : entries;

  const topThree = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-30">
        <div className="container flex items-center gap-4 h-14">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Creator Leaderboard</h1>
          </div>
          <div className="flex-1" />
          <Button variant="hero" size="sm" onClick={() => navigate("/onboarding")} className="hidden sm:flex">
            Join as Creator
          </Button>
        </div>
      </header>

      <div className="container py-8 md:py-12 max-w-3xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <Sparkles className="w-3 h-3" /> Updated in real-time
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Top Creators</h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">Real creators building real businesses.</p>
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex justify-center mb-8">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search creators..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card/60 p-4 animate-pulse flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-secondary" />
                <div className="w-10 h-10 rounded-full bg-secondary" />
                <div className="flex-1 h-4 bg-secondary rounded" />
                <div className="w-16 h-4 bg-secondary rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No creators on the leaderboard yet</h3>
            <p className="text-muted-foreground">Be the first to make your mark.</p>
          </div>
        ) : (
          <>
            {/* Podium - Top 3 */}
            {topThree.length >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-end justify-center gap-4 md:gap-6 max-w-xl mx-auto mb-12"
              >
                {[topThree[1], topThree[0], topThree[2]].map((c: any, i: number) => {
                  const podiumOrder = [2, 1, 3];
                  const rank = podiumOrder[i];
                  const isFirst = rank === 1;
                  const style = PODIUM_STYLES[rank - 1];
                  const PodiumIcon = style.icon;

                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className={`flex flex-col items-center text-center ${isFirst ? "-mt-6" : "mt-4"}`}
                      style={{ width: isFirst ? "40%" : "30%" }}
                    >
                      {/* Icon */}
                      <PodiumIcon className={`w-5 h-5 ${style.text} mb-2`} />

                      {/* Avatar with rank badge */}
                      <div className="relative mb-2">
                        <div className={`rounded-full bg-gradient-to-br ${style.gradient} p-0.5 ring-2 ${style.ring}`}>
                          {c.avatar_url ? (
                            <img src={c.avatar_url} alt={c.display_name || ""} className={`rounded-full object-cover ${isFirst ? "w-20 h-20" : "w-14 h-14"}`} loading="lazy" />
                          ) : (
                            <div className={`rounded-full flex items-center justify-center font-bold ${style.text} ${
                              isFirst ? "w-20 h-20 text-xl" : "w-14 h-14 text-base"
                            }`}>
                              {(c.display_name || "C").charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full ${style.bg} flex items-center justify-center shadow-lg`}>
                          <span className="text-[11px] font-extrabold text-black">{rank}</span>
                        </div>
                      </div>

                      {/* Name */}
                      <p className="font-semibold text-sm truncate max-w-full text-foreground">{c.display_name}</p>

                      {/* Score */}
                      <span className={`font-bold tabular-nums ${isFirst ? "text-primary text-lg" : "text-foreground text-base"}`}>
                        {formatScore(c.score)} pts
                      </span>

                      {/* Streak */}
                      {c.streak_days >= 3 && (
                        <div className="flex items-center gap-1 text-xs mt-1">
                          <Flame className="w-3 h-3 text-warning" />
                          <span className="text-warning font-medium">{c.streak_days}d</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* Full List */}
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
              {(topThree.length < 3 ? filtered : rest).map((creator: any) => (
                <motion.div key={creator.id} variants={row}
                  className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border border-border bg-card/60 hover:bg-card hover:border-primary/20 transition-all duration-200 group"
                >
                  <div className="flex-shrink-0 w-8 text-center">
                    {creator.rank <= 3 ? (
                      <div className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center ${
                        creator.rank === 1 ? "bg-yellow-400" : creator.rank === 2 ? "bg-slate-300" : "bg-amber-600"
                      }`}>
                        <span className="text-[10px] font-bold text-black">{creator.rank}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground tabular-nums">#{creator.rank}</span>
                    )}
                  </div>
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt={creator.display_name || ""} className="flex-shrink-0 w-10 h-10 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {(creator.display_name || "C").charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">{creator.display_name}</p>
                      {creator.streak_days >= 3 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-warning/10 text-warning px-1.5 py-0.5 rounded-full border border-warning/20">
                          <Flame className="w-3 h-3" />{creator.streak_days}d
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-2">
                    <span className="font-bold tabular-nums text-foreground">{formatScore(creator.score)}</span>
                    <span className="text-xs text-muted-foreground">pts</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {/* CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center mt-16">
          <div className="relative py-12 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-yellow-500/5 pointer-events-none" />
            <div className="relative">
              <h3 className="text-xl md:text-2xl font-bold mb-2">Ready to see your name here?</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">Join thousands of creators turning their expertise into thriving businesses.</p>
              <Button variant="hero" size="lg" onClick={() => navigate("/onboarding")}>Start Creating Today</Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
