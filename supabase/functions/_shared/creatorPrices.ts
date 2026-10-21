export const CREATOR_PRICE_ENV = {
  pro: { monthly: "STRIPE_PRICE_PRO_MONTHLY", annual: "STRIPE_PRICE_PRO_ANNUAL" },
  studio: { monthly: "STRIPE_PRICE_STUDIO_MONTHLY", annual: "STRIPE_PRICE_STUDIO_ANNUAL" },
} as const;

export function creatorPriceVariable(plan: string, interval: string): string | null {
  if (plan !== "pro" && plan !== "studio") return null;
  if (interval !== "monthly" && interval !== "annual") return null;
  return CREATOR_PRICE_ENV[plan][interval];
}