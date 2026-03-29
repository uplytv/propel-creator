import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import dashboardPreview from "@/assets/dashboard-preview.png";
import StickyMobileCTA from "@/components/landing/StickyMobileCTA";
import ExitIntentModal from "@/components/landing/ExitIntentModal";
import LiveSignupTicker from "@/components/waitlist/LiveSignupTicker";
import FeatureGrid from "@/components/landing/FeatureGrid";
import HowItWorks from "@/components/landing/HowItWorks";
import EarningsCalculator from "@/components/landing/EarningsCalculator";
import ComparisonTable from "@/components/landing/ComparisonTable";
import MissionProgress from "@/components/landing/MissionProgress";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "UPLY",
  url: "https://uply.tv",
  description: "Don't be late again. The creator platform for those who move first.",
  applicationCategory: "SocialNetworkingApplication",
  operatingSystem: "Web",
  creator: { "@type": "Organization", name: "UPLY" },
};

const rewards = [
  { emoji: "🏆", title: "Cash Prize", desc: "Top early creators earn real money at launch." },
  { emoji: "🎙️", title: "Founding Creator Badge", desc: "Permanent recognition. First-mover perks." },
  { emoji: "🚀", title: "Platform Equity Access", desc: "Shape the platform before the public gets in." },
];

const CTA_LABEL = "Apply for Early Access";

