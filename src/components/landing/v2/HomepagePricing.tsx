import BillingToggle from "@/components/pricing/BillingToggle";
import FeeCalculator from "@/components/pricing/FeeCalculator";
import PricingOffers from "@/components/pricing/PricingOffers";
import { useState } from "react";
import SectionShell from "./SectionShell";
import PlanCard from "@/components/pricing/PlanCard";
import TrialSignupModal from "@/components/pricing/TrialSignupModal";
import { ACTIVE_PLATFORM_PLANS, DEFAULT_TRIAL_PLAN, CREATOR_PRICING_CHECKOUT_ENABLED, type PlatformPlanKey, type BillingInterval, CREATOR_FEE_COPY, FEE_ROLLOUT_NOTE, planDisplayName } from "@/components/pricing/plans";

export default function HomepagePricing() {
  const [modalOpen, setModalOpen] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<PlatformPlanKey>(DEFAULT_TRIAL_PLAN);

  const handleStartTrial = (planKey: PlatformPlanKey) => {
    setSelectedPlan(planKey);
    if (planKey === "free") { window.location.assign("/auth?mode=signup"); return; }
    setModalOpen(true);
  };

  return (
    <SectionShell id="pricing" className="bg-background">
      <div className="text-center max-w-3xl mx-auto mb-10">
        <p className="eyebrow-gold mb-4">Pricing</p>
        <h2 className="type-display-lg text-foreground mb-4">
          Founding Creator Pricing,{" "}
          <span className="italic text-gold font-normal">honestly priced.</span>
        </h2>
        <p className="text-foreground/70 text-base sm:text-lg">
          {CREATOR_PRICING_CHECKOUT_ENABLED ? "Start with Free. Upgrade to Pro or Studio as your business grows." : "Start your 14-day free trial on Starter or Unlimited."}
        </p>
      </div>

      {CREATOR_PRICING_CHECKOUT_ENABLED && <BillingToggle value={interval} onChange={setInterval} />}
      {CREATOR_PRICING_CHECKOUT_ENABLED && <PricingOffers />}
      <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {ACTIVE_PLATFORM_PLANS.map((plan) => (
          <div key={plan.key} className="flex flex-col">
            <PlanCard interval={interval} plan={plan} onStartTrial={(p) => handleStartTrial(p.key)} />
            <div className="mt-4 text-center text-gold text-sm font-bold">
              {plan.feeRate * 100}% UPLY fee · Stripe processing extra
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto">{CREATOR_PRICING_CHECKOUT_ENABLED && <FeeCalculator interval={interval} />}</div>
      <p className="text-center text-muted-foreground text-xs mt-8">{CREATOR_PRICING_CHECKOUT_ENABLED ? FEE_ROLLOUT_NOTE : "14-day free trial. Then your selected monthly plan applies. 5% UPLY sale fee plus Stripe processing."}</p>

      <TrialSignupModal open={modalOpen} onOpenChange={setModalOpen} defaultPlan={selectedPlan} billingInterval={interval} />
    </SectionShell>
  );
}
