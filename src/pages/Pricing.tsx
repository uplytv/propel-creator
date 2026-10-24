import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PlanCard from "@/components/pricing/PlanCard";
import TrialSignupModal from "@/components/pricing/TrialSignupModal";
import CancelSubscriptionModal from "@/components/pricing/CancelSubscriptionModal";
import PlanScan from "@/components/pricing/PlanScan";
import EarnCompare from "@/components/pricing/EarnCompare";
import {
  PLATFORM_PLANS,
  ARIA_PLAN_NOTE,
  FEE_DISCLOSURE,
  TRIAL_CARD_PROMISE,
  type PlatformPlanKey,
} from "@/components/pricing/plans";

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlatformPlanKey>("unlimited");
  const reduceMotion = useReducedMotion();

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
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-foreground/80 hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Pricing that leaves you 95%</h1>
          <p className="text-foreground/80 mt-2 max-w-lg mx-auto">
            {TRIAL_CARD_PROMISE}
          </p>
        </div>

        <div className="mb-8">
          <PlanScan />
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {PLATFORM_PLANS.map((plan, idx) => (
            <motion.div
              key={plan.key}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { delay: idx * 0.1 }}
            >
              <PlanCard
                plan={plan}
                isCurrent={currentPlan === plan.key}
                onStartTrial={(p) => handleStartTrial(p.key)}
              />
            </motion.div>
          ))}
        </div>

        <p id="fees" className="text-sm text-center text-foreground/80 mt-8 scroll-mt-24">
          <span className="block">{FEE_DISCLOSURE}</span>
          <span className="mt-2 block">{ARIA_PLAN_NOTE}</span>
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

        <div className="mt-16">
          <EarnCompare />
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
