import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Calendar, Sparkles, Zap, LogOut, PartyPopper, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoImg from "@/assets/logo.png";

const CALCOM_BOOKING_URL = "https://cal.com/uplytv";

const CREATOR_TYPES = [
  "Music", "Streaming", "Education", "Fitness", "Gaming",
  "Lifestyle", "Business", "Beauty", "Sports", "Tech", "Other",
];

const FOLLOWER_RANGES = [
  { key: "<1K", label: "Under 1K", qualifies: false },
  { key: "1K-10K", label: "1K – 10K", qualifies: false },
  { key: "10K-50K", label: "10K – 50K", qualifies: true },
  { key: "50K-100K", label: "50K – 100K", qualifies: true },
  { key: "100K-500K", label: "100K – 500K", qualifies: true },
  { key: "500K+", label: "500K+", qualifies: true },
];

const PLATFORMS = [
  "Instagram", "TikTok", "YouTube", "Twitch", "Kick",
  "Spotify / SoundCloud", "Podcast", "Twitter/X", "Other",
];

const EARNING_RANGES = [
  { key: "$0", label: "$0 — not monetizing yet", qualifies: false },
  { key: "$0-500", label: "Under $500 / mo", qualifies: false },
  { key: "$500-2K", label: "$500 – $2K / mo", qualifies: true },
  { key: "$2K-10K", label: "$2K – $10K / mo", qualifies: true },
  { key: "$10K+", label: "$10K+ / mo", qualifies: true },
];

type Step = 0 | 1 | 2 | 3 | 4;

