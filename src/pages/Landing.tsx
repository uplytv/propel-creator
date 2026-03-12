import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { useRef, useMemo, useCallback, useEffect } from "react";
import { Check, ArrowRight, Star, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";

const testimonials = [
  { name: "Sarah Chen", role: "Fitness Creator", avatar: "SC", quote: "I went from 0 to 2,000 members in 6 months. The AI growth partner is like having a CMO on speed dial.", revenue: "$48K/mo" },
  { name: "Marcus Rivera", role: "Photography Coach", avatar: "MR", quote: "The tier system actually motivated me to level up. Once I hit Scaling, my rep helped me 3x my revenue.", revenue: "$36K/mo" },
  { name: "Aisha Patel", role: "Business Strategist", avatar: "AP", quote: "Every other platform felt like a tool. This one feels like a partner that actually cares about my growth.", revenue: "$31K/mo" },
];

const pricing = [
  { name: "Free", price: "0", period: "forever", fee: "5% transaction fee", features: ["AI Growth Partner", "Community tools", "Up to 100 members", "Basic analytics"] },
  { name: "Pro", price: "49", period: "/month", fee: "2% transaction fee", features: ["Everything in Free", "Unlimited members", "Advanced analytics", "Priority support"], popular: true },
  { name: "Scale", price: "99", period: "/month", fee: "0% transaction fee", features: ["Everything in Pro", "Dedicated success rep", "Custom integrations", "White-label options"] },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const item = { hidden: { opacity: 0, y: 30, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: "easeOut" as const } } };
const sectionHeading = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Uply",
  "url": "https://propel-creator.lovable.app",
  "description": "Social network for creators to monetize. The only creator platform that invests more in you as you grow.",
  "applicationCategory": "SocialNetworkingApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "AggregateOffer",
    "lowPrice": "0",
    "highPrice": "99",
    "priceCurrency": "USD",
    "offerCount": "3"
  },
  "creator": {
    "@type": "Organization",
    "name": "Uply"
  }
};

export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const glowY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const glowScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const gridY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
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
    Array.from({ length: 8 }, (_, i) => ({
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
            <a href="#social-proof" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Creators</a>
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
        {/* Animated gradient mesh — reduced for mobile */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 dark:opacity-30 hidden md:block"
            style={{ background: "radial-gradient(circle, hsl(var(--gradient-mid)) 0%, transparent 70%)", top: "-10%", left: "-5%" }}
            animate={{ x: [0, 80, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-15 dark:opacity-25 hidden md:block"
            style={{ background: "radial-gradient(circle, hsl(var(--gradient-mid)) 0%, transparent 70%)", top: "20%", right: "-10%" }}
            animate={{ x: [0, -60, 0], y: [0, -50, 0], scale: [1.1, 0.95, 1.1] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        {/* Mouse-following glow — desktop only */}
        <motion.div
          className="absolute z-[1] pointer-events-none w-[400px] h-[400px] rounded-full opacity-30 dark:opacity-40 blur-[100px] bg-primary/30 hidden md:block"
          style={{ left: springX, top: springY, translateX: "-50%", translateY: "-50%" }}
        />
        <motion.div className="absolute inset-0 z-0 hero-glow-layer" style={{ y: glowY, scale: glowScale }} />
        <motion.div className="absolute inset-0 z-0 hero-grid-layer" style={{ y: gridY, opacity: gridOpacity }} />
        {/* Floating particles — reduced count */}
        <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden hidden md:block">
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
              Built for creators who want to own their audience
            </motion.div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6">
              A Social Network for Creators to{" "}
              <span className="text-gradient">Monetize.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
              Communities. Livestreams. Courses. Services. Everything creators need to grow and monetize — in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl" onClick={() => navigate("/onboarding")}>
                Start Free <ArrowRight className="ml-1" />
              </Button>
              <Button variant="hero-outline" size="xl" onClick={() => navigate("/discover")}>
                Explore Creators
              </Button>
            </div>

            {/* Micro-copy */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-xs text-muted-foreground mt-5 text-center"
            >
              No tech skills required · Launch in minutes
            </motion.p>

            {/* Dashboard mockup card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.7 }}
              className="mt-10 max-w-lg mx-auto"
            >
              <div className="rounded-xl border border-border/60 overflow-hidden shadow-2xl bg-card">
                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40">
                  <span className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="w-3 h-3 rounded-full bg-warning" />
                  <span className="w-3 h-3 rounded-full bg-success" />
                  <span className="ml-3 text-xs font-medium text-muted-foreground">UPLY Dashboard</span>
                </div>
                {/* Tab bar */}
                <div className="flex items-center gap-0 px-3 pt-2 border-b border-border/40 overflow-x-auto">
                  {['Community', 'Livestream', 'Courses', 'Marketplace', 'Analytics'].map((tab) => (
                    <span
                      key={tab}
                      className={`text-xs font-semibold px-3 py-2 whitespace-nowrap transition-colors border-b-2 ${
                        tab === 'Livestream'
                          ? 'text-primary border-primary'
                          : 'text-muted-foreground border-transparent'
                      }`}
                    >
                      {tab}
                    </span>
                  ))}
                </div>
                {/* Content area */}
                <div className="p-5 bg-background">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded bg-destructive text-destructive-foreground">
                        ● LIVE
                      </span>
                      <span className="text-sm font-medium text-foreground">My Studio Stream</span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">👁 1,247 viewers</span>
                  </div>
                  <div className="rounded-lg h-20 bg-secondary" />
                </div>
              </div>
              {/* Caption */}
              <p className="text-center mt-4 text-[13px] text-muted-foreground">
                "Replace 6 platforms with one."
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof — Testimonials */}
      <section id="social-proof" className="py-20 md:py-28 relative overflow-hidden">
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
            {testimonials.map((t) => (
              <motion.div
                key={t.name}
                variants={item}
                whileHover={{ y: -4, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
                className="glass-card p-7 flex flex-col group"
              >
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
              Join creators who chose the platform that actually invests in their growth.
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
              <a href="#social-proof" className="hover:text-foreground transition-colors">Creators</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <button onClick={() => navigate("/discover")} className="hover:text-foreground transition-colors">Discover</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
