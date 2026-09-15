import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, ArrowLeft, X } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PlanCard from "@/components/pricing/PlanCard";
import TrialSignupModal from "@/components/pricing/TrialSignupModal";
import CancelSubscriptionModal from "@/components/pricing/CancelSubscriptionModal";
import {
  PLATFORM_PLANS,
  ARIA_PLAN_NOTE,
  FEE_DISCLOSURE,
  type PlatformPlanKey,
} from "@/components/pricing/plans";

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlatformPlanKey>("unlimited");

  const { data: currentPlan = "free", refetch } = useQuery({
    queryKey: ["platform-subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-platform-subscription");
        if (error) return "free";
        return (data?.plan as string) || "free";
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

  const handleStartTrial = (planKey: PlatformPlanKey) => {
    setSelectedPlan(planKey);
    setModalOpen(true);
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Choose Your Plan</h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Every plan starts with a 14-day free trial. Open to new creators today — no waitlist. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {PLATFORM_PLANS.map((plan, idx) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <PlanCard
                plan={plan}
                isCurrent={currentPlan === plan.key}
                onStartTrial={(p) => handleStartTrial(p.key)}
              />
            </motion.div>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-8">
          All plans include unlimited community members, live streaming, and course creation. Cancel anytime.
          <br />
          <span className="mt-2 block">{ARIA_PLAN_NOTE}</span>
          <span className="mt-2 block">{FEE_DISCLOSURE}</span>
        </p>

        {/* Manage current plan (paid/trialing holders only) */}
        {currentPlan !== "free" && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground">
              You're on the {PLATFORM_PLANS.find((p) => p.key === currentPlan)?.name || currentPlan} plan.
            </span>
            <button
              onClick={() => setCancelOpen(true)}
              className="text-xs text-destructive/70 hover:text-destructive px-2 py-1 hover:bg-destructive/10 transition-colors"
            >
              Cancel subscription
            </button>
          </div>
        )}

        {/* Competitor Comparison */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-foreground text-center mb-2">Why creators choose UPLY</h2>
          <p className="text-sm text-muted-foreground text-center mb-8 max-w-md mx-auto">
            One platform replaces 6 subscriptions. Here's what you get that others don't.
          </p>

          <div className="rounded-md border border-border overflow-hidden">
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
              { feature: "Starting price", uply: "$97/mo · 14 days free", yt: "Free", pat: "$8/mo", kaj: "$149/mo" },
              { feature: "Creator payout", uply: "95%", yt: "~55%", pat: "88–92%", kaj: "varies" },
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

      <TrialSignupModal open={modalOpen} onOpenChange={setModalOpen} defaultPlan={selectedPlan} />
      <CancelSubscriptionModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        planName={PLATFORM_PLANS.find((p) => p.key === currentPlan)?.name || currentPlan}
        onChanged={() => refetch()}
      />
    </AppLayout>
  );
}
