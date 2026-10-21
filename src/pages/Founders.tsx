import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Check, Trophy, Rocket, Shield, Crown, ArrowRight, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { isIOS, isNative } from "@/lib/native/platform";
import logoImg from "@/assets/logo.png";

const IOS_BLOCKED = isNative() && isIOS();

type Plan = "monthly" | "annual";

const FAQ = [
  {
    q: "What exactly do I get?",
    a: "Instant access to the UPLY creator operating system , streaming, products, memberships, courses, events, live commerce, ads, analytics , before public launch. Plus permanent UPLY Origin status, the founders badge on your profile, and automatic entry into the UPLY Games competition.",
  },
  {
    q: "What is the UPLY Games competition?",
    a: "A 90-day creator competition with cash prizes, distribution boosts, and feature placements for the founders who grow fastest. Only Founders Access members are eligible.",
  },
  {
    q: "Can I cancel?",
    a: "Yes , cancel any time. You keep founders status until the end of your billing period. No questions, no retention calls.",
  },
  {
    q: "Why $99 a month?",
    a: "It funds early infrastructure costs and keeps the seat count limited to creators who are serious. Everyone else waits for public launch.",
  },
  {
    q: "What are the creator sale fees?",
    a: "New creator pricing: Free 3% UPLY fee, Pro and Studio 0%. Stripe processing extra. Existing Founders Access billing is unchanged until activation.",
  },
];

