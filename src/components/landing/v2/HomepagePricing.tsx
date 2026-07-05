import { useState } from "react";
import { Link } from "react-router-dom";
import SectionShell from "./SectionShell";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const TIERS = [
  {
    name: "Starter",
    price: { monthly: 0, annual: 0 },
    blurb: "Free forever",
    features: [
      "Public profile",
      "Live streaming",
      "Community",
      "Discovery feed",
      "95% on all earnings",
    ],
  },
  {
    name: "Scaling",
    price: { monthly: 29, annual: 23 },
    blurb: "For growing creators",
    popular: true,
    features: [
      "Everything in Starter",
      "Memberships",
      "Courses",
      "SmartLinks",
      "Email broadcasts",
      "ARIA AI Growth Plan",
      "Content gating",
      "Events",
    ],
  },
  {
    name: "Pro",
    price: { monthly: 99, annual: 79 },
    blurb: "For full-time creators",
    features: [
      "Everything in Scaling",
      "Simulcast 8 platforms",
      "Co-streaming 4 guests",
      "Live commerce",
      "Ad campaign builder",
      "White-label options",
      "Priority support",
    ],
  },
];

const COMPARISON = [
  { tool: "Ticketmaster / Live Nation", they: "27–37% fees + venue cut", uply: "5% flat" },
  { tool: "Patreon", they: "8–12% + processing", uply: "5% flat" },
  { tool: "Kajabi", they: "$199 / mo + transaction fees", uply: "Free tier · 5% flat" },
  { tool: "Twitch / Kick", they: "Up to 50% revenue split", uply: "5% flat" },
  { tool: "Linktree / Beacons", they: "Paywall on basics", uply: "Included" },
  { tool: "Eventbrite", they: "3.7% + $1.79 per ticket", uply: "5% flat — no per-ticket fee" },
];

export default function HomepagePricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <SectionShell id="pricing" className="bg-background">
      <div className="text-center max-w-3xl mx-auto mb-10">
        <p className="eyebrow-gold mb-4">Pricing</p>
        <h2 className="type-display-lg text-foreground mb-4">
          Founding Creator Pricing,{" "}
          <span className="italic text-gold font-normal">honestly priced.</span>
        </h2>
        <p className="text-foreground/70 text-base sm:text-lg">This ends at 100,000 creators.</p>

        {/* Annual toggle */}
        <div className="inline-flex items-center gap-1 mt-6 p-1 rounded-full border border-gold-hairline bg-card/40">
          <button
            onClick={() => setAnnual(false)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              !annual ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-gold"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              annual ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-gold"
            }`}
          >
            Annual <span className="text-xs opacity-80">(save 20%)</span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {TIERS.map((t) => {
          const price = annual ? t.price.annual : t.price.monthly;
          return (
            <div
              key={t.name}
              className={`relative rounded-2xl p-6 sm:p-8 flex flex-col transition-all duration-300 ${
                t.popular
                  ? "border-editorial bg-gradient-to-b from-primary/10 to-card/30 shadow-[0_0_60px_hsl(var(--primary)/0.2)]"
                  : "card-editorial"
              }`}
            >
              {t.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gold text-[hsl(var(--gold-foreground))] text-[10px] font-bold uppercase tracking-[0.22em] shadow-[0_8px_24px_-10px_hsl(var(--gold)/0.7)]">
                  Most Popular
                </div>
              )}
              <div className="font-display text-xl font-bold text-foreground" style={{ fontFamily: "Fraunces, Georgia, serif" }}>
                {t.name}
              </div>
              <div className="text-sm text-foreground/60 mt-1">{t.blurb}</div>
              <div className="my-5">
                <span
                  className="text-4xl sm:text-5xl font-bold text-foreground"
                  style={{ fontFamily: "Fraunces, Georgia, serif" }}
                >
                  ${price}
                </span>
                {price > 0 && <span className="text-foreground/60 text-sm ml-1">/mo</span>}
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Check className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth?mode=signup" className="block">
                <Button
                  className={`w-full rounded-full h-11 font-bold ${
                    t.popular ? "btn-primary-glow" : "btn-gold-outline"
                  }`}
                  variant={t.popular ? "default" : "outline"}
                >
                  Get Started
                </Button>
              </Link>
              <div className="mt-4 text-center text-gold text-sm font-bold">
                95% payout. Always.
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison vs the legacy stack */}
      <div className="mt-14 max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <p className="eyebrow-gold mb-3">The Math</p>
          <h3 className="type-display-md text-foreground">
            UPLY vs. <span className="italic text-gold font-normal">the legacy stack</span>
          </h3>
        </div>
        <div className="card-editorial rounded-2xl overflow-hidden">
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
        Every tier. 95% payout. Always. No exceptions.
      </p>
    </SectionShell>
  );
}

