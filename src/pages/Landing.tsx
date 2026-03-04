import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { useRef, useMemo, useCallback } from "react";
import { Brain, Users, User, Box, Check, ArrowRight, Zap, Shield, TrendingUp, Star, Crown, Trophy, Medal, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import StreamCard from "@/components/live/StreamCard";
import { mockStreams } from "@/data/mockStreams";

const features = [
  { icon: Brain, title: "AI Growth Partner", desc: "Your always-on strategist that learns your business and delivers personalized growth plans." },
  { icon: User, title: "Tiered Human Support", desc: "As you grow, unlock a dedicated success rep invested in your results." },
  { icon: Users, title: "Built-in Community", desc: "Premium community tools designed for engagement and retention." },
  { icon: Box, title: "Sell Anything Digital", desc: "Courses, memberships, coaching, downloads — all in one place." },
];

const tiers = [
  { name: "Starter", range: "0–100 members", features: ["AI Growth Partner", "Community tools", "Basic analytics", "Email support"], glow: false },
  { name: "Rising", range: "100–500 members", features: ["Everything in Starter", "Advanced analytics", "Priority AI insights", "Template library"], glow: false },
  { name: "Scaling", range: "500–2K members", features: ["Everything in Rising", "Dedicated success rep", "Custom growth plan", "Revenue optimization"], glow: true },
  { name: "Elite", range: "2K+ members", features: ["Everything in Scaling", "Executive strategy calls", "Co-marketing opportunities", "Direct Slack channel"], glow: true },
];

const pricing = [
  { name: "Free", price: "0", period: "forever", fee: "5% transaction fee", features: ["AI Growth Partner", "Community tools", "Up to 100 members", "Basic analytics"] },
  { name: "Pro", price: "49", period: "/month", fee: "2% transaction fee", features: ["Everything in Free", "Unlimited members", "Advanced analytics", "Priority support"], popular: true },
  { name: "Scale", price: "99", period: "/month", fee: "0% transaction fee", features: ["Everything in Pro", "Dedicated success rep", "Custom integrations", "White-label options"] },
];

const ease = [0.22, 1, 0.36, 1] as const;
const container = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const item = { hidden: { opacity: 0, y: 30, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: "easeOut" as const } } };

const sectionHeading = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};

