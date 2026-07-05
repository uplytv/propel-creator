import { useState } from "react";
import SectionShell from "./SectionShell";
import PlanCard from "@/components/pricing/PlanCard";
import TrialSignupModal from "@/components/pricing/TrialSignupModal";
import { PLATFORM_PLANS, type PlatformPlanKey } from "@/components/pricing/plans";

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
          Every plan starts with a 14-day free trial. This ends at 100,000 creators.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {PLATFORM_PLANS.map((plan) => (
          <div key={plan.key} className="flex flex-col">
            <PlanCard plan={plan} onStartTrial={(p) => handleStartTrial(p.key)} />
            <div className="mt-4 text-center text-gold text-sm font-bold">
              95% payout. Always.
            </div>
          </div>
        ))}
      </div>

      {/* Comparison vs the legacy stack */}
      <div className="mt-14 max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <p className="eyebrow-gold mb-3">The Math</p>
          <h3 className="type-display-md text-foreground">
            UPLY vs. <span className="italic text-gold font-normal">the legacy stack</span>
          </h3>
        </div>
        <div className="card-editorial rounded-md overflow-hidden">
          <div
            className="grid grid-cols-[1.4fr_1fr_1fr] text-[10px] sm:text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground px-4 sm:px-6 py-3 border-b border-border/60"
          >
            <div>Tool</div>
            <div>They charge</div>
            <div className="text-gold">UPLY</div>
          </div>
          {COMPARISON.map((row, i) => (
            <div
              key={row.tool}
              className={`grid grid-cols-[1.4fr_1fr_1fr] items-center px-4 sm:px-6 py-3 sm:py-4 text-sm ${
                i % 2 ? "bg-card/40" : ""
              }`}
            >
              <div className="font-semibold text-foreground">{row.tool}</div>
              <div className="text-muted-foreground">{row.they}</div>
              <div className="font-bold text-gold">{row.uply}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-foreground/60 text-sm mt-8">
        Every plan. 95% payout. Always. No exceptions.
      </p>

      <TrialSignupModal open={modalOpen} onOpenChange={setModalOpen} defaultPlan={selectedPlan} />
    </SectionShell>
  );
}
