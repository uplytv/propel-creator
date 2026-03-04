import { useState, useMemo, useEffect, useRef } from "react";
import { motion, useInView, useSpring, useMotionValue, useTransform } from "framer-motion";
import { Trophy, Crown, Medal, Users, TrendingUp, Filter, ArrowLeft, Search, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

type TimePeriod = "weekly" | "monthly" | "all-time";
type Niche = "all" | "fitness" | "photography" | "business" | "music" | "design" | "tech" | "education" | "lifestyle";

interface Creator {
  rank: number;
  name: string;
  niche: Niche;
  nicheLabel: string;
  earnings: { weekly: number; monthly: number; "all-time": number };
  members: string;
  avatar: string;
  growth: number; // percentage
  streak?: number; // weeks on leaderboard
}

const creators: Creator[] = [
  { rank: 1, name: "Sarah Chen", niche: "fitness", nicheLabel: "Fitness & Nutrition", earnings: { weekly: 12050, monthly: 48200, "all-time": 312000 }, members: "12.4K", avatar: "SC", growth: 24, streak: 12 },
  { rank: 2, name: "Marcus Rivera", niche: "photography", nicheLabel: "Photography", earnings: { weekly: 9200, monthly: 36800, "all-time": 245000 }, members: "8.7K", avatar: "MR", growth: 18, streak: 8 },
  { rank: 3, name: "Aisha Patel", niche: "business", nicheLabel: "Business Strategy", earnings: { weekly: 7875, monthly: 31500, "all-time": 198000 }, members: "6.2K", avatar: "AP", growth: 31, streak: 10 },
  { rank: 4, name: "Jake Morrison", niche: "music", nicheLabel: "Music Production", earnings: { weekly: 6025, monthly: 24100, "all-time": 167000 }, members: "5.1K", avatar: "JM", growth: 12 },
  { rank: 5, name: "Luna Zhang", niche: "design", nicheLabel: "UX Design", earnings: { weekly: 4937, monthly: 19750, "all-time": 142000 }, members: "4.3K", avatar: "LZ", growth: 22, streak: 6 },
  { rank: 6, name: "Devon Brooks", niche: "tech", nicheLabel: "Web Development", earnings: { weekly: 4500, monthly: 18000, "all-time": 128000 }, members: "3.9K", avatar: "DB", growth: 15 },
  { rank: 7, name: "Priya Sharma", niche: "education", nicheLabel: "Language Learning", earnings: { weekly: 4125, monthly: 16500, "all-time": 115000 }, members: "3.6K", avatar: "PS", growth: 28, streak: 5 },
  { rank: 8, name: "Tyler Knox", niche: "fitness", nicheLabel: "Strength Training", earnings: { weekly: 3750, monthly: 15000, "all-time": 104000 }, members: "3.2K", avatar: "TK", growth: 9 },
  { rank: 9, name: "Mei Lin", niche: "lifestyle", nicheLabel: "Mindfulness", earnings: { weekly: 3500, monthly: 14000, "all-time": 96000 }, members: "2.8K", avatar: "ML", growth: 35, streak: 4 },
  { rank: 10, name: "Carlos Gomez", niche: "business", nicheLabel: "E-commerce", earnings: { weekly: 3250, monthly: 13000, "all-time": 89000 }, members: "2.5K", avatar: "CG", growth: 19 },
  { rank: 11, name: "Nina Volkov", niche: "design", nicheLabel: "Brand Design", earnings: { weekly: 3000, monthly: 12000, "all-time": 82000 }, members: "2.3K", avatar: "NV", growth: 14 },
  { rank: 12, name: "Omar Hassan", niche: "tech", nicheLabel: "AI & ML", earnings: { weekly: 2875, monthly: 11500, "all-time": 76000 }, members: "2.1K", avatar: "OH", growth: 42, streak: 3 },
  { rank: 13, name: "Suki Tanaka", niche: "photography", nicheLabel: "Film Photography", earnings: { weekly: 2625, monthly: 10500, "all-time": 71000 }, members: "1.9K", avatar: "ST", growth: 11 },
  { rank: 14, name: "Leo Park", niche: "music", nicheLabel: "Beat Making", earnings: { weekly: 2500, monthly: 10000, "all-time": 65000 }, members: "1.7K", avatar: "LP", growth: 8 },
  { rank: 15, name: "Rachel Foster", niche: "education", nicheLabel: "Test Prep", earnings: { weekly: 2375, monthly: 9500, "all-time": 58000 }, members: "1.5K", avatar: "RF", growth: 16 },
  { rank: 16, name: "Kai Williams", niche: "lifestyle", nicheLabel: "Productivity", earnings: { weekly: 2250, monthly: 9000, "all-time": 52000 }, members: "1.4K", avatar: "KW", growth: 21 },
  { rank: 17, name: "Zara Ahmed", niche: "fitness", nicheLabel: "Yoga & Mobility", earnings: { weekly: 2125, monthly: 8500, "all-time": 47000 }, members: "1.2K", avatar: "ZA", growth: 33 },
  { rank: 18, name: "Victor Reyes", niche: "business", nicheLabel: "Sales Coaching", earnings: { weekly: 2000, monthly: 8000, "all-time": 43000 }, members: "1.1K", avatar: "VR", growth: 7 },
  { rank: 19, name: "Ella Thompson", niche: "design", nicheLabel: "Illustration", earnings: { weekly: 1875, monthly: 7500, "all-time": 39000 }, members: "980", avatar: "ET", growth: 25 },
  { rank: 20, name: "Dante Silva", niche: "tech", nicheLabel: "Cybersecurity", earnings: { weekly: 1750, monthly: 7000, "all-time": 35000 }, members: "870", avatar: "DS", growth: 17 },
];

const niches: { value: Niche; label: string }[] = [
  { value: "all", label: "All Niches" },
  { value: "fitness", label: "Fitness" },
  { value: "photography", label: "Photography" },
  { value: "business", label: "Business" },
  { value: "music", label: "Music" },
  { value: "design", label: "Design" },
  { value: "tech", label: "Tech" },
  { value: "education", label: "Education" },
  { value: "lifestyle", label: "Lifestyle" },
];

const timePeriods: { value: TimePeriod; label: string }[] = [
  { value: "weekly", label: "This Week" },
  { value: "monthly", label: "This Month" },
  { value: "all-time", label: "All Time" },
];

function formatCurrency(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 1 : 1)}K` : `$${n.toLocaleString()}`;
}

function AnimatedCurrency({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20, mass: 1 });
  const [display, setDisplay] = useState("$0");

  useEffect(() => {
    if (isInView) motionVal.set(value);
    else motionVal.set(0);
  }, [isInView, value, motionVal]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (v) => {
      const n = Math.round(v);
      setDisplay(n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toLocaleString()}`);
    });
    return unsubscribe;
  }, [spring]);

  return <span ref={ref} className={className}>{display}</span>;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const row = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" as const } } };