export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const glowY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const gridY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const glowScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const gridOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.3]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 80, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 80, damping: 30 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }, [mouseX, mouseY]);

  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: `${Math.random() * 100}%`,
      y: `${Math.random() * 100}%`,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 4,
      drift: Math.random() * 60 - 30,
    })), []
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-foreground">PLATFORM</span>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate("/live")} className="text-sm text-primary font-semibold hover:text-primary/80 transition-colors flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              Live
            </button>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#tiers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Tiers</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Log in</Button>
            <Button variant="default" size="sm" onClick={() => navigate("/auth")}>Start Free</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden pt-32 pb-20 md:pt-44 md:pb-32" onMouseMove={handleMouseMove}>
        {/* Mouse-following glow */}
        <motion.div
          className="absolute z-[1] pointer-events-none w-[400px] h-[400px] rounded-full opacity-30 dark:opacity-40 blur-[100px] bg-primary/30"
          style={{
            left: springX,
            top: springY,
            translateX: "-50%",
            translateY: "-50%",
          }}
        />
        <motion.div
          className="absolute inset-0 z-0 hero-glow-layer"
          style={{ y: glowY, scale: glowScale }}
        />
        <motion.div
          className="absolute inset-0 z-0 hero-grid-layer"
          style={{ y: gridY, opacity: gridOpacity }}
        />
        {/* Floating particles */}
        <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full bg-primary/20 dark:bg-primary/30"
              style={{ left: p.x, top: p.y, width: p.size, height: p.size }}
              animate={{
                y: [0, -40, 0],
                x: [0, p.drift, 0],
                opacity: [0, 0.8, 0],
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
              The only creator platform that{" "}
              <span className="text-gradient">grows with you.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
              AI gets you started. Our team helps you scale.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl" onClick={() => navigate("/onboarding")}>
                Start Free <ArrowRight className="ml-1" />
              </Button>
              <Button variant="hero-outline" size="xl" onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}>
                See How It Works
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live Now Section */}
      <section className="pb-20 md:pb-32">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-3">
              <div className="live-badge flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-bold">
                <span className="live-dot w-2.5 h-2.5 rounded-full" />
                LIVE NOW
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Trending Streams</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/live")} className="text-primary gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...mockStreams].sort((a, b) => b.viewers - a.viewers).slice(0, 4).map((s, i) => (
              <StreamCard key={s.id} stream={s} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section id="features" className="pb-20 md:pb-32">
        <div className="container">
          <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-4 md:overflow-visible scrollbar-none">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.12, duration: 0.6, ease: "easeOut" }}
                className="glass-card-hover p-6 min-w-[260px] md:min-w-0"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-y border-border/50">
        <div className="container">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-muted-foreground text-lg"
          >
            Join <span className="text-foreground font-bold">10,000+</span> creators already growing on <span className="text-foreground font-bold">PLATFORM</span>
          </motion.p>
        </div>
      </section>

      {/* Tier Preview */}
      <section id="tiers" className="py-20 md:py-32">
        <div className="container">
          <motion.div variants={sectionHeading} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Grow your way. We'll grow with you.</h2>
            <p className="text-muted-foreground text-lg">Every tier unlocks more support, more tools, more investment in your success.</p>
          </motion.div>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers.map((t, i) => (
              <motion.div
                key={t.name}
                variants={item}
                className={`glass-card p-6 ${t.glow ? "glow-border animate-pulse-glow" : ""}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Star className={`w-4 h-4 ${t.glow ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Tier {i + 1}</span>
                </div>
                <h3 className="text-xl font-bold mb-1">{t.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t.range}</p>
                <ul className="space-y-2">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-32">
        <div className="container">
          <motion.div variants={sectionHeading} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-lg">Start free. Upgrade when you're ready.</p>
          </motion.div>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {pricing.map((p) => (
              <motion.div
                key={p.name}
                variants={item}
                className={`glass-card p-8 relative ${p.popular ? "glow-border" : ""}`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold mb-2">{p.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-extrabold">${p.price}</span>
                  <span className="text-muted-foreground text-sm">{p.period}</span>
                </div>
                <p className="text-sm text-primary font-medium mb-6">{p.fee}</p>
                <ul className="space-y-3 mb-8">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button variant={p.popular ? "hero" : "outline"} className="w-full" onClick={() => navigate("/onboarding")}>
                  Get Started
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Creator Leaderboard */}
      <section id="leaderboard" className="py-20 md:py-32 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="container relative">
          <motion.div variants={sectionHeading} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              <Trophy className="w-4 h-4" />
              Live Leaderboard
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Top creators earning right now</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Real creators. Real revenue. See who's leading the pack this month.</p>
          </motion.div>

          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="max-w-3xl mx-auto space-y-3">
            {[
              { rank: 1, name: "Sarah Chen", niche: "Fitness & Nutrition", earnings: "$48,200", members: "12.4K", avatar: "SC", icon: Crown },
              { rank: 2, name: "Marcus Rivera", niche: "Photography", earnings: "$36,800", members: "8.7K", avatar: "MR", icon: Trophy },
              { rank: 3, name: "Aisha Patel", niche: "Business Strategy", earnings: "$31,500", members: "6.2K", avatar: "AP", icon: Medal },
              { rank: 4, name: "Jake Morrison", niche: "Music Production", earnings: "$24,100", members: "5.1K", avatar: "JM" },
              { rank: 5, name: "Luna Zhang", niche: "UX Design", earnings: "$19,750", members: "4.3K", avatar: "LZ" },
            ].map((creator, i) => (
              <motion.div
                key={creator.name}
                variants={item}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                  i === 0
                    ? "glass-card glow-border bg-primary/[0.03]"
                    : "glass-card hover:shadow-md"
                }`}
              >
                {/* Rank */}
                <div className={`flex-shrink-0 w-8 text-center font-bold text-lg ${
                  i === 0 ? "text-primary" : i < 3 ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {creator.icon ? <creator.icon className={`w-5 h-5 mx-auto ${i === 0 ? "text-primary" : "text-muted-foreground"}`} /> : `#${creator.rank}`}
                </div>

                {/* Avatar */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  i === 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {creator.avatar}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{creator.name}</p>
                  <p className="text-xs text-muted-foreground">{creator.niche}</p>
                </div>

                {/* Stats */}
                <div className="hidden sm:block text-right">
                  <p className="text-xs text-muted-foreground">{creator.members} members</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold tabular-nums ${i === 0 ? "text-primary text-lg" : "text-foreground"}`}>
                    {creator.earnings}
                  </p>
                  <p className="text-xs text-muted-foreground">this month</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-center mt-12"
          >
            <Button variant="hero" size="lg" onClick={() => navigate("/leaderboard")} className="gap-2">
              View Full Leaderboard <ArrowRight className="w-4 h-4" />
            </Button>
            <p className="text-xs text-muted-foreground mt-3">Join 2,400+ creators already growing on PLATFORM</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <span className="text-xl font-bold">PLATFORM</span>
              <p className="text-sm text-muted-foreground mt-1">Built for creators who are serious about growth.</p>
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#tiers" className="hover:text-foreground transition-colors">Tiers</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
