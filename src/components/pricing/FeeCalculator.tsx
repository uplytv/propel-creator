import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COMPETITOR_PRICING, monthlyPlatformCost } from "./competitorPricing";
import { PLATFORM_PLANS, type BillingInterval } from "./plans";

const money = (amount: number) => amount.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function FeeCalculator({ interval = "monthly" }: { interval?: BillingInterval }) {
  const [revenue, setRevenue] = useState("5000");
  const amount = Number(revenue);
  return <section className="mt-14 border-t border-border pt-10" aria-labelledby="fee-calculator-title">
    <h2 id="fee-calculator-title" className="text-2xl font-bold text-foreground">Compare your monthly cost</h2>
    <p className="mt-2 text-sm text-muted-foreground">Subscription plus platform fees. Stripe processing excluded from every column, along with taxes, payout and currency conversion charges.</p>
    <div className="my-5 max-w-xs space-y-2">
      <Label htmlFor="monthly-revenue">Monthly revenue (USD)</Label>
      <Input id="monthly-revenue" type="number" min="0" step="100" value={revenue} onChange={e => setRevenue(e.target.value)} className="text-base" />
    </div>
    <div className="overflow-x-auto border border-border rounded-md">
      <table className="w-full min-w-[540px] text-sm text-left">
        <caption className="sr-only">Monthly subscription and platform fee comparison</caption>
        <thead className="bg-muted"><tr><th scope="col" className="p-3">Plan</th><th scope="col" className="p-3">Subscription / month</th><th scope="col" className="p-3">UPLY or platform fee</th><th scope="col" className="p-3">Monthly cost</th></tr></thead>
        <tbody aria-live="polite">
          {PLATFORM_PLANS.map(plan => {
            const base = interval === "annual" ? plan.annualPrice / 12 : plan.price;
            return <tr key={plan.key} className="border-t border-border bg-primary/5"><th scope="row" className="p-3 text-primary">UPLY {plan.name}</th><td className="p-3">{money(base)}</td><td className="p-3">{plan.feeRate * 100}%</td><td className="p-3 font-bold">{money(monthlyPlatformCost(amount, base, plan.feeRate))}</td></tr>;
          })}
          {COMPETITOR_PRICING.map(plan => {
            const base = interval === "annual" && plan.annual ? plan.annual / 12 : plan.monthly;
            return <tr key={plan.name} className="border-t border-border"><th scope="row" className="p-3"><a href={plan.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{plan.name}</a></th><td className="p-3">{money(base)}</td><td className="p-3">{plan.platformRate === null ? "Not separable" : `${plan.platformRate * 100}%`}</td><td className="p-3">{plan.platformRate === null ? "Not comparable" : money(monthlyPlatformCost(amount, base, plan.platformRate))}</td></tr>;
          })}
        </tbody>
      </table>
    </div>
    <p className="mt-3 text-xs text-muted-foreground">Pricing as of Oct 2026, check each site. Annual selection uses annual monthly equivalents where documented; otherwise monthly list prices. UPLY estimates use proposed rates, not current live fees. Promotional migration waivers are not included.</p>
    <ul className="mt-4 space-y-2 text-xs text-muted-foreground">{COMPETITOR_PRICING.map(plan => <li key={plan.name}><a className="underline" href={plan.feeSource} target="_blank" rel="noopener noreferrer">{plan.name} fee source</a>: {plan.note}</li>)}</ul>
  </section>;
}