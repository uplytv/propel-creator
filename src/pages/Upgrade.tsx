import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Sparkles, Loader2, ArrowLeft, Palette, Globe, ShieldOff, Headphones, Code2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/lib/posthog";

const WHITELABEL_FEATURES = [
  { icon: Palette, title: "Your brand, end to end", desc: "Your logo, colors, and name across the whole platform — members never see UPLY." },
  { icon: Globe, title: "Custom domain", desc: "Run everything on your own domain (app.yourbrand.com) with SSL handled for you." },
  { icon: ShieldOff, title: "Zero UPLY branding", desc: "All 'powered by' marks, emails, and the login screen become yours." },
  { icon: Zap, title: "0% platform fee", desc: "Keep 100% of what you earn — no transaction cut on top of Stripe." },
  { icon: Headphones, title: "Dedicated onboarding", desc: "White-glove setup, a migration hand and a priority support line." },
  { icon: Code2, title: "Full API & webhooks", desc: "Build on top of your instance — programmatic access to everything." },
];

export default function Upgrade() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setLoading(true);
    try {
      trackEvent("whitelabel_upgrade_started", { price: 497 });
      const { data, error } = await supabase.functions.invoke("create-whitelabel-checkout", {
        body: {},
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return; // navigating away — keep the spinner
      }
      throw new Error("No checkout URL returned");
    } catch (err: any) {
      toast.error(err?.message || "Couldn't start checkout. Try again.");
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-14">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <Crown className="w-3.5 h-3.5" /> White-Label
          </div>
          <h1
            className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-[hsl(220_100%_62%)] to-[hsl(280_85%_60%)] bg-clip-text text-transparent"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Make it your platform.
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Run the entire UPLY stack under your own brand — your logo, your domain, zero UPLY in sight.
            Everything your audience touches becomes unmistakably yours.
          </p>
        </div>

        {/* The plan card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl border-2 border-primary/40 bg-card overflow-hidden shadow-xl"
        >
          {/* gradient glow */}
          <div className="absolute inset-0 -z-0 opacity-20 blur-3xl bg-gradient-to-br from-[hsl(220_100%_62%)] to-[hsl(280_85%_60%)]" />
          <div className="relative p-6 md:p-9">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[hsl(220_100%_62%)] to-[hsl(280_85%_60%)] flex items-center justify-center shadow-lg">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">UPLY White-Label</h2>
                  <p className="text-xs text-muted-foreground">For agencies, brands & established creators</p>
                </div>
              </div>
              <div className="sm:text-right">
                <span className="text-4xl font-extrabold text-foreground">$497</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4 mb-8">
              {WHITELABEL_FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{f.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl bg-muted/40 border border-border p-4 mb-8">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Everything in Scale, plus the above
              </p>
              <ul className="grid sm:grid-cols-2 gap-1.5">
                {["Unlimited members & creators", "Live streaming, courses, events & ticketing", "ARIA AI — Claude-powered, your brand", "Affiliate & jobs marketplace"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            <Button onClick={handleCheckout} disabled={loading} className="w-full h-12 gap-2 text-base">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crown className="w-5 h-5" />}
              {loading ? "Starting checkout…" : "Get White-Label — $497/mo"}
            </Button>
            <p className="text-[11px] text-center text-muted-foreground mt-3">
              Cancel anytime · Setup call included · Migration support for existing audiences
            </p>
          </div>
        </motion.div>

        {/* Link to standard plans */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Not ready to white-label?{" "}
            <button onClick={() => navigate("/pricing")} className="text-primary font-semibold hover:underline">
              See standard plans →
            </button>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
