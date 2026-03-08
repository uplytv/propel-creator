import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Users, TrendingUp, ArrowLeft, Search, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useLeaderboard } from "@/hooks/useLeaderboard";

function formatScore(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString();
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const row = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" as const } } };

export default function Leaderboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data: entries = [], isLoading } = useLeaderboard();

  const filtered = search
    ? entries.filter((e: any) => (e.display_name || "").toLowerCase().includes(search.toLowerCase()))
    : entries;

  const topThree = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-primary" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-muted-foreground" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-muted-foreground" />;
    return null;
  };

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

      <div className="container py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Top Creators</h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">Real creators building real businesses.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex justify-center mb-8">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search creators..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="glass-card p-4 animate-pulse flex items-center gap-4">
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
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col sm:grid sm:grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto mb-12">
                {[topThree[1], topThree[0], topThree[2]].map((c: any, i: number) => {
                  const podiumOrder = [2, 1, 3];
                  const isFirst = podiumOrder[i] === 1;
                  return (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                      className={`flex flex-col items-center text-center ${isFirst ? "sm:-mt-4 order-first sm:order-none" : "sm:mt-4"}`}
                    >
                      <div className="mb-2">{getRankIcon(podiumOrder[i])}</div>
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" className={`rounded-full object-cover mb-2 ${isFirst ? "w-16 h-16 md:w-20 md:h-20 ring-4 ring-primary/20" : "w-12 h-12 md:w-16 md:h-16"}`} />
                      ) : (
                        <div className={`rounded-full flex items-center justify-center font-bold mb-2 ${
                          isFirst ? "w-16 h-16 md:w-20 md:h-20 bg-primary text-primary-foreground text-lg md:text-xl ring-4 ring-primary/20" : "w-12 h-12 md:w-16 md:h-16 bg-muted text-muted-foreground text-sm md:text-base"
                        }`}>
                          {(c.display_name || "C").charAt(0)}
                        </div>
                      )}
                      <p className="font-semibold text-sm md:text-base truncate max-w-full">{c.display_name}</p>
                      <span className={`font-bold tabular-nums ${isFirst ? "text-primary text-lg" : "text-foreground"}`}>{formatScore(c.score)} pts</span>
                      {c.streak_days >= 3 && (
                        <div className="flex items-center gap-1 text-xs mt-1">
                          <Flame className="w-3 h-3 text-warning" />
                          <span className="text-warning font-medium">{c.streak_days}d streak</span>
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
                  className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl glass-card hover:shadow-md transition-all duration-200 hover:scale-[1.01] group"
                >
                  <div className="flex-shrink-0 w-8 text-center">
                    {getRankIcon(creator.rank) || <span className="text-sm font-bold text-muted-foreground">#{creator.rank}</span>}
                  </div>
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt="" className="flex-shrink-0 w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {(creator.display_name || "C").charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">{creator.display_name}</p>
                      {creator.streak_days >= 3 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">
                          <Flame className="w-3 h-3" />{creator.streak_days}d
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-bold tabular-nums text-foreground">{formatScore(creator.score)} pts</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {/* CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center mt-16 py-12 rounded-2xl bg-muted/30">
          <h3 className="text-xl md:text-2xl font-bold mb-2">Ready to see your name here?</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Join thousands of creators turning their expertise into thriving businesses.</p>
          <Button variant="hero" size="lg" onClick={() => navigate("/onboarding")}>Start Creating Today</Button>
        </motion.div>
      </div>
    </div>
  );
}
