import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Check, Share2, Zap, Mic, Crown, Video, DollarSign, Bot,
  Trophy, Ticket, Sparkles, Eye, TrendingUp, Users,
  Twitter, Linkedin, Link2, ArrowRight, Globe, Shield, Rocket
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CREATOR_TYPES = ["Fitness", "Finance", "Gaming", "Lifestyle", "Business", "Education", "Music", "Other"];
const FOLLOWER_RANGES = ["Under 1K", "1K–10K", "10K–100K", "100K–500K", "500K+"];
const PLATFORMS = ["YouTube", "Instagram", "TikTok", "Twitch", "Kick", "Podcast", "Newsletter", "Other"];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
};
const sectionHeading = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const SHARE_URL = "https://uply.tv";
const SHARE_TEXT = "I just applied to be a Founding Creator on UPLY — the platform built for serious creators. Check it out:";

export default function WaitlistPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [applicantCount, setApplicantCount] = useState(0);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [socialHandle, setSocialHandle] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [creatorType, setCreatorType] = useState("");
  const [followerCount, setFollowerCount] = useState("");
  const [primaryPlatform, setPrimaryPlatform] = useState("");
  const [oneSentence, setOneSentence] = useState("");

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

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!oneSentence.trim()) return;
    setSubmitting(true);
    setError("");

    const { error: insertError } = await supabase.from("waitlist").insert({
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      social_handle: socialHandle.trim() || null,
      invite_code: inviteCode.trim() || null,
      creator_type: creatorType,
      follower_count: followerCount,
      primary_platform: primaryPlatform,
      one_sentence: oneSentence.trim(),
    });

    if (insertError) {
      if (insertError.message?.includes("duplicate") || insertError.code === "23505") {
        setError("This email has already applied. We'll be in touch.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
      return;
    }

    setSubmittedEmail(email.trim().toLowerCase());
    setApplicantCount((c) => c + 1);
    setSubmitted(true);
    setSubmitting(false);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(SHARE_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`, "_blank");
  };

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`, "_blank");
  };

  const inputClasses =
    "w-full bg-muted border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors";
  const selectClasses =
    "w-full bg-muted border border-border rounded-md px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors appearance-none";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-x-hidden">
      {/* Grain overlay */}
      <div
        className="fixed inset-0 z-50 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />

      {/* ─── HERO ─── */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 relative">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06] blur-[120px] bg-primary pointer-events-none" />

        {/* Logo */}
        <div className="absolute top-8 left-8 flex items-center gap-2">
          <img src="/logo.png" alt="UPLY" className="h-8 w-8" />
          <span className="font-extrabold text-lg tracking-tight">UPLY</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl relative z-10"
        >
          {/* Pill */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-8"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Founding Creator Application — Class of 2025
          </motion.div>

          {/* Headline */}
          <h1 className="text-[40px] md:text-[72px] font-extrabold leading-[1.05] tracking-tight mb-6">
            The Platform Built For Creators Who Are{" "}
            <span className="text-gradient">Serious.</span>
          </h1>

          <p className="text-muted-foreground text-base md:text-lg max-w-[560px] mx-auto mb-8 leading-relaxed">
            UPLY combines live streaming, community, and monetization in one place. We're hand-selecting our first 500 Founding Creators.
          </p>

          {/* Live counter */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="inline-flex items-center gap-2.5 mb-8 bg-card border border-border/60 rounded-full px-5 py-2.5 shadow-sm"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-sm font-semibold text-foreground">{applicantCount}</span>
            <span className="text-sm text-muted-foreground">creators have applied</span>
          </motion.div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4">
            <Button variant="hero" size="xl" onClick={scrollToForm}>
              Apply for Early Access <ArrowRight className="ml-1" />
            </Button>
            <p className="text-muted-foreground text-xs">
              Founding Creator spots are limited. No credit card required.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ─── WHAT FOUNDING CREATORS GET ─── */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={sectionHeading} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              What You're Getting Access To
            </h2>
          </motion.div>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Zap, title: "0% Platform Fees — Forever", desc: "Legacy beta creators keep 100% of what they earn. No catches. No expiry." },
              { icon: Mic, title: "Priority Onboarding Call", desc: "A real human walks you through setup and your growth strategy." },
              { icon: Crown, title: "Founding Creator Badge", desc: "Permanent badge on your profile. You were here first." },
              { icon: Trophy, title: "Monthly Prize Competitions", desc: "Compete for cash prizes every month. Most viewed, top revenue, top referrer." },
              { icon: Ticket, title: "Your Own Invite Code", desc: "Get a personal invite code to share. Every creator you bring in boosts your rank." },
              { icon: Sparkles, title: "ARIA Early Access", desc: "Be the first to use our AI growth engine. ARIA analyzes your content and suggests your next move." },
            ].map((card) => (
              <motion.div
                key={card.title}
                variants={item}
                whileHover={{ y: -4, transition: { duration: 0.25 } }}
                className="glass-card p-7 group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <card.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-foreground">{card.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── PLATFORM PILLARS ─── */}
      <section className="py-20 md:py-28 px-6 section-alt">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={sectionHeading} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              Everything you need. Nothing you don't.
            </h2>
          </motion.div>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Video, title: "Go Live. Get Discovered.", desc: "Public streams with a built-in discovery feed. Every session is a chance for new fans to find you." },
              { icon: DollarSign, title: "Monetize Everything.", desc: "Subscriptions, digital products, tips, and community access. One dashboard. One payout." },
              { icon: Bot, title: "ARIA — Your AI Growth Partner.", desc: "ARIA analyzes your performance, suggests your next move, and helps you grow faster." },
            ].map((card) => (
              <motion.div
                key={card.title}
                variants={item}
                whileHover={{ y: -4, transition: { duration: 0.25 } }}
                className="glass-card p-7 group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <card.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-foreground">{card.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── COMPETITION ─── */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={sectionHeading} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              Compete. Win. <span className="text-gradient">Get Paid.</span>
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Every month, we award cash prizes to top-performing Founding Creators across three categories.
            </p>
          </motion.div>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="grid md:grid-cols-3 gap-5 mb-12">
            {[
              { icon: Eye, title: "Most Viewed", desc: "Highest total live stream views in a month.", prizes: ["$500", "$250", "$100"] },
              { icon: TrendingUp, title: "Top Revenue", desc: "Most revenue generated through products, tips & subs.", prizes: ["$500", "$250", "$100"] },
              { icon: Users, title: "Top Referrer", desc: "Most successful creator referrals via your invite code.", prizes: ["$500", "$250", "$100"] },
            ].map((cat) => (
              <motion.div key={cat.title} variants={item} whileHover={{ y: -4, transition: { duration: 0.25 } }} className="glass-card p-7">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <cat.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-foreground">{cat.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">{cat.desc}</p>
                <div className="space-y-2">
                  {cat.prizes.map((prize, j) => (
                    <div key={j} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{j === 0 ? "🥇 1st" : j === 1 ? "🥈 2nd" : "🥉 3rd"}</span>
                      <span className="text-primary font-bold">{prize}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-card p-8 max-w-2xl mx-auto"
          >
            <h3 className="font-bold text-lg text-center mb-2 text-foreground">🏆 Pre-Launch Referral Leaderboard</h3>
            <p className="text-muted-foreground text-xs text-center mb-6">
              Top referrers get priority access and bonus perks at launch.
            </p>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((rank) => (
                <div key={rank} className="flex items-center gap-4 py-2 border-b border-border last:border-0">
                  <span className="text-primary font-bold text-sm w-6">#{rank}</span>
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">?</div>
                  <span className="text-muted-foreground text-sm flex-1">Waiting for you…</span>
                  <span className="text-muted-foreground/50 text-xs">0 referrals</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── EARLY CREATOR BENEFITS ─── */}
      <section className="py-20 md:py-28 px-6 section-alt">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={sectionHeading} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              <Crown className="w-3.5 h-3.5" />
              Founding Creator Perks
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              Founding creators receive <span className="text-gradient">special perks.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              These benefits are exclusively reserved for our earliest creators and will never be offered again.
            </p>
          </motion.div>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="grid sm:grid-cols-2 gap-5">
            {[
              { icon: Shield, title: "Lifetime Reduced Platform Fees", desc: "Lock in the lowest fees forever. Your rate never goes up, no matter how much we grow." },
              { icon: Crown, title: "Founder Badge", desc: "A permanent, verified Founding Creator badge on your profile — visible to your entire audience." },
              { icon: Rocket, title: "Early Discovery Boost", desc: "Founding creators get priority placement in the discovery feed during launch and beyond." },
              { icon: Users, title: "Direct Feedback Access", desc: "Private channel to the product team. Your ideas directly shape what we build next." },
            ].map((perk) => (
              <motion.div
                key={perk.title}
                variants={item}
                whileHover={{ y: -4, transition: { duration: 0.25 } }}
                className="glass-card p-6 flex gap-4 items-start group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <perk.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{perk.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{perk.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── VISION SECTION ─── */}
      <section className="py-24 md:py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 hero-glow-layer" />
        <div className="absolute inset-0 hero-grid-layer opacity-50" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
              <Globe className="w-3.5 h-3.5" />
              Our Vision
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
              The future of the <span className="text-gradient">creator economy.</span>
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-4">
              Millions of creators are building businesses online.
            </p>
            <p className="text-foreground text-lg md:text-xl font-semibold leading-relaxed max-w-2xl mx-auto">
              Uply is the platform powering the next generation of creator companies.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── SHARE BUTTONS ─── */}
      <section className="py-16 px-6 section-alt">
        <div className="max-w-md mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-foreground font-semibold text-lg mb-2">Spread the word</p>
            <p className="text-muted-foreground text-sm mb-6">
              Know a creator who should be here? Share with them.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={shareTwitter}
                className="gap-2"
              >
                <Twitter className="w-4 h-4" />
                Twitter
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={shareLinkedIn}
                className="gap-2"
              >
                <Linkedin className="w-4 h-4" />
                LinkedIn
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleCopyLink}
                className="gap-2"
              >
                <Link2 className="w-4 h-4" />
                {copied ? "Copied!" : "Copy Link"}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── APPLICATION FORM ─── */}
      <section className="py-20 md:py-28 px-6" ref={formRef}>
        <div className="max-w-xl mx-auto">
          <motion.div variants={sectionHeading} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-3">
              Apply for Founding Creator Access
            </h2>
            <p className="text-muted-foreground text-sm">
              We review applications every Monday. If you're a fit, you'll hear from us directly.
            </p>
          </motion.div>

          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-extrabold mb-4">Application Received.</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-md mx-auto">
                We review applications every Monday. If you're a great fit for the Founding Creator class, you'll hear from us directly at{" "}
                <span className="text-foreground font-semibold">{submittedEmail}</span>. In the meantime — tell a creator friend.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button variant="default" onClick={shareTwitter} className="gap-2">
                  <Twitter className="w-4 h-4" /> Share on Twitter
                </Button>
                <Button variant="default" onClick={shareLinkedIn} className="gap-2">
                  <Linkedin className="w-4 h-4" /> Share on LinkedIn
                </Button>
                <Button variant="outline" onClick={handleCopyLink} className="gap-2">
                  <Link2 className="w-4 h-4" /> {copied ? "Copied!" : "Copy Link"}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {/* Progress bar */}
              <div className="flex items-center gap-3 mb-8">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex-1">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: step >= s ? "100%" : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground text-xs text-center mb-6">Step {step} of 3</p>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm p-3 rounded-md mb-6 text-center">
                  {error}
                </div>
              )}

              {/* Step 1 */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Full Name *</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClasses} placeholder="Your full name" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Email Address *</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} placeholder="you@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Instagram or TikTok handle</label>
                    <input type="text" value={socialHandle} onChange={(e) => setSocialHandle(e.target.value)} className={inputClasses} placeholder="@yourhandle" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Invite Code</label>
                    <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} className={inputClasses} placeholder="Have an invite code? Enter it here." />
                  </div>
                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      if (!fullName.trim() || !email.trim()) {
                        setError("Please fill in your name and email.");
                        return;
                      }
                      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                        setError("Please enter a valid email address.");
                        return;
                      }
                      setError("");
                      setStep(2);
                    }}
                  >
                    Continue <ArrowRight className="ml-1 w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold mb-2">What type of creator are you?</label>
                    <select value={creatorType} onChange={(e) => setCreatorType(e.target.value)} className={selectClasses}>
                      <option value="">Select one…</option>
                      {CREATOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">How many followers across all platforms?</label>
                    <select value={followerCount} onChange={(e) => setFollowerCount(e.target.value)} className={selectClasses}>
                      <option value="">Select one…</option>
                      {FOLLOWER_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Where is your primary audience?</label>
                    <select value={primaryPlatform} onChange={(e) => setPrimaryPlatform(e.target.value)} className={selectClasses}>
                      <option value="">Select one…</option>
                      {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(1)}>
                      ← Back
                    </Button>
                    <Button
                      variant="hero"
                      size="lg"
                      className="flex-1"
                      onClick={() => {
                        if (!creatorType || !followerCount || !primaryPlatform) {
                          setError("Please fill in all fields.");
                          return;
                        }
                        setError("");
                        setStep(3);
                      }}
                    >
                      Continue <ArrowRight className="ml-1 w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold mb-2">In one sentence, what do you create?</label>
                    <textarea
                      value={oneSentence}
                      onChange={(e) => setOneSentence(e.target.value)}
                      rows={3}
                      maxLength={300}
                      className={`${inputClasses} resize-none`}
                      placeholder='e.g. "I teach first-generation investors how to build wealth from zero."'
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(2)}>
                      ← Back
                    </Button>
                    <Button
                      variant="hero"
                      size="lg"
                      className="flex-1"
                      onClick={handleSubmit}
                      disabled={submitting || !oneSentence.trim()}
                    >
                      {submitting ? "Submitting…" : "Submit Application"}
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-xs text-center">
                    No spam. No credit card. Just an honest look at your application.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 md:py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 hero-glow-layer" />
        <div className="absolute inset-0 hero-grid-layer opacity-50" />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl md:text-5xl font-extrabold mb-5 leading-tight">
              Be among the first <span className="text-gradient">creators.</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
              Founding Creator spots are limited. Join now before applications close.
            </p>
            <Button variant="hero" size="xl" onClick={scrollToForm}>
              Join the Waitlist <ArrowRight className="ml-1" />
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              No spam. Just your invite.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="UPLY" className="h-8 w-8" loading="lazy" />
            <span className="font-extrabold text-sm tracking-tight">UPLY</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2025 UPLY · uply.tv · Built for creators, by a creator.
          </p>
        </div>
      </footer>
    </div>
  );
}
