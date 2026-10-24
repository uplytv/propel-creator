import { useState } from "react";
import SectionShell from "./SectionShell";
import PlanCard from "@/components/pricing/PlanCard";
import TrialSignupModal from "@/components/pricing/TrialSignupModal";
import PlanScan from "@/components/pricing/PlanScan";
import {
  PLATFORM_PLANS,
  ARIA_PLAN_NOTE,
  FEE_DISCLOSURE,
  TRIAL_CARD_PROMISE,
  type PlatformPlanKey,
} from "@/components/pricing/plans";

// The undated competitor fee table that used to live here was removed: the
// quoted rates were not sourced or dated. Verified, dated comparison copy now
// lives in HomepageComparison.tsx (Skool, with an official source link).



export default function HomepagePricing() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlatformPlanKey>("unlimited");

  const handleStartTrial = (planKey: PlatformPlanKey) => {
    setSelectedPlan(planKey);
    setModalOpen(true);
  };

  return (
    <SectionShell id="pricing" className="bg-background">
      <div className="text-center max-w-3xl mx-auto mb-10">
        <p className="eyebrow-gold mb-4">Pricing</p>
        <h2 className="type-display-lg text-foreground mb-4">
          Simple pricing.{" "}
          <span className="italic text-gold font-normal">You keep 95%.</span>
        </h2>
        <p className="text-foreground/80 text-base sm:text-lg">{TRIAL_CARD_PROMISE}</p>
        <p className="text-foreground/80 text-sm mt-3">{ARIA_PLAN_NOTE}</p>
      </div>

      <div className="max-w-5xl mx-auto mb-8">
        <PlanScan />
      </div>

      <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {PLATFORM_PLANS.map((plan) => (
          <div key={plan.key} className="flex flex-col">
            <PlanCard plan={plan} onStartTrial={(p) => handleStartTrial(p.key)} />
          </div>
        ))}
      </div>

      <p id="fees" className="mx-auto mt-8 max-w-3xl text-center text-sm text-foreground/80 leading-relaxed scroll-mt-24">
        {FEE_DISCLOSURE}
      </p>

      <TrialSignupModal open={modalOpen} onOpenChange={setModalOpen} defaultPlan={selectedPlan} />
    </SectionShell>
  );
}
