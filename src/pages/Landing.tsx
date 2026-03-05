import { motion, useScroll, useTransform, useMotionValue, useSpring, useInView } from "framer-motion";
import { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { Brain, Users, User, Box, Check, ArrowRight, Zap, Shield, TrendingUp, Star, Crown, Trophy, Medal, Radio, Sparkles, BarChart3, Heart, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import StreamCard from "@/components/live/StreamCard";
import { mockStreams } from "@/data/mockStreams";

const features = [
  { icon: Brain, title: "AI Growth Partner", desc: "Your always-on strategist that learns your business and delivers personalized growth plans.", accent: "from-primary/20 to-primary/5" },
  { icon: User, title: "Tiered Human Support", desc: "As you grow, unlock a dedicated success rep invested in your results.", accent: "from-primary/15 to-primary/5" },
  { icon: Users, title: "Built-in Community", desc: "Premium community tools designed for engagement and retention.", accent: "from-primary/20 to-primary/5" },
  { icon: Box, title: "Sell Anything Digital", desc: "Courses, memberships, coaching, downloads — all in one place.", accent: "from-primary/15 to-primary/5" },
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

const testimonials = [
  { name: "Sarah Chen", role: "Fitness Creator", avatar: "SC", quote: "I went from 0 to 2,000 members in 6 months. The AI growth partner is like having a CMO on speed dial.", revenue: "$48K/mo" },
  { name: "Marcus Rivera", role: "Photography Coach", avatar: "MR", quote: "The tier system actually motivated me to level up. Once I hit Scaling, my rep helped me 3x my revenue.", revenue: "$36K/mo" },
  { name: "Aisha Patel", role: "Business Strategist", avatar: "AP", quote: "Every other platform felt like a tool. This one feels like a partner that actually cares about my growth.", revenue: "$31K/mo" },
];

const heroStats = [
  { label: "Active Creators", value: 10000, suffix: "+", prefix: "" },
  { label: "Revenue Generated", value: 12, suffix: "M+", prefix: "$" },
  { label: "Communities Built", value: 4800, suffix: "+", prefix: "" },
  { label: "Avg. Growth Rate", value: 340, suffix: "%", prefix: "" },
];

function AnimatedCounter({ value, prefix = "", suffix = "", duration = 2 }: { value: number; prefix?: string; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = value;
    const step = Math.ceil(end / (duration * 60));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, value, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

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
          <img src="/logo.png" alt="Uply" className="h-[110px]" />
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
      <section ref={heroRef} className="relative overflow-hidden pt-32 pb-16 md:pt-44 md:pb-24" onMouseMove={handleMouseMove}>
        {/* Animated gradient mesh */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 dark:opacity-30"
            style={{ background: "radial-gradient(circle, hsl(265 90% 65%) 0%, transparent 70%)", top: "-10%", left: "-5%" }}
            animate={{ x: [0, 80, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-15 dark:opacity-25"
            style={{ background: "radial-gradient(circle, hsl(280 80% 72%) 0%, transparent 70%)", top: "20%", right: "-10%" }}
            animate={{ x: [0, -60, 0], y: [0, -50, 0], scale: [1.1, 0.95, 1.1] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute w-[450px] h-[450px] rounded-full blur-[110px] opacity-10 dark:opacity-20"
            style={{ background: "radial-gradient(circle, hsl(240 70% 60%) 0%, transparent 70%)", bottom: "-5%", left: "30%" }}
            animate={{ x: [0, 50, -30, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        {/* Mouse-following glow */}
        <motion.div
          className="absolute z-[1] pointer-events-none w-[400px] h-[400px] rounded-full opacity-30 dark:opacity-40 blur-[100px] bg-primary/30"
          style={{ left: springX, top: springY, translateX: "-50%", translateY: "-50%" }}
        />
        <motion.div className="absolute inset-0 z-0 hero-glow-layer" style={{ y: glowY, scale: glowScale }} />
        <motion.div className="absolute inset-0 z-0 hero-grid-layer" style={{ y: gridY, opacity: gridOpacity }} />
        {/* Floating particles */}
        <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full bg-primary/20 dark:bg-primary/30"
              style={{ left: p.x, top: p.y, width: p.size, height: p.size }}
              animate={{ y: [0, -40, 0], x: [0, p.drift, 0], opacity: [0, 0.8, 0], scale: [0.5, 1, 0.5] }}
              transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
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
            {/* Trust badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Trusted by 10,000+ creators worldwide
            </motion.div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6">
              The only creator platform that{" "}
              <span className="text-gradient">grows with you.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
              AI gets you started. Our team helps you scale.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl" onClick={() => navigate("/onboarding")}>
                Start Free <ArrowRight className="ml-1" />
              </Button>
              <Button variant="hero-outline" size="xl" onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}>
                <PlayCircle className="w-5 h-5 mr-1" /> See How It Works
              </Button>
            </div>

            {/* No credit card line */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-xs text-muted-foreground mt-5 flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-primary" /> No credit card required
              <span className="mx-1.5 text-border">·</span>
              <Check className="w-3.5 h-3.5 text-primary" /> Free forever plan
              <span className="mx-1.5 text-border">·</span>
              <Check className="w-3.5 h-3.5 text-primary" /> Setup in 2 minutes
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Hero Stats Bar */}
      <section className="py-10 md:py-14 border-y border-border/50 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent pointer-events-none" />
        <div className="container relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {heroStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-extrabold text-foreground tabular-nums">
                  <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </p>
                <p className="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Now Section */}
      <section className="py-20 md:py-28">
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
      <section id="features" className="py-20 md:py-28">
        <div className="container">
          <motion.div variants={sectionHeading} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to build, grow, and monetize</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto"><p className="text-muted-foreground text-lg max-w-2xl mx-auto">Four pillars that make Uply the last creator tool you'll ever need.</p></p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.12, duration: 0.6, ease: "easeOut" }}
                whileHover={{ y: -4, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
                className="glass-card p-6 group relative overflow-hidden"
              >
                {/* Subtle gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors duration-300 group-hover:scale-110 transform-gpu">
                    <f.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2 text-lg">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/[0.03] rounded-full blur-[120px] pointer-events-none" />
        <div className="container relative">
          <motion.div variants={sectionHeading} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              <Heart className="w-3.5 h-3.5" />
              Loved by Creators
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Creators are building real businesses here</h2>
            <p className="text-muted-foreground text-lg">Don't just take our word for it.</p>
          </motion.div>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                variants={item}
                whileHover={{ y: -4, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
                className="glass-card p-7 flex flex-col group"
              >
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <blockquote className="text-foreground font-medium leading-relaxed flex-1 mb-6">
                  "{t.quote}"
                </blockquote>
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                  <span className="text-primary font-bold text-sm">{t.revenue}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Tier Preview */}
      <section id="tiers" className="py-20 md:py-28">
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
                whileHover={{ y: -4, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
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
      <section id="pricing" className="py-20 md:py-28">
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
                whileHover={{ y: -4, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
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
      <section id="leaderboard" className="py-20 md:py-28 relative overflow-hidden">
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
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                  i === 0 ? "glass-card glow-border bg-primary/[0.03]" : "glass-card hover:shadow-md"
                }`}
              >
                <div className={`flex-shrink-0 w-8 text-center font-bold text-lg ${
                  i === 0 ? "text-primary" : i < 3 ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {creator.icon ? <creator.icon className={`w-5 h-5 mx-auto ${i === 0 ? "text-primary" : "text-muted-foreground"}`} /> : `#${creator.rank}`}
                </div>
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {creator.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{creator.name}</p>
                  <p className="text-xs text-muted-foreground">{creator.niche}</p>
                </div>
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
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 hero-glow-layer" />
        <div className="absolute inset-0 hero-grid-layer opacity-50" />
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-5xl font-extrabold mb-5 leading-tight">
              Ready to build something{" "}
              <span className="text-gradient">extraordinary?</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
              Join 10,000+ creators who chose the platform that actually invests in their growth.
            </p>
            <Button variant="hero" size="xl" onClick={() => navigate("/onboarding")}>
              Start Free Today <ArrowRight className="ml-1" />
            </Button>
            <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-primary" /> No credit card required
              <span className="mx-1.5 text-border">·</span>
              <Check className="w-3.5 h-3.5 text-primary" /> Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <img src="/logo.png" alt="Uply" className="h-[88px]" />
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
