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
      "ARIA AI Team — 5 specialized agents",
      "Advanced analytics",
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
      "White-Label branding",
      "Your brand color & logo on member surfaces",
      "Founding-creator perks",
    ],
  },
];

export const TRIAL_DAYS = 14;

export const TRIAL_INTENT_STORAGE_KEY = "uply_trial_intent";
