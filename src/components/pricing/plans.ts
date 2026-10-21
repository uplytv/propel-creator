// UPLY platform plans , single source of truth for both pricing surfaces
// and the signup modal. Free needs no subscription checkout.
export const CREATOR_PRICING_CHECKOUT_ENABLED = import.meta.env.VITE_CREATOR_PRICING_CHECKOUT_ENABLED === "true";

export type PlatformPlanKey = "free" | "pro" | "studio";
export type BillingInterval = "monthly" | "annual";
export interface PlatformPlan {
  key: PlatformPlanKey;
  name: string;
  price: number;
  annualPrice: number;
  feeRate: number;
  audience: string;
  popular?: boolean;
  features: string[];
}
export const PLATFORM_PLANS: PlatformPlan[] = [
  { key: "free", name: "Free", price: 0, annualPrice: 0, feeRate: 0.03,
    audience: "For creators getting started",
    features: ["Community", "Courses", "Events", "3% UPLY fee per sale"] },
  { key: "pro", name: "Pro", price: 99, annualPrice: 990, feeRate: 0, popular: true,
    audience: "For growing creator businesses",
    features: ["Everything in Free", "Ticketing", "Pay-per-view", "ARIA AI", "Custom domain", "0% UPLY fee per sale"] },
  { key: "studio", name: "Studio", price: 249, annualPrice: 2490, feeRate: 0,
    audience: "For teams building a branded experience",
    features: ["Everything in Pro", "Branded iOS and Android apps", "Multiple communities", "Team seats", "Priority support", "Free white-glove migration", "UPLY Build included with annual billing", "0% UPLY fee per sale"] },
];

export const TRIAL_DAYS = 14;

export const TRIAL_INTENT_STORAGE_KEY = "uply_trial_intent";

/** Owner's exact risk-reversal wording , shown near every trial CTA. */
export const TRIAL_RISK_REVERSAL = "14 days free · No obligation · Cancel at any time";

/**
 * Free human-led setup call offered right after trial checkout.
 * PLACEHOLDER , replace with the real booking link before launch.
 */
export const SETUP_CALL_URL = "https://calendly.com/uply/setup";

// Display only. Never use legacy mapping for billing, fee eligibility or grants.
export function planDisplayName(key: string | null | undefined): string {
  const legacy: Record<string, string> = {
    starter: "Free equivalent (legacy Starter billing unchanged)",
    unlimited: "Pro equivalent (legacy Unlimited billing unchanged)",
    agency_pro: "Studio equivalent (legacy Agency Pro billing unchanged)",
    scale: "Studio equivalent (legacy Scale billing unchanged)",
  };
  return legacy[key ?? ""] ?? PLATFORM_PLANS.find(p => p.key === key)?.name ?? key ?? "Free";
}
export const CREATOR_FEE_COPY = "Free: 3% UPLY fee. Pro and Studio: 0%. Stripe processing extra.";
export const FEE_ROLLOUT_NOTE = "New pricing preview. Current billing and sale fees remain unchanged until activation.";
export function includesUplyBuild(plan: PlatformPlanKey, interval: BillingInterval): boolean {
  return plan === "studio" && interval === "annual";
}
