import { useState } from "react";
import SectionShell from "./SectionShell";
import PlanCard from "@/components/pricing/PlanCard";
import TrialSignupModal from "@/components/pricing/TrialSignupModal";
import {
  PLATFORM_PLANS,
  ARIA_PLAN_NOTE,
  FEE_DISCLOSURE,
  type PlatformPlanKey,
} from "@/components/pricing/plans";

const COMPARISON = [
  { tool: "Ticketmaster / Live Nation", they: "27–37% fees + venue cut", uply: "5% flat" },
  { tool: "Patreon", they: "8–12% + processing", uply: "5% flat" },
  { tool: "Kajabi", they: "$199 / mo + transaction fees", uply: "From $97 / mo · 5% flat" },
  { tool: "Twitch / Kick", they: "Up to 50% revenue split", uply: "5% flat" },
  { tool: "Linktree / Beacons", they: "Paywall on basics", uply: "Included" },
  { tool: "Eventbrite", they: "3.7% + $1.79 per ticket", uply: "5% flat — no per-ticket fee" },
];

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
          Founding Creator Pricing,{" "}
          <span className="italic text-gold font-normal">honestly priced.</span>
        </h2>
        <p className="text-foreground/70 text-base sm:text-lg">
          Every plan starts with a 14-day free trial. Open to new creators today — no waitlist.
        </p>
        <p className="text-foreground/60 text-sm mt-3">{ARIA_PLAN_NOTE}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {PLATFORM_PLANS.map((plan) => (
          <div key={plan.key} className="flex flex-col">
            <PlanCard plan={plan} onStartTrial={(p) => handleStartTrial(p.key)} />
          </div>
        ))}
      </div>

      <p className="mx-auto mt-8 max-w-3xl text-center text-xs sm:text-sm text-foreground/60 leading-relaxed">
        {FEE_DISCLOSURE}
      </p>

      <TrialSignupModal open={modalOpen} onOpenChange={setModalOpen} defaultPlan={selectedPlan} />
    </SectionShell>
  );
}