export default function Leaderboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<TimePeriod>("monthly");
  const [niche, setNiche] = useState<Niche>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = [...creators];
    if (niche !== "all") list = list.filter((c) => c.niche === niche);
    if (search) list = list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.nicheLabel.toLowerCase().includes(search.toLowerCase()));
    list.sort((a, b) => b.earnings[period] - a.earnings[period]);
    return list.map((c, i) => ({ ...c, rank: i + 1 }));
  }, [period, niche, search]);

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
      {/* Header */}
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
        {/* Headline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Top Earning Creators</h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">Real creators building real businesses. Updated in real-time.</p>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-3 mb-8">
          {/* Time Period Tabs */}
          <div className="flex rounded-lg bg-muted p-1 gap-0.5">
            {timePeriods.map((t) => (
              <button
                key={t.value}
                onClick={() => setPeriod(t.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  period === t.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Niche Filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {niches.map((n) => (
              <button
                key={n.value}
                onClick={() => setNiche(n.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all ${
                  niche === n.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>

          <div className="sm:ml-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search creators..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-full sm:w-56" />
          </div>
        </motion.div>

        {/* Podium - Top 3 */}
        {topThree.length >= 3 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto mb-12">
            {[topThree[1], topThree[0], topThree[2]].map((c, i) => {
              const podiumOrder = [2, 1, 3];
              const isFirst = podiumOrder[i] === 1;
              return (
                <motion.div
                  key={c.name}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className={`flex flex-col items-center text-center ${isFirst ? "-mt-4" : "mt-4"}`}
                >
                  <div className="mb-2">{getRankIcon(podiumOrder[i])}</div>
                  <div className={`rounded-full flex items-center justify-center font-bold mb-2 ${
                    isFirst
                      ? "w-16 h-16 md:w-20 md:h-20 bg-primary text-primary-foreground text-lg md:text-xl ring-4 ring-primary/20"
                      : "w-12 h-12 md:w-16 md:h-16 bg-muted text-muted-foreground text-sm md:text-base"
                  }`}>
                    {c.avatar}
                  </div>
                  <p className="font-semibold text-sm md:text-base truncate max-w-full">{c.name}</p>
                  <p className="text-xs text-muted-foreground mb-1 truncate max-w-full">{c.nicheLabel}</p>
                  <AnimatedCurrency value={c.earnings[period]} className={`font-bold tabular-nums ${isFirst ? "text-primary text-lg" : "text-foreground"}`} />
                  <div className="flex items-center gap-1 text-xs mt-1">
                    <TrendingUp className="w-3 h-3 text-primary" />
                    <span className="text-primary font-medium">+{c.growth}%</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Full List */}
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
          {(topThree.length < 3 ? filtered : rest).map((creator, i) => {
            const displayRank = topThree.length < 3 ? creator.rank : creator.rank;
            return (
              <motion.div
                key={creator.name}
                variants={row}
                className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl glass-card hover:shadow-md transition-all duration-200 hover:scale-[1.01] group"
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-8 text-center">
                  {getRankIcon(displayRank) || (
                    <span className="text-sm font-bold text-muted-foreground">#{displayRank}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  {creator.avatar}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">{creator.name}</p>
                    {creator.streak && creator.streak >= 4 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">
                        <Flame className="w-3 h-3" />
                        {creator.streak}w
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{creator.nicheLabel}</p>
                </div>

                {/* Members */}
                <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-xs">{creator.members}</span>
                </div>

                {/* Growth */}
                <div className="hidden md:flex items-center gap-1 text-xs">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  <span className="text-primary font-medium">+{creator.growth}%</span>
                </div>

                {/* Earnings */}
                <div className="text-right flex-shrink-0">
                  <AnimatedCurrency value={creator.earnings[period]} className="font-bold tabular-nums text-foreground" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No creators found matching your filters.</p>
          </div>
        )}

        {/* CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center mt-16 py-12 rounded-2xl bg-muted/30">
          <h3 className="text-xl md:text-2xl font-bold mb-2">Ready to see your name here?</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Join thousands of creators turning their expertise into thriving businesses.</p>
          <Button variant="hero" size="lg" onClick={() => navigate("/onboarding")}>
            Start Creating Today
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
