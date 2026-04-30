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

export default function HomepagePricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <SectionShell id="pricing" className="bg-background">
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-4">
          Pricing
        </div>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
          Founding Creator Pricing.
        </h2>
        <p className="text-foreground/70 text-base sm:text-lg">This ends at 100,000 creators.</p>

        {/* Annual toggle */}
        <div className="inline-flex items-center gap-3 mt-6 p-1 rounded-full border border-border/50 bg-card/40">
          <button
            onClick={() => setAnnual(false)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              !annual ? "bg-primary text-primary-foreground" : "text-foreground/70"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              annual ? "bg-primary text-primary-foreground" : "text-foreground/70"
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
              className={`relative rounded-2xl p-6 sm:p-8 border flex flex-col ${
                t.popular
                  ? "border-primary bg-gradient-to-b from-primary/10 to-card/30 shadow-[0_0_60px_hsl(var(--primary)/0.2)]"
                  : "border-border/50 bg-card/40"
              }`}
            >
              {t.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wide">
                  Most Popular
                </div>
              )}
              <div className="font-display text-xl font-bold text-foreground">{t.name}</div>
              <div className="text-sm text-foreground/60 mt-1">{t.blurb}</div>
              <div className="my-5">
                <span className="font-display text-4xl sm:text-5xl font-bold text-foreground">${price}</span>
                {price > 0 && <span className="text-foreground/60 text-sm ml-1">/mo</span>}
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button
                  className={`w-full ${
                    t.popular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : ""
                  }`}
                  variant={t.popular ? "default" : "outline"}
                >
                  Get Started
                </Button>
              </Link>
              <div className="mt-4 text-center text-primary text-sm font-bold">
                95% payout. Always.
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-foreground/60 text-sm mt-8">
        Every tier. 95% payout. Always. No exceptions.
      </p>
    </SectionShell>
  );
}
