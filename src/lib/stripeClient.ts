import { loadStripe, type Stripe } from "@stripe/stripe-js";

/**
 * Lazily loads Stripe.js only when a publishable key is configured.
 * Calling loadStripe("") throws a console error on every page load, so we
 * return null instead and let callers show a friendly message.
 */
const publishableKey = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) || "";

export const hasStripeKey = publishableKey.length > 0;

let cached: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!hasStripeKey) return Promise.resolve(null);
  if (!cached) cached = loadStripe(publishableKey);
  return cached;
}