export default function Apply() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [qualified, setQualified] = useState<boolean | null>(null);
  const [resending, setResending] = useState(false);

  const [fullName, setFullName] = useState("");
  const [creatorType, setCreatorType] = useState("");
  const [platform, setPlatform] = useState("");
  const [followers, setFollowers] = useState<typeof FOLLOWER_RANGES[number] | null>(null);
  const [earnings, setEarnings] = useState<typeof EARNING_RANGES[number] | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth?mode=signup&returnTo=/apply", { replace: true });
      return;
    }
    // Prefill name
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, display_name, is_approved")
        .eq("user_id", user.id)
        .maybeSingle() as any;
      if (data?.is_approved) {
        navigate("/discover", { replace: true });
        return;
      }
      const composed = [data?.first_name, data?.last_name].filter(Boolean).join(" ") || data?.display_name || "";
      setFullName(composed);
    })();
  }, [user, loading, navigate]);

  const canNext = () => {
    if (step === 0) return fullName.trim().length >= 2;
    if (step === 1) return !!creatorType;
    if (step === 2) return !!platform;
    if (step === 3) return !!followers;
    if (step === 4) return !!earnings;
    return false;
  };

  const submit = async () => {
    if (!user || !followers || !earnings) return;
    setSubmitting(true);
    const isQualified = followers.qualifies || earnings.qualifies;

    try {
      // Upsert into waitlist (using existing schema)
      await (supabase as any)
        .from("waitlist")
        .upsert(
          {
            email: user.email!,
            full_name: fullName.trim(),
            creator_type: creatorType,
            primary_platform: platform,
            follower_count: followers.key,
            monthly_earnings: earnings.key,
            user_id: user.id,
          },
          { onConflict: "email" }
        );

      // Mark profile as onboarding complete so they don't get bounced back
      await (supabase as any)
        .from("profiles")
        .update({
          onboarding_complete: true,
          first_name: fullName.trim().split(" ")[0] || null,
          last_name: fullName.trim().split(" ").slice(1).join(" ") || null,
          creator_type: creatorType,
        })
        .eq("user_id", user.id);

      // Send confirmation email
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "application-confirmation",
          recipientEmail: user.email!,
          idempotencyKey: `apply-confirm-${user.id}`,
          templateData: { name: fullName.trim(), qualified: isQualified },
        },
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setQualified(isQualified);
      }, 2500);
    } catch (e: any) {
      toast.error(e.message || "Could not submit application");
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  // ============= POST-SUBMIT: SUCCESS SCREEN =============
  if (showSuccess) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
        <Header onSignOut={signOut} />
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-sm w-full text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.05))", border: "2px solid hsl(var(--primary))" }}
            >
              <PartyPopper className="w-9 h-9 text-primary" />
            </motion.div>
            <h1
              className="text-3xl font-black mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Application sent!
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              We received your application. Check your inbox for a confirmation email with next steps.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
              <Mail className="w-3.5 h-3.5" />
              <span>Sent to {user.email}</span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ============= POST-SUBMIT: QUALIFIED =============
  if (qualified === true) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground">
        <Header onSignOut={signOut} />
        <div className="max-w-2xl mx-auto px-6 pb-24 pt-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-6 mb-5 text-center"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--background)))",
              border: "2px solid hsl(var(--primary))",
              boxShadow: "0 0 60px hsl(var(--primary) / 0.18)",
            }}
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 mb-3">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-black mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              You qualify — let's talk
            </h1>
            <p className="text-sm text-muted-foreground mb-1">
              Based on your answers, you fit what UPLY is built for.
            </p>
            <p className="text-sm text-muted-foreground">
              Book a 15-min intro with the UPLY team to get your account activated.
            </p>
          </motion.div>

          <div className="rounded-xl overflow-hidden border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Pick a time</span>
            </div>
            <iframe
              src={CALCOM_BOOKING_URL}
              title="Book an intro call"
              className="w-full"
              style={{ height: "min(720px, calc(100dvh - 280px))", border: 0 }}
              allow="camera; microphone; autoplay; encrypted-media; fullscreen"
            />
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => window.open(CALCOM_BOOKING_URL, "_blank")}
              className="flex-1 bg-primary text-primary-foreground font-bold min-h-[44px]"
            >
              Open booking in new tab
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/waitlist")}
              className="flex-1 min-h-[44px]"
            >
              I'll book later
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============= POST-SUBMIT: NOT QUALIFIED =============
  if (qualified === false) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground">
        <Header onSignOut={signOut} />
        <div className="max-w-lg mx-auto px-6 pb-16 pt-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 mb-5 bg-card border border-border"
          >
            <h1 className="text-xl font-black mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              You're on the waitlist
            </h1>
            <p className="text-sm text-muted-foreground">
              Thanks for applying. UPLY is in invite-only beta — you can wait for your spot, redeem a beta code, or skip the line below.
            </p>
          </motion.div>

          {/* Skip the line — Founders */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl p-5 mb-4"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--background)))",
              border: "2px solid hsl(var(--primary))",
              boxShadow: "0 0 40px hsl(var(--primary) / 0.15)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold">Skip the line — get prioritized today</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Founders Access: instant beta, priority review by the UPLY team, and UPLY Origin status.
            </p>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-3xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>$99</span>
              <span className="text-sm text-muted-foreground">/month · cancel anytime</span>
            </div>
            <Button
              onClick={() => navigate("/waitlist")}
              className="w-full bg-primary text-primary-foreground font-bold min-h-[44px]"
            >
              Get instant access
            </Button>
          </motion.div>

          <Button
            variant="outline"
            onClick={() => navigate("/waitlist")}
            className="w-full min-h-[44px]"
          >
            View my waitlist position & invite code
          </Button>
        </div>
      </div>
    );
  }

  // ============= QUESTION STEPS =============
  const totalSteps = 5;
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <Header onSignOut={signOut} />

      <div className="max-w-lg mx-auto px-6 pb-24 pt-2">
        {/* Progress */}
        <div className="flex gap-1.5 mb-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full transition-colors"
              style={{
                background: i <= step ? "hsl(var(--primary))" : "hsl(var(--muted))",
              }}
            />
          ))}
        </div>

        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
          Step {step + 1} of {totalSteps} · 60 seconds
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            {step === 0 && (
              <div>
                <h1 className="text-2xl font-black mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  What's your name?
                </h1>
                <p className="text-sm text-muted-foreground mb-5">We use this on your creator profile.</p>
                <Input
                  autoFocus
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="First and last name"
                  className="bg-card border-border text-base min-h-[48px]"
                  onKeyDown={(e) => e.key === "Enter" && canNext() && setStep(1)}
                />
              </div>
            )}

            {step === 1 && (
              <div>
                <h1 className="text-2xl font-black mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  What do you create?
                </h1>
                <p className="text-sm text-muted-foreground mb-5">Pick the closest fit.</p>
                <div className="grid grid-cols-2 gap-2">
                  {CREATOR_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => { setCreatorType(t); }}
                      className={`min-h-[48px] rounded-xl px-3 text-sm font-semibold border transition-colors ${
                        creatorType === t
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card text-foreground/80 hover:border-primary/50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h1 className="text-2xl font-black mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Your main platform?
                </h1>
                <p className="text-sm text-muted-foreground mb-5">Where most of your audience lives today.</p>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`min-h-[48px] rounded-xl px-3 text-sm font-semibold border transition-colors ${
                        platform === p
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card text-foreground/80 hover:border-primary/50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h1 className="text-2xl font-black mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Audience size?
                </h1>
                <p className="text-sm text-muted-foreground mb-5">Total followers across all platforms.</p>
                <div className="space-y-2">
                  {FOLLOWER_RANGES.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setFollowers(r)}
                      className={`w-full min-h-[48px] rounded-xl px-4 text-sm font-semibold border text-left flex items-center justify-between transition-colors ${
                        followers?.key === r.key
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      {r.label}
                      {followers?.key === r.key && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h1 className="text-2xl font-black mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Monthly creator income?
                </h1>
                <p className="text-sm text-muted-foreground mb-5">Roughly — from your content / community.</p>
                <div className="space-y-2">
                  {EARNING_RANGES.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setEarnings(r)}
                      className={`w-full min-h-[48px] rounded-xl px-4 text-sm font-semibold border text-left flex items-center justify-between transition-colors ${
                        earnings?.key === r.key
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      {r.label}
                      {earnings?.key === r.key && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Nav */}
        <div className="mt-6 flex gap-2">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1) as Step)}
              className="min-h-[48px]"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          {step < 4 ? (
            <Button
              onClick={() => setStep((s) => Math.min(4, s + 1) as Step)}
              disabled={!canNext()}
              className="flex-1 bg-primary text-primary-foreground font-bold min-h-[48px]"
            >
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={!canNext() || submitting}
              className="flex-1 bg-primary text-primary-foreground font-bold min-h-[48px]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit application"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ onSignOut }: { onSignOut: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="px-6 pt-6 pb-2 flex items-center justify-between max-w-2xl mx-auto">
      <button onClick={() => navigate("/")} className="flex items-center gap-2">
        <img src={logoImg} alt="UPLY" className="w-8 h-8 object-contain" />
      </button>
      <button
        onClick={async () => { await onSignOut(); navigate("/", { replace: true }); }}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <LogOut className="w-3 h-3" /> Sign out
      </button>
    </div>
  );
}