export default function Founders() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [plan, setPlan] = useState<Plan>("monthly");
  const [stats, setStats] = useState<{ claimed: number; cap: number }>({ claimed: 0, cap: 100 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (supabase.rpc as any)("get_founders_stats").then(({ data }: any) => {
      if (data) setStats({ claimed: Number(data.claimed) || 0, cap: Number(data.cap) || 100 });
    });
    if (searchParams.get("cancelled")) toast.info("Checkout cancelled , no charge.");
  }, [searchParams]);

  const startCheckout = async () => {
    if (!user) {
      navigate(`/auth?mode=signup&redirect=${encodeURIComponent("/founders")}`);
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-founders-checkout", {
        body: { plan },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.error) {
        toast.error(data.error);
        setSubmitting(false);
      }
    } catch (e: any) {
      toast.error(e.message || "Could not start checkout");
      setSubmitting(false);
    }
  };

  const seatsLeft = Math.max(0, stats.cap - stats.claimed);
  const progress = Math.min(100, (stats.claimed / stats.cap) * 100);
  const monthlyPrice = 99;
  const annualPrice = 990; // $82.50/mo equivalent → ~$200 savings
  const annualMonthly = Math.round((annualPrice / 12) * 10) / 10;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <SEOHead
        title="UPLY Founders Access , Skip the Waitlist"
        description="$99/mo for instant access to the UPLY creator operating system before public launch. Includes UPLY Origin status and entry to the UPLY Games competition. Limited to 100 founders."
        canonicalUrl="https://uply.tv/founders"
      />

      {/* Header */}
      <header className="px-6 pt-6 pb-2 flex items-center justify-between max-w-5xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoImg} alt="UPLY" className="w-8 h-8 object-contain" />
          <span className="font-display font-bold text-lg">UPLY</span>
        </Link>
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back to home</Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-32">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pt-10 pb-8 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider mb-5">
            <Zap className="w-3.5 h-3.5" /> Founders Access , Limited to {stats.cap}
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">
            Skip the waitlist.<br />
            <span className="text-primary">Build before launch.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            For creators who want the UPLY operating system today , and an automatic entry into the
            <span className="text-foreground font-semibold"> UPLY Games</span> competition.
          </p>
        </motion.section>

        {/* Live counter */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-5 mb-8 border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
        >
          <div className="flex items-end justify-between mb-2">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Seats claimed</div>
              <div className="font-display text-3xl font-extrabold">
                {stats.claimed} <span className="text-muted-foreground text-xl font-bold">/ {stats.cap}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Remaining</div>
              <div className="font-display text-3xl font-extrabold text-primary">{seatsLeft}</div>
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-primary"
              style={{ boxShadow: "0 0 12px hsl(var(--primary))" }}
            />
          </div>
        </motion.div>

        {/* Plan toggle + price */}
        <div className="rounded-2xl p-6 sm:p-8 border-2 border-primary bg-card/40" style={{ boxShadow: "0 0 60px hsl(var(--primary)/0.15)" }}>
          {IOS_BLOCKED ? (
            <div className="text-center py-6">
              <h3 className="font-display text-2xl font-bold mb-2">Available on the web</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
                Founders Access is purchased on our website. Open uply.tv/founders in Safari to claim your seat.
              </p>
              <a
                href="https://uply.tv/founders"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border-2 border-primary text-primary font-bold text-sm hover:bg-primary/10 transition-colors min-h-[44px]"
              >
                Open uply.tv/founders <ExternalLink className="w-4 h-4" />
              </a>
              <ul className="space-y-2 mt-7 mb-1 max-w-md mx-auto text-left">
                {[
                  { icon: Rocket, label: "Instant beta access , skip the waitlist entirely" },
                  { icon: Crown, label: "Permanent UPLY Origin badge on your profile" },
                  { icon: Trophy, label: "Automatic entry into the UPLY Games competition" },
                  { icon: Shield, label: "Creator plan fee schedule; Stripe processing extra" },
                ].map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-start gap-3 text-sm">
                    <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center">
                      <Icon className="w-3 h-3 text-primary" />
                    </span>
                    <span className="text-foreground/90">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center gap-1 p-1 rounded-full border border-border bg-background">
                  <button
                    onClick={() => setPlan("monthly")}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${plan === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setPlan("annual")}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors relative ${plan === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    Annual
                    <span className="ml-1 text-[10px] opacity-90">Save $198</span>
                  </button>
                </div>
              </div>

              <div className="text-center mb-6">
                {plan === "monthly" ? (
                  <>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="font-display text-6xl font-black">${monthlyPrice}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Cancel anytime · No setup fees</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="font-display text-6xl font-black">${annualPrice}</span>
                      <span className="text-muted-foreground">/year</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ≈ ${annualMonthly}/mo · Save $198 vs monthly
                    </p>
                  </>
                )}
              </div>

              <ul className="space-y-3 mb-6 max-w-md mx-auto">
                {[
                  { icon: Rocket, label: "Instant beta access , skip the waitlist entirely" },
                  { icon: Crown, label: "Permanent UPLY Origin badge on your profile" },
                  { icon: Trophy, label: "Automatic entry into the UPLY Games competition" },
                  { icon: Shield, label: "Creator plan fee schedule; Stripe processing extra" },
                  { icon: Check, label: "Cancel anytime , keep access through period end" },
                ].map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-start gap-3 text-sm">
                    <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center">
                      <Icon className="w-3 h-3 text-primary" />
                    </span>
                    <span className="text-foreground/90">{label}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={startCheckout}
                disabled={submitting || authLoading}
                className="w-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 min-h-[52px] text-base"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Claim founders access <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground mt-3">
                Secure checkout via Stripe · Receipt emailed instantly
              </p>
            </>
          )}
        </div>

        {/* FAQ */}
        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold mb-5 text-center">Questions</h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="rounded-xl border border-border bg-card/30 p-4 group">
                <summary className="font-semibold text-sm cursor-pointer list-none flex items-center justify-between">
                  {f.q}
                  <span className="text-primary text-lg group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* Sticky bottom CTA , hidden on iOS native per App Store policy */}
      {!IOS_BLOCKED && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md px-4 py-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0) + 0.75rem)" }}
        >
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">
                {seatsLeft > 0 ? `${seatsLeft} founder seats left` : "Waitlist only"}
              </div>
              <div className="font-bold text-sm truncate">
                ${plan === "monthly" ? monthlyPrice : annualPrice}{plan === "monthly" ? "/mo" : "/yr"} · Skip the line
              </div>
            </div>
            <Button
              onClick={startCheckout}
              disabled={submitting || authLoading || seatsLeft === 0}
              className="bg-primary text-primary-foreground font-bold hover:bg-primary/90 min-h-[44px] shrink-0"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get instant access"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
