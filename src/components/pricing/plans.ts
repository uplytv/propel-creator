// UPLY platform plans — single source of truth for both pricing surfaces
// and the trial signup modal. All plans start with a 14-day free trial.

export type PlatformPlanKey = "starter" | "unlimited" | "agency_pro";

export interface PlatformPlan {
  key: PlatformPlanKey;
  name: string;
  price: number; // USD per month
  audience: string;
  popular?: boolean;
  features: string[];
}

export const PLATFORM_PLANS: PlatformPlan[] = [
  {
    key: "starter",
    name: "Starter",
    price: 97,
    audience: "For solo creators getting started",
    features: [
      "Full creator platform — profile, feed & discovery",
      "Live streaming with tips",
      "Community & course builder",
      "Events & ticketing",
      "Message & book artists for shows near you",
      "1 creator account",
      "Standard support",
    ],
  },
  {
    key: "unlimited",
    name: "Unlimited",
    price: 297,
    audience: "For growing creator businesses",
    popular: true,
    features: [
      "Everything in Starter",
      "3 sub-accounts",
      "ARIA AI Team — 5 specialized agents working for you",
      "AI content repurposing — one video becomes clips, posts & emails",
      "Pay-per-view live streams & event livestreams",
      "Ticket resale marketplace & QR door scanning",
      "Contact & bid on exclusive artists for shows near you",
      "Email blasts & SmartLinks with analytics",
      "Advanced analytics + weekly AI growth report",
      "Unlimited events",
      "Priority support",
    ],
  },
  {
    key: "agency_pro",
    name: "Agency Pro",
    price: 497,
    audience: "For agencies & brands that need their own look",
    features: [
      "Everything in Unlimited",
      "Unlimited sub-accounts",
      "Full White-Label — your brand, not ours",
      "Your logo, colors & branded emails on every member surface",
      "UPLY TV (Roku) channel placement",
      "Affiliate & promoter program for your team",
      "Direct line to artists' management teams",
      "Per-event platform fees you control",
      "Dedicated onboarding — free done-for-you setup call",
      "Founding-creator perks",
    ],
  },
];

export const TRIAL_DAYS = 14;

/**
 * Founding-offer extended trial. The server (create-platform-checkout) clamps
 * trial_days to {14, 30} — passing anything else falls back to 14, so this
 * constant is a UI convenience, never a security boundary.
 */
export const EXTENDED_TRIAL_DAYS = 30;

/** Risk-reversal line parameterized by trial length (founding offer = 30). */
export const trialRiskReversal = (days: number = TRIAL_DAYS) =>
  `${days} days free · No obligation · Cancel at any time`;

/**
 * 50% affiliate program — per-referral first-month commission per plan.
 * Commissions are a PLATFORM marketing cost paid by UPLY out of its own plan
 * revenue ($97/$297/$497). They never touch creator money and never alter the
 * 95/5 creator payout split. Amounts here are display-only; the real number
 * is computed server-side by the affiliate-commission-reconciler from the
 * Stripe-verified invoice.
 */
export const AFFILIATE_COMMISSION_PCT = 50;
export const affiliateCommissionFor = (price: number) =>
  Math.round(price * (AFFILIATE_COMMISSION_PCT / 100) * 100) / 100;

export const TRIAL_INTENT_STORAGE_KEY = "uply_trial_intent";

/**
 * Step-1 answers ({company, full_name, email, phone}) stashed for write-back
 * onto the profiles row on the first authenticated Dashboard visit. Separate
 * from TRIAL_INTENT_STORAGE_KEY on purpose: the intent key is consumed by
 * TrialIntentResume (it relaunches checkout) and is cleared the moment a
 * checkout completes — this key must survive a guest checkout until its owner
 * signs in.
 */
export const TRIAL_PROFILE_STORAGE_KEY = "uply_trial_profile";

/** Owner's exact risk-reversal wording — shown near every trial CTA. */
export const TRIAL_RISK_REVERSAL = "14 days free · No obligation · Cancel at any time";

/**
 * Fee disclosure — the ONLY verified numbers we publish.
 *
 * Code evidence (Sep 2026):
 *  - supabase/functions/stripe-create-checkout: application_fee_percent: 5 with
 *    transfer_data.destination = the creator's connected Stripe account.
 *  - supabase/functions/stripe-create-product-checkout: application_fee_amount =
 *    round(base * 0.05), same destination transfer.
 *  - supabase/functions/stripe-create-event-checkout: fee = price * qty * 0.05.
 *
 * NOT verified in this codebase, so never stated as a guarantee: Stripe's own
 * payment-processing rates, payout/instant-payout fees, currency conversion,
 * chargeback fees, and applicable tax — those are set by Stripe and the
 * creator's account configuration.
 */
export const PLATFORM_FEE_PCT = 5;
export const FEE_DISCLOSURE =
  "Flat 5% UPLY platform fee on sales made through UPLY. The remaining 95% of the charge is transferred to your own connected Stripe account. Stripe's payment-processing, payout and any tax charges are set by Stripe and apply separately. Your plan price is billed separately.";
export const FEE_DISCLOSURE_SHORT = "Flat 5% UPLY platform fee · Stripe fees separate";

/**
 * AI entitlement positioning. ARIA is listed as part of the Unlimited and
 * Agency Pro plans (see PLATFORM_PLANS features). No entitlement logic is
 * changed by this constant — it is display copy only.
 */
export const ARIA_PLAN_NOTE =
  "The ARIA AI team is part of Unlimited ($297/mo) and Agency Pro ($497/mo). Starter ($97/mo) includes the core creator platform — profile, streaming, community, courses and events.";

/**
 * Free human-led setup call offered right after trial checkout.
 * PLACEHOLDER — replace with the real booking link before launch.
 */
export const SETUP_CALL_URL = "https://calendly.com/uply/setup";
