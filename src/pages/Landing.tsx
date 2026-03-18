import { motion, useMotionValue, useSpring, useInView } from "framer-motion";
import { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Uply",
  url: "https://uply.tv",
  description: "Don't be late again. The creator platform for those who move first.",
  applicationCategory: "SocialNetworkingApplication",
  operatingSystem: "Web",
  creator: { "@type": "Organization", name: "Uply" },
};

const rewards = [
  { emoji: "🏆", title: "Cash Prize", desc: "Top early creators earn real money at launch." },
  { emoji: "🎙️", title: "Founding Creator Badge", desc: "Permanent recognition. First-mover perks." },
  { emoji: "🚀", title: "Platform Equity Access", desc: "Shape the platform before the public gets in." },
];

function formatCurrency(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(n)}`;
}

function formatFollowers(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 100000 ? 0 : n >= 10000 ? 0 : 1)}K`;
  return `${n}`;
}

function AnimatedNumber({ value, prefix = "$", className }: { value: number; prefix?: string; className?: string }) {
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const start = display;
    const diff = value - start;
    const duration = 400;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, isInView]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display.toLocaleString()}
    </span>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [applicantCount, setApplicantCount] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const [followers, setFollowers] = useState(10000);

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
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: `${Math.random() * 100}%`,
        y: `${Math.random() * 100}%`,
        size: Math.random() * 3 + 1.5,
        duration: Math.random() * 10 + 8,
        delay: Math.random() * 5,
        drift: Math.random() * 50 - 25,
      })),
    []
  );

  useEffect(() => {
    const fetchCount = async () => {
      const { data } = await supabase
        .from("launch_config")
        .select("total_applicants")
        .limit(1)
        .single();
      if (data) setApplicantCount(data.total_applicants);
    };
    fetchCount();
  }, []);

  const handleApply = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    navigate(`/auth?email=${encodeURIComponent(email)}`);
  };

  const scrollToWaitlist = () => {
    document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
  };

  // Earnings calculator
  const ytEarnings = Math.round(followers * 0.003);
  const uplyEarnings = Math.round(followers * 0.02 * 9);
  const multiplier = ytEarnings > 0 ? Math.round(uplyEarnings / ytEarnings) : 0;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#00FF85]/30">
      <SEOHead />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between">
          <img
            src="/logo.png"
            alt="Uply"
            className="h-[60px] md:h-[70px] w-auto object-contain"
            width="1024"
            height="1024"
          />
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white hover:bg-white/5"
              onClick={() => navigate("/auth")}
            >
              Log in
            </Button>
            <Button
              size="sm"
              className="bg-[#00FF85] text-[#0A0A0A] font-bold hover:bg-[#00FF85]/90 border-0 active:scale-[0.96] transition-transform"
              onClick={() => navigate("/auth")}
            >
              Start Free
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section
        ref={heroRef}
        className="relative overflow-hidden pt-28 pb-16 md:pt-40 md:pb-24 min-h-[85vh] flex items-center"
        onMouseMove={handleMouseMove}
      >
        {/* Animated gradient blobs */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute w-[700px] h-[700px] rounded-full blur-[160px] opacity-[0.12]"
            style={{
              background: "radial-gradient(circle, #00FF85 0%, transparent 70%)",
              top: "-20%",
              left: "20%",
            }}
            animate={{ x: [0, 60, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full blur-[140px] opacity-[0.08]"
            style={{
              background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)",
              bottom: "-10%",
              right: "10%",
            }}
            animate={{ x: [0, -40, 0], y: [0, -30, 0], scale: [1.05, 0.95, 1.05] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Mouse-following glow */}
        <motion.div
          className="absolute z-[1] pointer-events-none w-[350px] h-[350px] rounded-full opacity-[0.06] blur-[100px] hidden md:block"
          style={{
            background: "#00FF85",
            left: springX,
            top: springY,
            translateX: "-50%",
            translateY: "-50%",
          }}
        />

        {/* Floating particles */}
        <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden hidden md:block">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full bg-[#00FF85]/20"
              style={{ left: p.x, top: p.y, width: p.size, height: p.size }}
              animate={{
                y: [0, -50, 0],
                x: [0, p.drift, 0],
                opacity: [0, 0.6, 0],
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

        {/* Grain texture */}
        <div
          className="absolute inset-0 z-[2] pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-2xl mx-auto text-center"
          >
            <motion.img
              src="/logo.png"
              alt="Uply"
              className="h-20 md:h-28 w-auto object-contain mx-auto mb-10"
              width="1024"
              height="1024"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.6 }}
            />

            <h1 className="text-[2.5rem] md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6 font-heading">
              Don't be late again.
            </h1>

            <p className="text-base md:text-lg text-white/40 mb-10 max-w-lg mx-auto leading-relaxed italic">
              You were late to YouTube. Late to Instagram. Late to TikTok.
              <br className="hidden md:block" />
              Uply is your last chance to be early.
            </p>

            {/* Stat pills */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 mb-10">
              {[
                { emoji: "🚫", label: "No Censorship" },
                { emoji: "🤝", label: "Co-Collaborate" },
                { emoji: "💸", label: "Go Live & Monetize" },
              ].map((pill) => (
                <span
                  key={pill.label}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.03] text-sm text-white/60"
                >
                  <span>{pill.emoji}</span>
                  {pill.label}
                </span>
              ))}
            </div>

            {/* Primary CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <Button
                size="lg"
                className="bg-[#00FF85] text-[#0A0A0A] font-bold text-base px-8 py-6 rounded hover:bg-[#00FF85]/90 hover:shadow-[0_0_30px_rgba(0,255,133,0.3)] transition-all duration-300 border-0 active:scale-[0.96]"
                onClick={scrollToWaitlist}
              >
                Apply for Early Access
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-xs text-white/30 mt-4 italic"
            >
              Waitlist &amp; invite only.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ─── EXCLUSIVITY BANNER ─── */}
      <section className="py-12 md:py-16 relative">
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7 }}
            className="max-w-2xl mx-auto rounded-xl border border-[#00FF85]/10 bg-white/[0.02] p-8 md:p-10 text-center"
            style={{
              boxShadow: "0 0 60px rgba(0,255,133,0.04), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}
          >
            <p className="text-white/50 text-sm md:text-base mb-3">
              Uply has hand selected its founding creators.
            </p>
            <p className="text-[#00FF85] font-bold text-xl md:text-2xl mb-3 font-heading">
              The Uply Games begin.
            </p>
            <p className="text-white/30 text-xs md:text-sm leading-relaxed">
              This is not a public launch.
              <br />
              You were either invited or you found us.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── EARNINGS CALCULATOR ─── */}
      <section className="py-16 md:py-24 relative">
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl md:text-4xl font-bold mb-3 font-heading">
              See what you'd actually make.
            </h2>
            <p className="text-white/40 text-sm md:text-base">
              AdSense pays pennies. Memberships pay rent.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="max-w-xl mx-auto rounded-xl border border-[#00FF85]/10 bg-white/[0.02] p-6 md:p-8"
            style={{
              boxShadow: "0 0 60px rgba(0,255,133,0.04), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}
          >
            {/* Slider */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-white/50">How many followers do you have?</span>
                <span className="text-sm font-bold text-[#00FF85]">{formatFollowers(followers)}</span>
              </div>
              <Slider
                min={1000}
                max={500000}
                step={1000}
                value={[followers]}
                onValueChange={(v) => setFollowers(v[0])}
                className="[&_[data-orientation=horizontal]>.relative]:bg-white/10 [&_[role=slider]]:bg-[#00FF85] [&_[role=slider]]:border-[#00FF85] [&_span[data-orientation=horizontal]>span]:bg-[#00FF85]"
              />
              <div className="flex justify-between mt-2 text-[10px] text-white/20">
                <span>1K</span>
                <span>10K</span>
                <span>50K</span>
                <span>100K</span>
                <span>500K</span>
              </div>
            </div>

            {/* Comparison columns */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* YouTube */}
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 text-center">
                <span className="text-xs text-white/30 block mb-1">YouTube AdSense</span>
                <AnimatedNumber
                  value={ytEarnings}
                  className="text-2xl md:text-3xl font-bold text-red-400/70"
                />
                <span className="text-[10px] text-white/20 block mt-1">/month est.</span>
              </div>

              {/* UPLY */}
              <div className="rounded-lg bg-[#00FF85]/[0.05] border border-[#00FF85]/20 p-4 text-center">
                <span className="text-xs text-[#00FF85]/60 block mb-1">Uply Memberships</span>
                <AnimatedNumber
                  value={uplyEarnings}
                  className="text-2xl md:text-3xl font-bold text-[#00FF85]"
                />
                <span className="text-[10px] text-[#00FF85]/40 block mt-1">/month est.</span>
              </div>
            </div>

            {/* Multiplier */}
            {multiplier > 0 && (
              <p className="text-center text-lg md:text-xl font-bold mb-4">
                That's{" "}
                <span className="text-[#00FF85]">{multiplier}x more</span>
                {" "}with Uply
              </p>
            )}

            <p className="text-[10px] text-white/15 text-center mb-5">
              Estimates based on industry averages. Results vary by niche and engagement.
            </p>

            <div className="flex justify-center">
              <Button
                className="bg-[#00FF85] text-[#0A0A0A] font-bold hover:bg-[#00FF85]/90 border-0 active:scale-[0.96] transition-transform"
                onClick={scrollToWaitlist}
              >
                Start earning like this
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── WAITLIST ─── */}
      <section id="waitlist" className="py-20 md:py-28 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#00FF85]/[0.04] rounded-full blur-[120px] pointer-events-none" />
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="max-w-md mx-auto text-center"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-3 font-heading">
              Claim your spot.
            </h2>
            <p className="text-white/40 text-sm mb-8">
              Enter your email. We'll let you know when it's your turn.
            </p>

            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/25 focus-visible:ring-[#00FF85]/40 h-12"
                onKeyDown={(e) => e.key === "Enter" && handleApply()}
              />
              <Button
                className="bg-[#00FF85] text-[#0A0A0A] font-bold hover:bg-[#00FF85]/90 border-0 px-6 h-12 shrink-0 active:scale-[0.96] transition-transform"
                onClick={handleApply}
                disabled={submitting}
              >
                {submitting ? "..." : "Apply Now"}
              </Button>
            </div>

            {applicantCount !== null && applicantCount > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-2 mt-5"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF85] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF85]" />
                </span>
                <span className="text-sm text-white/50">
                  Join{" "}
                  <span className="text-white/80 font-semibold">
                    {applicantCount.toLocaleString()}
                  </span>{" "}
                  creators already on the waitlist
                </span>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ─── PRIZES ─── */}
      <section className="py-20 md:py-28 relative">
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-heading">
              Be Early. Win Big.
            </h2>
            <p className="text-white/40 text-base max-w-lg mx-auto leading-relaxed">
              Apply now for a chance to win cash, prizes, and a founding creator
              spot. The first wave sets the culture.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {rewards.map((r, i) => (
              <motion.div
                key={r.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.6 }}
                whileHover={{ y: -4, transition: { duration: 0.25 } }}
                className="relative rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-6 text-center group hover:border-[#00FF85]/20 transition-colors"
              >
                <span className="text-3xl mb-4 block">{r.emoji}</span>
                <h3 className="font-bold text-white mb-2">{r.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{r.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="container flex flex-col items-center gap-5">
          <img
            src="/logo.png"
            alt="Uply"
            className="h-10 w-auto object-contain opacity-60"
            width="1024"
            height="1024"
            loading="lazy"
          />
          <div className="flex items-center gap-5">
            {[
              { label: "Instagram", href: "#" },
              { label: "X", href: "#" },
              { label: "TikTok", href: "#" },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
          <p className="text-xs text-white/20">© 2025 Uply</p>
        </div>
      </footer>
    </div>
  );
}
