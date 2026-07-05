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

export const TRIAL_INTENT_STORAGE_KEY = "uply_trial_intent";

/** Owner's exact risk-reversal wording — shown near every trial CTA. */
export const TRIAL_RISK_REVERSAL = "14 days free · No obligation · Cancel at any time";

/**
 * Free human-led setup call offered right after trial checkout.
 * PLACEHOLDER — replace with the real booking link before launch.
 */
export const SETUP_CALL_URL = "https://calendly.com/uply/setup";
