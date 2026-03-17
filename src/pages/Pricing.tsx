import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Crown, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setCheckoutLoading(null);
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
      </div>
    </AppLayout>
  );
}
