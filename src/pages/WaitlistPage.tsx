import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, Share2, Zap, Mic, Crown, Video, DollarSign, Bot, Trophy, Ticket, Sparkles, Eye, TrendingUp, Users } from "lucide-react";

const CREATOR_TYPES = ["Fitness", "Finance", "Gaming", "Lifestyle", "Business", "Education", "Music", "Other"];
const FOLLOWER_RANGES = ["Under 1K", "1K–10K", "10K–100K", "100K–500K", "500K+"];
const PLATFORMS = ["YouTube", "Instagram", "TikTok", "Twitch", "Kick", "Podcast", "Newsletter", "Other"];

export default function WaitlistPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [applicantCount, setApplicantCount] = useState(0);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  // Form state
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

  // Custom cursor
  useEffect(() => {
    const cursor = document.createElement("div");
    cursor.id = "custom-cursor";
    cursor.style.cssText = `
      position: fixed; width: 12px; height: 12px; background: #00FF85;
      border-radius: 50%; pointer-events: none; z-index: 99999;
      transition: transform 0.15s ease-out, opacity 0.15s;
      mix-blend-mode: difference; transform: translate(-50%, -50%);
    `;
    document.body.appendChild(cursor);
    document.body.style.cursor = "none";

    const move = (e: MouseEvent) => {
      cursor.style.left = e.clientX + "px";
      cursor.style.top = e.clientY + "px";
    };
    window.addEventListener("mousemove", move);

    return () => {
      window.removeEventListener("mousemove", move);
      cursor.remove();
      document.body.style.cursor = "";
    };
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

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: "UPLY", text: "Check out UPLY — the platform built for serious creators.", url: "https://uply.tv" });
    } else {
      await navigator.clipboard.writeText("https://uply.tv");
      // Simple toast
      const toast = document.createElement("div");
      toast.textContent = "Link copied. Send it to someone who needs this.";
      toast.style.cssText = `
        position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
        background: #00FF85; color: #0A0A0A; padding: 12px 24px; border-radius: 4px;
        font-weight: 600; font-size: 14px; z-index: 99999;
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-['Plus_Jakarta_Sans'] relative overflow-x-hidden" style={{ cursor: "none" }}>
      {/* Grain overlay */}
      <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundRepeat: "repeat" }} />

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 relative">
        {/* Green glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#00FF85] opacity-[0.04] blur-[120px]" />

        {/* Logo */}
        <div className="absolute top-8 left-8 flex items-center gap-2 animate-[fadeUp_0.6s_ease_both]">
          <img src="/logo.png" alt="UPLY" className="h-8 w-8" />
          <span className="font-extrabold text-lg tracking-tight">UPLY</span>
        </div>

        <div className="text-center max-w-3xl relative z-10">
          {/* Pill */}
          <div className="inline-block px-4 py-1.5 border border-[#00FF85]/30 rounded-full text-[#00FF85] text-xs font-semibold tracking-widest uppercase mb-8 animate-[fadeUp_0.6s_ease_0.1s_both]">
            Founding Creator Application — Class of 2025
          </div>

          {/* Headline */}
          <h1 className="text-[40px] md:text-[72px] font-extrabold leading-[1.05] tracking-tight mb-6 animate-[fadeUp_0.6s_ease_0.2s_both]">
            The Platform Built For Creators Who Are{" "}
            <span className="text-[#00FF85]">Serious.</span>
          </h1>

          {/* Sub */}
          <p className="text-[#888] text-base md:text-lg max-w-[560px] mx-auto mb-8 leading-relaxed animate-[fadeUp_0.6s_ease_0.3s_both]">
            UPLY combines live streaming, community, and monetization in one place. We're hand-selecting our first 500 Founding Creators. If you're building something real — this is your platform.
          </p>

          {/* Counter */}
          <p className="text-[#00FF85] font-bold text-sm mb-8 animate-[fadeUp_0.6s_ease_0.4s_both]">
            {applicantCount} creators have applied
          </p>

          {/* CTA */}
          <button
            onClick={scrollToForm}
            className="bg-[#00FF85] text-[#0A0A0A] font-bold text-base px-8 py-4 rounded-[4px] hover:shadow-[0_0_20px_rgba(0,255,133,0.4)] transition-shadow duration-300 animate-[fadeUp_0.6s_ease_0.5s_both]"
            style={{ cursor: "none" }}
          >
            Apply for Early Access →
          </button>

          <p className="text-[#888] text-xs mt-4 animate-[fadeUp_0.6s_ease_0.6s_both]">
            Founding Creator spots are limited. No credit card required.
          </p>
        </div>
      </section>

      {/* What Founding Creators Get */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-16 animate-[fadeUp_0.6s_ease_both]">
            What You're Getting Access To
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Zap className="w-6 h-6" />, title: "0% Platform Fees — Forever", desc: "Legacy beta creators keep 100% of what they earn. No catches. No expiry." },
              { icon: <Mic className="w-6 h-6" />, title: "Priority Onboarding Call", desc: "A real human walks you through setup and your growth strategy." },
              { icon: <Crown className="w-6 h-6" />, title: "Founding Creator Badge", desc: "Permanent badge on your profile. You were here first." },
              { icon: <Trophy className="w-6 h-6" />, title: "Monthly Prize Competitions", desc: "Compete for cash prizes every month. Most viewed, top revenue, top referrer — three ways to win." },
              { icon: <Ticket className="w-6 h-6" />, title: "Your Own Invite Code", desc: "Get a personal invite code to share. Every creator you bring in boosts your rank on the leaderboard." },
              { icon: <Sparkles className="w-6 h-6" />, title: "ARIA Early Access", desc: "Be the first to use our AI growth engine. ARIA will analyze your content and suggest your next move." },
            ].map((card, i) => (
              <div
                key={card.title}
                className="bg-[#111] border border-[#222] rounded-[4px] p-8 animate-[fadeUp_0.6s_ease_both]"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="text-[#00FF85] mb-4">{card.icon}</div>
                <h3 className="font-bold text-lg mb-2">{card.title}</h3>
                <p className="text-[#888] text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Pillars */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-16">
            Everything you need. Nothing you don't.
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Video className="w-6 h-6" />, title: "Go Live. Get Discovered.", desc: "Public streams with a built-in discovery feed. Every session is a chance for new fans to find you — no algorithm games." },
              { icon: <DollarSign className="w-6 h-6" />, title: "Monetize Everything.", desc: "Subscriptions, digital products, tips, and community access. One dashboard. One payout." },
              { icon: <Bot className="w-6 h-6" />, title: "ARIA — Your AI Growth Partner.", desc: "Powered by Claude. ARIA analyzes your performance, suggests your next move, and helps you grow faster than you could alone." },
            ].map((card, i) => (
              <div
                key={card.title}
                className="bg-[#111] border border-[#222] rounded-[4px] p-8 animate-[fadeUp_0.6s_ease_both]"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="text-[#00FF85] mb-4">{card.icon}</div>
                <h3 className="font-bold text-lg mb-2">{card.title}</h3>
                <p className="text-[#888] text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Competition Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4">
            Compete. Win. <span className="text-[#00FF85]">Get Paid.</span>
          </h2>
          <p className="text-[#888] text-center text-sm mb-16 max-w-lg mx-auto">
            Every month, we award cash prizes to top-performing Founding Creators across three categories.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: <Eye className="w-6 h-6" />,
                title: "Most Viewed",
                desc: "Highest total live stream views in a month.",
                prizes: ["$500", "$250", "$100"],
              },
              {
                icon: <TrendingUp className="w-6 h-6" />,
                title: "Top Revenue",
                desc: "Most revenue generated through products, tips & subs.",
                prizes: ["$500", "$250", "$100"],
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: "Top Referrer",
                desc: "Most successful creator referrals via your invite code.",
                prizes: ["$500", "$250", "$100"],
              },
            ].map((cat, i) => (
              <div
                key={cat.title}
                className="bg-[#111] border border-[#222] rounded-[4px] p-8 animate-[fadeUp_0.6s_ease_both]"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="text-[#00FF85] mb-4">{cat.icon}</div>
                <h3 className="font-bold text-lg mb-2">{cat.title}</h3>
                <p className="text-[#888] text-sm leading-relaxed mb-6">{cat.desc}</p>
                <div className="space-y-2">
                  {cat.prizes.map((prize, j) => (
                    <div key={j} className="flex items-center justify-between text-sm">
                      <span className="text-[#888]">{j === 0 ? "🥇 1st" : j === 1 ? "🥈 2nd" : "🥉 3rd"}</span>
                      <span className="text-[#00FF85] font-bold">{prize}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pre-launch referral leaderboard */}
          <div className="bg-[#111] border border-[#222] rounded-[4px] p-8 max-w-2xl mx-auto">
            <h3 className="font-bold text-lg text-center mb-6">
              🏆 Pre-Launch Referral Leaderboard
            </h3>
            <p className="text-[#888] text-xs text-center mb-6">
              Top referrers get priority access and bonus perks at launch.
            </p>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((rank) => (
                <div key={rank} className="flex items-center gap-4 py-2 border-b border-[#1a1a1a] last:border-0">
                  <span className="text-[#00FF85] font-bold text-sm w-6">#{rank}</span>
                  <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center text-xs text-[#555]">?</div>
                  <span className="text-[#555] text-sm flex-1">Waiting for you…</span>
                  <span className="text-[#333] text-xs">0 referrals</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-24 px-6" ref={formRef}>
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4">
            Apply for Founding Creator Access
          </h2>
          <p className="text-[#888] text-center text-sm mb-12">
            We review applications every Monday. If you're a fit, you'll hear from us directly.
          </p>

          {submitted ? (
            <div className="text-center animate-[fadeUp_0.6s_ease_both]">
              <div className="w-16 h-16 rounded-full bg-[#00FF85] flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-[#0A0A0A]" />
              </div>
              <h3 className="text-2xl font-extrabold mb-4">Application Received.</h3>
              <p className="text-[#888] text-sm leading-relaxed mb-8 max-w-md mx-auto">
                We review applications every Monday. If you're a great fit for the Founding Creator class, you'll hear from us directly at{" "}
                <span className="text-white font-semibold">{submittedEmail}</span>. In the meantime — tell a creator friend.
              </p>
              <button
                onClick={handleShare}
                className="bg-[#00FF85] text-[#0A0A0A] font-bold text-sm px-6 py-3 rounded-[4px] hover:shadow-[0_0_20px_rgba(0,255,133,0.4)] transition-shadow inline-flex items-center gap-2"
                style={{ cursor: "none" }}
              >
                <Share2 className="w-4 h-4" />
                Share UPLY →
              </button>
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <div className="flex items-center gap-3 mb-8">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex-1">
                    <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                      <div
                        className="h-full bg-[#00FF85] transition-all duration-500"
                        style={{ width: step >= s ? "100%" : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[#888] text-xs text-center mb-6">Step {step} of 3</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-[4px] mb-6 text-center">
                  {error}
                </div>
              )}

              {/* Step 1 */}
              {step === 1 && (
                <div className="space-y-5 animate-[fadeUp_0.4s_ease_both]">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[#111] border border-[#333] rounded-[4px] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#00FF85] transition-colors"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Email Address *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#111] border border-[#333] rounded-[4px] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#00FF85] transition-colors"
                      placeholder="you@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Instagram or TikTok handle</label>
                    <input
                      type="text"
                      value={socialHandle}
                      onChange={(e) => setSocialHandle(e.target.value)}
                      className="w-full bg-[#111] border border-[#333] rounded-[4px] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#00FF85] transition-colors"
                      placeholder="@yourhandle"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Invite Code</label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="w-full bg-[#111] border border-[#333] rounded-[4px] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#00FF85] transition-colors"
                      placeholder="Have an invite code? Enter it here for priority access."
                    />
                  </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Instagram or TikTok handle</label>
                    <input
                      type="text"
                      value={socialHandle}
                      onChange={(e) => setSocialHandle(e.target.value)}
                      className="w-full bg-[#111] border border-[#333] rounded-[4px] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#00FF85] transition-colors"
                      placeholder="@yourhandle"
                      style={{ cursor: "none" }}
                    />
                  </div>
                  <button
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
                    className="w-full bg-[#00FF85] text-[#0A0A0A] font-bold text-sm px-6 py-3.5 rounded-[4px] hover:shadow-[0_0_20px_rgba(0,255,133,0.4)] transition-shadow"
                    style={{ cursor: "none" }}
                  >
                    Continue →
                  </button>
                </div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div className="space-y-5 animate-[fadeUp_0.4s_ease_both]">
                  <div>
                    <label className="block text-sm font-semibold mb-2">What type of creator are you?</label>
                    <select
                      value={creatorType}
                      onChange={(e) => setCreatorType(e.target.value)}
                      className="w-full bg-[#111] border border-[#333] rounded-[4px] px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00FF85] transition-colors appearance-none"
                      style={{ cursor: "none" }}
                    >
                      <option value="">Select one…</option>
                      {CREATOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">How many followers across all platforms?</label>
                    <select
                      value={followerCount}
                      onChange={(e) => setFollowerCount(e.target.value)}
                      className="w-full bg-[#111] border border-[#333] rounded-[4px] px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00FF85] transition-colors appearance-none"
                      style={{ cursor: "none" }}
                    >
                      <option value="">Select one…</option>
                      {FOLLOWER_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Where is your primary audience?</label>
                    <select
                      value={primaryPlatform}
                      onChange={(e) => setPrimaryPlatform(e.target.value)}
                      className="w-full bg-[#111] border border-[#333] rounded-[4px] px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00FF85] transition-colors appearance-none"
                      style={{ cursor: "none" }}
                    >
                      <option value="">Select one…</option>
                      {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 border border-[#333] text-[#888] font-semibold text-sm px-6 py-3.5 rounded-[4px] hover:border-[#555] transition-colors"
                      style={{ cursor: "none" }}
                    >
                      ← Back
                    </button>
                    <button
                      onClick={() => {
                        if (!creatorType || !followerCount || !primaryPlatform) {
                          setError("Please fill in all fields.");
                          return;
                        }
                        setError("");
                        setStep(3);
                      }}
                      className="flex-1 bg-[#00FF85] text-[#0A0A0A] font-bold text-sm px-6 py-3.5 rounded-[4px] hover:shadow-[0_0_20px_rgba(0,255,133,0.4)] transition-shadow"
                      style={{ cursor: "none" }}
                    >
                      Continue →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <div className="space-y-5 animate-[fadeUp_0.4s_ease_both]">
                  <div>
                    <label className="block text-sm font-semibold mb-2">In one sentence, what do you create?</label>
                    <textarea
                      value={oneSentence}
                      onChange={(e) => setOneSentence(e.target.value)}
                      rows={3}
                      maxLength={300}
                      className="w-full bg-[#111] border border-[#333] rounded-[4px] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#00FF85] transition-colors resize-none"
                      placeholder='e.g. "I teach first-generation investors how to build wealth from zero."'
                      style={{ cursor: "none" }}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 border border-[#333] text-[#888] font-semibold text-sm px-6 py-3.5 rounded-[4px] hover:border-[#555] transition-colors"
                      style={{ cursor: "none" }}
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !oneSentence.trim()}
                      className="flex-1 bg-[#00FF85] text-[#0A0A0A] font-bold text-sm px-6 py-3.5 rounded-[4px] hover:shadow-[0_0_20px_rgba(0,255,133,0.4)] transition-shadow disabled:opacity-50"
                      style={{ cursor: "none" }}
                    >
                      {submitting ? "Submitting…" : "Submit My Application →"}
                    </button>
                  </div>
                  <p className="text-[#888] text-xs text-center">
                    No spam. No credit card. Just an honest look at your application.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center">
        <p className="text-[#444] text-sm">
          © 2025 UPLY · uply.tv · Built for creators, by a creator.
        </p>
      </footer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
