import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Crown, Loader2, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/posthog";
import { useQuery } from "@tanstack/react-query";

const PLATFORM_PLANS = {
  free: {
    name: "Free",
    price: 0,
    priceId: null,
    fee: "5%",
    icon: Zap,
    description: "Get started and grow your audience",
    features: [
      "Unlimited community members",
      "Live streaming",
      "Course builder",
      "5% transaction fee",
      "ARIA AI assistant",
    ],
    cta: "Current Plan",
  },
  pro: {
    name: "Pro",
    price: 49,
    priceId: "price_1TC1tA4C2GQMnrEDkXOrT8Lt",
    fee: "2%",
    icon: Sparkles,
    description: "For serious creators ready to scale",
    popular: true,
    features: [
      "Everything in Free",
      "2% transaction fee (save 60%)",
      "Priority support",
      "Advanced analytics",
      "Custom branding",
      "Affiliate program tools",
    ],
    cta: "Upgrade to Pro",
  },
  scale: {
    name: "Scale",
    price: 99,
    priceId: "price_1TC1tt4C2GQMnrEDziAUTGmV",
    fee: "0%",
    icon: Crown,
    description: "Maximum earnings, zero platform fees",
    features: [
      "Everything in Pro",
      "0% transaction fee",
      "Dedicated success manager",
      "API access",
      "White-label options",
      "Priority feature requests",
    ],
    cta: "Upgrade to Scale",
  },
};

type PlanKey = keyof typeof PLATFORM_PLANS;

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const { data: currentPlan = "free", refetch } = useQuery({
    queryKey: ["platform-subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-platform-subscription");
        if (error) return "free";
        return (data?.plan as PlanKey) || "free";
      } catch {
        return "free";
      }
    },
    refetchInterval: 30000,
  });

  // Check for upgrade success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      refetch();
    }
  }, []);

  const handleSubscribe = async (planKey: PlanKey) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const plan = PLATFORM_PLANS[planKey];
    if (!plan.priceId) return;

    setCheckoutLoading(planKey);
    try {
      
      const { data, error } = await supabase.functions.invoke("create-platform-checkout", {
        body: { price_id: plan.priceId },
      });
      
      if (error) throw error;
      if (data?.url) {
        trackEvent("platform_upgrade_started", { plan: planKey, price: plan.price });
        
        window.location.href = data.url;
        return; // Don't clear loading state — we're navigating away
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("[Pricing] Checkout error:", err);
      toast({ title: "Error", description: err.message || "Failed to start checkout", variant: "destructive" });
      setCheckoutLoading(null);
    }
  };

  const planEntries = Object.entries(PLATFORM_PLANS) as [PlanKey, typeof PLATFORM_PLANS[PlanKey]][];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Choose Your Plan</h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Keep more of what you earn. Upgrade to reduce transaction fees and unlock premium tools.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {planEntries.map(([key, plan], idx) => {
            const isCurrent = currentPlan === key;
            const isPopular = "popular" in plan && plan.popular;
            const Icon = plan.icon;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative rounded-2xl border-2 p-6 flex flex-col ${
                  isCurrent
                    ? "border-primary bg-primary/5"
                    : isPopular
                    ? "border-primary/50 bg-card shadow-lg"
                    : "border-border bg-card"
                }`}
              >
                {isPopular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> MOST POPULAR
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" /> YOUR PLAN
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.fee} transaction fee</p>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                  {plan.price > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
                </div>

                <p className="text-sm text-muted-foreground mb-5">{plan.description}</p>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(key)}
                  disabled={isCurrent || checkoutLoading === key || !plan.priceId}
                  variant={isPopular && !isCurrent ? "default" : "outline"}
                  className="w-full gap-2"
                >
                  {checkoutLoading === key ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    <Check className="w-4 h-4" />
                  ) : null}
                  {isCurrent ? "Current Plan" : plan.cta}
                </Button>
              </motion.div>
            );
          })}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-8">
          All plans include unlimited community members, live streaming, and course creation. Cancel anytime.
        </p>

        {/* Competitor Comparison */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-foreground text-center mb-2">Why creators choose UPLY</h2>
          <p className="text-sm text-muted-foreground text-center mb-8 max-w-md mx-auto">
            One platform replaces 6 subscriptions. Here's what you get that others don't.
          </p>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-5 bg-card border-b border-border">
              <div className="col-span-1 p-3" />
              <div className="p-3 text-center"><span className="text-xs font-bold text-primary">UPLY</span></div>
              <div className="p-3 text-center"><span className="text-xs text-muted-foreground">YouTube</span></div>
              <div className="p-3 text-center"><span className="text-xs text-muted-foreground">Patreon</span></div>
              <div className="p-3 text-center"><span className="text-xs text-muted-foreground">Kajabi</span></div>
            </div>
            {[
              { feature: "Live streaming + tips", uply: true, yt: true, pat: false, kaj: false },
              { feature: "Courses & classroom", uply: true, yt: false, pat: false, kaj: true },
              { feature: "Events & ticketing", uply: true, yt: false, pat: false, kaj: false },
              { feature: "Live shopping", uply: true, yt: false, pat: false, kaj: false },
              { feature: "Paid DMs", uply: true, yt: false, pat: false, kaj: false },
              { feature: "Community + leaderboards", uply: true, yt: false, pat: true, kaj: true },
              { feature: "AI growth assistant", uply: true, yt: false, pat: false, kaj: false },
              { feature: "Affiliate system", uply: true, yt: false, pat: false, kaj: true },
              { feature: "Jobs marketplace", uply: true, yt: false, pat: false, kaj: false },
              { feature: "Starting price", uply: "Free", yt: "Free", pat: "$8/mo", kaj: "$149/mo" },
              { feature: "Lowest transaction fee", uply: "0%", yt: "30%", pat: "8%+", kaj: "5%" },
            ].map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-5 ${i % 2 === 0 ? "bg-card/50" : ""} border-b border-border/50 last:border-0`}>
                <div className="col-span-1 p-3 flex items-center">
                  <span className="text-xs text-muted-foreground">{row.feature}</span>
                </div>
                {[row.uply, row.yt, row.pat, row.kaj].map((val, j) => (
                  <div key={j} className="p-3 flex items-center justify-center">
                    {typeof val === "string" ? (
                      <span className={`text-xs font-medium ${j === 0 ? "text-primary" : "text-muted-foreground"}`}>{val}</span>
                    ) : val ? (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${j === 0 ? "bg-primary/20" : "bg-muted"}`}>
                        <Check className={`w-3 h-3 ${j === 0 ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                    ) : (
                      <X className="w-3.5 h-3.5 text-muted-foreground/30" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
