/**
 * UPLY Founder Services — paid "we'll do it for you" offerings.
 * Direct platform charges (no Stripe Connect / no creator split).
 *
 * To edit the middle "Assisted" tier price, change `priceCents` and
 * `stripePriceId` below. Set `enabled: false` to hide a paid tier from
 * checkout UI (it still renders as "Contact us").
 */

export type FounderOfferKey = "diy" | "assisted-setup" | "done-for-you-course";

export interface FounderOffer {
  key: FounderOfferKey;
  /** Short display name on the card. */
  name: string;
  /** One-line value prop under the name. */
  tagline: string;
  /** Price in cents, USD. 0 = free/included. */
  priceCents: number;
  /** Price label override; falls back to formatted priceCents. */
  priceLabel?: string;
  /** Suffix shown after price (e.g. "one-time"). */
  priceSuffix: string;
  /** Stripe Price ID — only set for paid, live tiers. */
  stripePriceId?: string;
  /** Bulleted feature list. */
  features: string[];
  /** CTA label. */
  ctaLabel: string;
  /** Visual emphasis (highlighted/borders). */
  highlighted?: boolean;
  /** Show on UI but disable checkout (renders "Contact us" instead). */
  enabled: boolean;
  /** For disabled / DIY tiers: where the CTA links to. */
  ctaHref?: string;
}

export const FOUNDER_OFFERS: FounderOffer[] = [
  {
    key: "diy",
    name: "Build it yourself",
    tagline: "Use UPLY's course builder — included with your account.",
    priceCents: 0,
    priceLabel: "Included",
    priceSuffix: "with your account",
    features: [
      "Full course builder access",
      "Unlimited modules & lessons",
      "Mux video hosting included",
      "Keep 95% of every sale",
    ],
    ctaLabel: "Start building",
    ctaHref: "/dashboard",
    enabled: true,
  },
  {
    // ⚠️ PLACEHOLDER PRICING — set your real price + Stripe price ID
    // before enabling checkout. Until `stripePriceId` is set the CTA
    // falls back to "Contact us" via mailto.
    key: "assisted-setup",
    name: "Assisted setup",
    tagline: "1:1 strategy call + course outline + setup checklist.",
    priceCents: 14900,
    priceSuffix: "one-time",
    features: [
      "60-min 1:1 strategy call",
      "Custom course outline drafted with you",
      "Pricing & launch checklist",
      "You record + upload the content",
    ],
    ctaLabel: "Get started",
    enabled: false, // toggle to true once Stripe price exists
  },
  {
    key: "done-for-you-course",
    name: "Done-for-you course build",
    tagline: "A UPLY rep builds your entire course from scratch.",
    priceCents: 49500,
    priceSuffix: "one-time",
    stripePriceId: "price_1To7wJ4C2GQMnrEDtvSzzzyl",
    features: [
      "Full course outlined, written & assembled",
      "Modules, lessons, and media uploaded for you",
      "Pricing, landing page & launch plan",
      "Rep contacts you within 1 business day",
    ],
    ctaLabel: "Pay $495 and book my rep",
    highlighted: true,
    enabled: true,
  },
];

export function getFounderOffer(key: FounderOfferKey): FounderOffer | undefined {
  return FOUNDER_OFFERS.find((o) => o.key === key);
}

export function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars.toFixed(0)}` : `$${dollars.toFixed(2)}`;
}