export default function Landing() {
  const navigate = useNavigate();
  const [applicantCount, setApplicantCount] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 30 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY]
  );

  const particles = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({
      id: i, x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1.5, duration: Math.random() * 10 + 8,
      delay: Math.random() * 5, drift: Math.random() * 50 - 25,
    })),
    []
  );

  useEffect(() => {
    supabase.from("launch_config").select("total_applicants").limit(1).single()
      .then(({ data }) => { if (data) setApplicantCount(data.total_applicants); });
  }, []);

  const handleApply = async () => {
    if (!email || !email.includes("@")) { toast.error("Enter a valid email address."); return; }
    setSubmitting(true);
    navigate(`/auth?email=${encodeURIComponent(email)}`);
  };

  const scrollToWaitlist = () => {
    document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <SEOHead />
      <StickyMobileCTA />
      <ExitIntentModal />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-foreground/[0.06] bg-background/80 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between">
          <img src="/logo.png" alt="UPLY" className="h-[60px] md:h-[70px] w-auto object-contain" width="1024" height="1024" />
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-foreground/60 hover:text-foreground hover:bg-foreground/5" onClick={() => navigate("/auth")}>Log in</Button>
            <Button size="sm" className="bg-primary text-foreground font-bold hover:bg-primary/90 border-0 active:scale-[0.96] transition-transform" onClick={scrollToWaitlist}>{CTA_LABEL}</Button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section ref={heroRef} className="relative overflow-hidden pt-28 pb-8 md:pt-40 md:pb-12 min-h-[70vh] flex items-center" onMouseMove={handleMouseMove}>
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <motion.div className="absolute w-[700px] h-[700px] rounded-full blur-[160px] opacity-[0.12]" style={{ background: "radial-gradient(circle, #00FF85 0%, transparent 70%)", top: "-20%", left: "20%" }} animate={{ x: [0, 60, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="absolute w-[500px] h-[500px] rounded-full blur-[140px] opacity-[0.08]" style={{ background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)", bottom: "-10%", right: "10%" }} animate={{ x: [0, -40, 0], y: [0, -30, 0], scale: [1.05, 0.95, 1.05] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />
        </div>
        <motion.div className="absolute z-[1] pointer-events-none w-[350px] h-[350px] rounded-full opacity-[0.06] blur-[100px] hidden md:block" style={{ background: "hsl(var(--primary))", left: springX, top: springY, translateX: "-50%", translateY: "-50%" }} />
        <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden hidden md:block">
          {particles.map((p) => (
            <motion.div key={p.id} className="absolute rounded-full bg-primary/20" style={{ left: p.x, top: p.y, width: p.size, height: p.size }}
              animate={{ y: [0, -50, 0], x: [0, p.drift, 0], opacity: [0, 0.6, 0], scale: [0.5, 1, 0.5] }}
              transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }} />
          ))}
        </div>
        <div className="absolute inset-0 z-[2] pointer-events-none opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")` }} />

        <div className="container relative z-10">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="max-w-2xl mx-auto text-center">
            <motion.img src="/logo.png" alt="UPLY" className="h-20 md:h-28 w-auto object-contain mx-auto mb-10" width="1024" height="1024" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.6 }} />
            <h1 className="text-[2.5rem] md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-2 font-heading">Don't be late again.</h1>
            <p className="text-lg md:text-2xl font-semibold text-primary mb-6 font-heading tracking-tight">Run your entire creator business with AI.</p>
            <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-lg mx-auto leading-relaxed italic">5 AI employees — Content, Growth, Community, Sales &amp; Operations — working 24/7 so you can focus on creating.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 mb-10">
              {[{ emoji: "🚫", label: "No Censorship" }, { emoji: "🤝", label: "Co-Collaborate" }, { emoji: "💸", label: "Go Live & Monetize" }].map((pill) => (
                <span key={pill.label} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.03] text-sm text-white/60">
                  <span>{pill.emoji}</span>{pill.label}
                </span>
              ))}
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}>
              <Button size="lg" className="bg-primary text-foreground font-bold text-base px-8 py-6 rounded hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(0,255,133,0.3)] transition-all duration-300 border-0 active:scale-[0.96]" onClick={scrollToWaitlist}>
                {CTA_LABEL}<ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-xs text-muted-foreground/60 mt-4 italic">Waitlist &amp; invite only.</motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-6"><LiveSignupTicker /></motion.div>
          </motion.div>
        </div>
      </section>

      <MissionProgress />

      {/* ─── PRODUCT PREVIEW ─── */}
      <section className="pb-16 md:pb-24 relative">
        <div className="container relative z-10">
          <motion.div initial={{ opacity: 0, y: 60, scale: 0.95 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.9, ease: "easeOut" }} className="max-w-4xl mx-auto">
            <div className="relative rounded-xl overflow-hidden border border-white/[0.08] shadow-[0_20px_80px_-20px_rgba(0,255,133,0.15)]">
              <div className="flex items-center gap-2 px-4 py-3 bg-[#1A1A1A] border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                  <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-white/[0.06] rounded-md px-4 py-1 text-xs text-white/30 max-w-[200px] md:max-w-none">uply.tv/dashboard</div>
                </div>
              </div>
              <img src={dashboardPreview} alt="UPLY creator dashboard showing revenue analytics, live streaming, community feed, and courses" className="w-full h-auto block" loading="lazy" decoding="async" />
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── EXCLUSIVITY BANNER ─── */}
      <section className="py-12 md:py-16 relative">
        <div className="container relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7 }}
            className="max-w-2xl mx-auto rounded-xl border border-primary/10 bg-white/[0.02] p-8 md:p-10 text-center"
            style={{ boxShadow: "0 0 60px rgba(0,255,133,0.04), inset 0 1px 0 rgba(255,255,255,0.03)" }}>
            <p className="text-foreground/50 text-sm md:text-base mb-3">UPLY has hand selected its founding creators.</p>
            <p className="text-primary font-bold text-xl md:text-2xl mb-3 font-heading">The Uply Games begin.</p>
            <p className="text-foreground/30 text-xs md:text-sm leading-relaxed">This is not a public launch.<br />You were either invited or you found us.</p>
          </motion.div>
        </div>
      </section>
      <FeatureGrid />
      <HowItWorks />
      <EarningsCalculator onCTAClick={scrollToWaitlist} />
      <ComparisonTable />

      {/* ─── WAITLIST ─── */}
      <section id="waitlist" className="py-20 md:py-28 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/[0.04] rounded-full blur-[120px] pointer-events-none" />
        <div className="container relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="max-w-md mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 font-heading">Claim your spot.</h2>
            <p className="text-muted-foreground text-sm mb-8">Enter your email. We'll let you know when it's your turn.</p>
            <div className="flex gap-2">
              <Input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/25 focus-visible:ring-primary/40 h-12"
                onKeyDown={(e) => e.key === "Enter" && handleApply()} />
              <Button className="bg-primary text-foreground font-bold hover:bg-primary/90 border-0 px-6 h-12 shrink-0 active:scale-[0.96] transition-transform" onClick={handleApply} disabled={submitting}>
                {submitting ? "..." : CTA_LABEL}
              </Button>
            </div>
            {applicantCount !== null && applicantCount > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-center justify-center gap-2 mt-5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-sm text-white/50">Join <span className="text-white/80 font-semibold">{applicantCount.toLocaleString()}</span> creators already on the waitlist</span>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ─── PRIZES ─── */}
      <section className="py-20 md:py-28 relative">
        <div className="container relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-heading">Be Early. Win Big.</h2>
            <p className="text-muted-foreground text-base max-w-lg mx-auto leading-relaxed">Apply now for a chance to win cash, prizes, and a founding creator spot. The first wave sets the culture.</p>
          </motion.div>
          <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {rewards.map((r, i) => (
              <motion.div key={r.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.6 }}
                whileHover={{ y: -4, transition: { duration: 0.25 } }}
                className="relative rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-6 text-center group hover:border-primary/20 transition-colors">
                <span className="text-3xl mb-4 block">{r.emoji}</span>
                <h3 className="font-bold text-foreground mb-2">{r.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border py-10">
        <div className="container flex flex-col items-center gap-5">
          <img src="/logo.png" alt="UPLY" className="h-10 w-auto object-contain opacity-60" width="1024" height="1024" loading="lazy" decoding="async" />
          <div className="flex items-center gap-5">
          {[{ label: "Instagram", href: "https://instagram.com/uply.tv" }, { label: "X", href: "https://x.com/uplyTV" }, { label: "TikTok", href: "https://tiktok.com/@uply.tv" }].map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">{s.label}</a>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/50">© 2026 UPLY</p>
        </div>
      </footer>
    </div>
  );
}
