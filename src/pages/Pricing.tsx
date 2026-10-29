import BillingToggle from "@/components/pricing/BillingToggle";
import FeeCalculator from "@/components/pricing/FeeCalculator";
import PricingOffers from "@/components/pricing/PricingOffers";
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
import { ACTIVE_PLATFORM_PLANS, DEFAULT_TRIAL_PLAN, CREATOR_PRICING_CHECKOUT_ENABLED, type PlatformPlanKey, type BillingInterval, CREATOR_FEE_COPY, FEE_ROLLOUT_NOTE, planDisplayName } from "@/components/pricing/plans";

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlatformPlanKey>(DEFAULT_TRIAL_PLAN);

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
    if (planKey === "free") { navigate(user ? "/dashboard" : "/auth?mode=signup"); return; }
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
            {CREATOR_PRICING_CHECKOUT_ENABLED ? "Start free. Pro $99/month. Studio $249/month. Annual billing gives 2 months free." : "Start with 14 days free. Starter $97/month or Unlimited $297/month."}
          </p>
        </div>

        {CREATOR_PRICING_CHECKOUT_ENABLED && <BillingToggle value={interval} onChange={setInterval} />}
        {CREATOR_PRICING_CHECKOUT_ENABLED && <PricingOffers />}
        <div className="grid md:grid-cols-3 gap-5">
          {ACTIVE_PLATFORM_PLANS.map((plan, idx) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <PlanCard
                plan={plan}
                interval={interval}
                isCurrent={currentPlan === plan.key}
                onStartTrial={(p) => handleStartTrial(p.key)}
              />
            </motion.div>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-8">
          {CREATOR_PRICING_CHECKOUT_ENABLED ? CREATOR_FEE_COPY : "Starter $97/month. Unlimited $297/month. Agency Pro $497/month."}<br />{CREATOR_PRICING_CHECKOUT_ENABLED ? FEE_ROLLOUT_NOTE : "14-day free trial. Then your selected monthly plan applies. 5% UPLY sale fee plus Stripe processing."}
        </p>

        {/* Manage current plan (paid/trialing holders only) */}
        {currentPlan !== "free" && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground">
              You're on the {planDisplayName(currentPlan)} plan.
            </span>
            <button
              onClick={() => setCancelOpen(true)}
              className="text-xs text-destructive/70 hover:text-destructive px-2 py-1 hover:bg-destructive/10 transition-colors"
            >
              Cancel subscription
            </button>
          </div>
        )}

        {CREATOR_PRICING_CHECKOUT_ENABLED && <FeeCalculator interval={interval} />}
      </div>

      <TrialSignupModal open={modalOpen} onOpenChange={setModalOpen} defaultPlan={selectedPlan} billingInterval={interval} />
      <CancelSubscriptionModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        planName={planDisplayName(currentPlan)}
        onChanged={() => refetch()}
      />
    </AppLayout>
  );
}
