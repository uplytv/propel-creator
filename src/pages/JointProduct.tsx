import { useState, useEffect, useRef, useMemo } from "react";
import { motion, useInView, useSpring, useMotionValue } from "framer-motion";
import { SITE_URL } from "@/lib/siteUrl";
import {
  ArrowLeft, Users, DollarSign, TrendingUp, Star, Check,
  Play, BookOpen, MessageSquare, Zap, Shield, Clock,
  Percent, BarChart3, Eye, Share2, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

// ── Animated Counter ───────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 50, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (isInView) motionVal.set(value);
  }, [isInView, value, motionVal]);

  useEffect(() => {
    return spring.on("change", (v) => setDisplay(Math.round(v)));
  }, [spring]);

  return <span ref={ref}>{prefix}{display.toLocaleString()}{suffix}</span>;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────
const product = {
  title: "Creator Revenue Blueprint",
  subtitle: "The complete system for building a 6-figure creator business — from two creators who've done it.",
  price: 297,
  originalPrice: 497,
  enrolledCount: 47,
  maxCapacity: 100,
  rating: 4.9,
  reviewCount: 38,
  creators: [
    { name: "You", avatar: "C", role: "Business Strategy & Growth", niche: "Business", bio: "Scaling creator businesses from zero to six figures with proven frameworks.", members: "2.1K", revenue: "$18K/mo" },
    { name: "Aisha Patel", avatar: "AP", role: "Revenue Systems & Automation", niche: "Business Strategy", bio: "Helping entrepreneurs build automated revenue engines that scale.", members: "6.2K", revenue: "$31K/mo" },
  ],
  split: [50, 50] as [number, number],
  totalRevenue: 8420,
  revenueData: [
    { day: "Mon", amount: 891 },
    { day: "Tue", amount: 1240 },
    { day: "Wed", amount: 980 },
    { day: "Thu", amount: 1560 },
    { day: "Fri", amount: 1380 },
    { day: "Sat", amount: 1190 },
    { day: "Sun", amount: 1179 },
  ],
  modules: [
    { title: "Foundation: Positioning & Offer Design", lessons: 6, duration: "2h 15m", creator: 0 },
    { title: "Audience Building & Lead Magnets", lessons: 8, duration: "3h 40m", creator: 1 },
    { title: "Sales Systems That Convert", lessons: 7, duration: "2h 50m", creator: 0 },
    { title: "Revenue Automation & Scaling", lessons: 9, duration: "4h 10m", creator: 1 },
    { title: "Community Building & Retention", lessons: 5, duration: "1h 55m", creator: 0 },
    { title: "Advanced Growth: Multi-Product Strategy", lessons: 6, duration: "2h 30m", creator: 1 },
  ],
  testimonials: [
    { name: "Jordan K.", text: "Having two expert perspectives in one program was a game-changer. Went from $2K to $12K/mo in 8 weeks.", rating: 5 },
    { name: "Sophia M.", text: "The automation modules alone were worth 10x the price. Both creators bring incredible value.", rating: 5 },
    { name: "Alex R.", text: "Best investment I've made in my creator career. The combined expertise is unmatched.", rating: 5 },
  ],
  features: [
    "41 in-depth video lessons",
    "Downloadable frameworks & templates",
    "Private community access",
    "Live monthly Q&A with both creators",
    "Revenue tracker dashboard",
    "30-day money-back guarantee",
  ],
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

// ── Mini Bar Chart ─────────────────────────────────────────────────────────────
function MiniBarChart({ data }: { data: { day: string; amount: number }[] }) {
  const max = Math.max(...data.map(d => d.amount));
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((d, i) => (
        <motion.div
          key={d.day}
          initial={{ height: 0 }}
          animate={{ height: `${(d.amount / max) * 100}%` }}
          transition={{ delay: 0.3 + i * 0.05, duration: 0.5, ease: "easeOut" }}
          className="flex-1 bg-primary/80 rounded-t-sm relative group cursor-pointer"
        >
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-card border border-border text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            ${d.amount}
          </div>
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">{d.day}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Page Component ─────────────────────────────────────────────────────────────
export default function JointProduct({ isPublic = false }: { isPublic?: boolean }) {
  const navigate = useNavigate();
  const spotsLeft = product.maxCapacity - product.enrolledCount;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/p/creator-revenue-blueprint`;
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Admin Bar (creator only) */}
      {!isPublic && (
        <div className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border">
          <div className="container flex items-center justify-between h-12 gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/collaborate")} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-muted-foreground">Joint Product Preview</span>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-[10px]">Live</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleCopyLink}><Share2 className="w-3.5 h-3.5" /> Copy Public Link</Button>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/p/creator-revenue-blueprint")}><Eye className="w-3.5 h-3.5" /> Public View</Button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-glow-layer" />
        <div className="absolute inset-0 hero-grid-layer opacity-50" />
        <div className="container relative py-16 md:py-24">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl mx-auto text-center">
            {/* Co-branded Avatars */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="flex items-center -space-x-3">
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold ring-4 ring-background z-10">
                  {product.creators[0].avatar}
                </motion.div>
                <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="w-14 h-14 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-lg font-bold ring-4 ring-background">
                  {product.creators[1].avatar}
                </motion.div>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{product.creators[0].name} × {product.creators[1].name}</p>
                <p className="text-xs text-muted-foreground">Joint Collaboration</p>
              </div>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{product.title}</h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">{product.subtitle}</p>

            {/* Social Proof Row */}
            <div className="flex items-center justify-center gap-6 flex-wrap mb-8">
              <div className="flex items-center gap-1.5">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <span className="text-sm font-medium">{product.rating}</span>
                <span className="text-xs text-muted-foreground">({product.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{product.enrolledCount} enrolled</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                <span>41 lessons</span>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold">${product.price}</span>
                <span className="text-lg text-muted-foreground line-through">${product.originalPrice}</span>
                <Badge className="bg-destructive/10 text-destructive border-0 text-xs ml-1">40% OFF</Badge>
              </div>
              <Button variant="hero" size="lg" className="text-base px-10 gap-2">
                <Zap className="w-4 h-4" /> Enroll Now
              </Button>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> 30-day money-back guarantee
                <span className="mx-1">·</span>
                <Clock className="w-3 h-3" /> Only {spotsLeft} spots left
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container py-12 md:py-16 space-y-16">
        {/* Meet Your Creators */}
        <motion.section variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>
          <motion.h2 variants={item} className="text-2xl font-bold text-center mb-8">Meet Your Creators</motion.h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {product.creators.map((creator, i) => (
              <motion.div key={creator.name} variants={item} className="glass-card p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {creator.avatar}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{creator.name}</h3>
                    <p className="text-xs text-muted-foreground">{creator.role}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{creator.bio}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {creator.members}</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {creator.revenue}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* What's Inside */}
        <motion.section variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>
          <motion.h2 variants={item} className="text-2xl font-bold text-center mb-2">What's Inside</motion.h2>
          <motion.p variants={item} className="text-muted-foreground text-center mb-8">41 lessons across 6 modules, crafted by both creators</motion.p>
          <div className="max-w-2xl mx-auto space-y-3">
            {product.modules.map((mod, i) => (
              <motion.div key={mod.title} variants={item} className="glass-card p-4 flex items-center gap-4 group hover:border-primary/20 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{mod.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1"><Play className="w-3 h-3" /> {mod.lessons} lessons</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {mod.duration}</span>
                  </div>
                </div>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${mod.creator === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {product.creators[mod.creator].avatar}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* What You Get */}
        <motion.section variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="max-w-2xl mx-auto">
          <motion.h2 variants={item} className="text-2xl font-bold text-center mb-8">Everything You Get</motion.h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {product.features.map((f) => (
              <motion.div key={f} variants={item} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm">{f}</span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Testimonials */}
        <motion.section variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>
          <motion.h2 variants={item} className="text-2xl font-bold text-center mb-8">What Students Say</motion.h2>
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {product.testimonials.map((t) => (
              <motion.div key={t.name} variants={item} className="glass-card p-5">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-3">"{t.text}"</p>
                <p className="text-xs font-semibold">{t.name}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Revenue Dashboard (Creator-only view) ─────────────────────────── */}
        {!isPublic && (
          <motion.section variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="glass-card glow-border p-6 md:p-8 max-w-3xl mx-auto">
            <motion.div variants={item} className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Live Revenue Dashboard</h2>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-[10px] ml-auto">Creator View</Badge>
            </motion.div>
            <motion.p variants={item} className="text-xs text-muted-foreground mb-6">Only visible to you and your co-creator</motion.p>

            {/* Stats Row */}
            <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { label: "Total Revenue", value: product.totalRevenue, prefix: "$", icon: DollarSign },
                { label: "Your Share (50%)", value: Math.round(product.totalRevenue * product.split[0] / 100), prefix: "$", icon: Percent },
                { label: "Partner Share (50%)", value: Math.round(product.totalRevenue * product.split[1] / 100), prefix: "$", icon: Percent },
                { label: "Enrollments", value: product.enrolledCount, prefix: "", icon: Users },
              ].map((stat) => (
                <div key={stat.label} className="bg-secondary/30 rounded-xl p-4 text-center">
                  <stat.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground mb-0.5">{stat.label}</p>
                  <p className="text-xl font-bold">
                    <AnimatedNumber value={stat.value} prefix={stat.prefix} />
                  </p>
                </div>
              ))}
            </motion.div>

            {/* Revenue Chart */}
            <motion.div variants={item}>
              <p className="text-xs font-medium text-muted-foreground mb-3">Revenue this week</p>
              <MiniBarChart data={product.revenueData} />
            </motion.div>

            {/* Split Visualization */}
            <motion.div variants={item} className="mt-8">
              <p className="text-xs font-medium text-muted-foreground mb-3">Revenue Split</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">{product.creators[0].avatar}</div>
                  <span className="text-sm font-medium">{product.split[0]}%</span>
                </div>
                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden flex">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${product.split[0]}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-primary rounded-l-full"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${product.split[1]}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-muted-foreground/30 rounded-r-full"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{product.split[1]}%</span>
                  <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold">{product.creators[1].avatar}</div>
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Your earnings: <span className="text-foreground font-semibold">${(product.totalRevenue * product.split[0] / 100).toLocaleString()}</span></span>
                <span>Partner earnings: <span className="text-foreground font-semibold">${(product.totalRevenue * product.split[1] / 100).toLocaleString()}</span></span>
              </div>
            </motion.div>
          </motion.section>
        )}

        {/* Bottom CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center py-8">
          <h3 className="text-2xl font-bold mb-2">Ready to transform your creator business?</h3>
          <p className="text-muted-foreground mb-6">Join {product.enrolledCount} students already seeing results.</p>
          <div className="flex flex-col items-center gap-2">
            <Button variant="hero" size="lg" className="text-base px-10 gap-2">
              <Zap className="w-4 h-4" /> Enroll for ${product.price}
            </Button>
            <p className="text-xs text-muted-foreground">Only {spotsLeft} spots remaining</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
