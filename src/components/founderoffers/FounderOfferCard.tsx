import { useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatPrice, type FounderOffer } from "@/data/founderOffers";
import { trackEvent } from "@/lib/posthog";

interface Props {
  offer: FounderOffer;
  /** Where this card is rendered — included in analytics events. */
  source: string;
}

/**
 * Single tier card. Free/DIY tiers link out; paid tiers create a Stripe
 * Checkout session via the `create-founder-offer-checkout` edge function
 * and redirect the buyer in a new tab.
 */
export default function FounderOfferCard({ offer, source }: Props) {
  const [loading, setLoading] = useState(false);

  const isPaid = offer.priceCents > 0;
  const canCheckout = isPaid && offer.enabled && !!offer.stripePriceId;

  const handleClick = async () => {
    trackEvent("founder_offer_cta_click", {
      offer_key: offer.key,
      offer_price_cents: offer.priceCents,
      source,
    });

    if (!isPaid) return; // <Link> handles navigation
    if (!canCheckout) return; // mailto handles it

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-founder-offer-checkout",
        { body: { offerKey: offer.key } },
      );
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      console.error("[founder-offer-checkout] failed", err);
      toast.error(err?.message || "Could not start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const ctaClasses = offer.highlighted
    ? "bg-[#00FF85] text-black hover:bg-[#00FF85]/90"
    : "bg-white/10 text-white hover:bg-white/20 border border-white/15";

  // Resolve the CTA element.
  let cta: JSX.Element;
  if (!isPaid && offer.ctaHref) {
    cta = (
      <Link
        to={offer.ctaHref}
        onClick={() =>
          trackEvent("founder_offer_cta_click", {
            offer_key: offer.key,
            offer_price_cents: offer.priceCents,
            source,
          })
        }
        className={`mt-6 inline-flex items-center justify-center w-full px-4 py-3 rounded-xl text-sm font-semibold transition ${ctaClasses}`}
      >
        {offer.ctaLabel}
      </Link>
    );
  } else if (!canCheckout) {
    cta = (
      <a
        href={`mailto:founders@uply.tv?subject=${encodeURIComponent(
          `Interested in ${offer.name}`,
        )}`}
        onClick={() =>
          trackEvent("founder_offer_contact_click", {
            offer_key: offer.key,
            source,
          })
        }
        className={`mt-6 inline-flex items-center justify-center w-full px-4 py-3 rounded-xl text-sm font-semibold transition ${ctaClasses}`}
      >
        Contact us
      </a>
    );
  } else {
    cta = (
      <button
        onClick={handleClick}
        disabled={loading}
        className={`mt-6 inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed ${ctaClasses}`}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "Starting checkout…" : offer.ctaLabel}
      </button>
    );
  }

  return (
    <div
      className={`relative rounded-2xl p-6 flex flex-col h-full ${
        offer.highlighted
          ? "bg-gradient-to-b from-[#00FF85]/[0.08] to-white/[0.02] border border-[#00FF85]/30"
          : "bg-white/[0.03] border border-white/10"
      }`}
    >
      {offer.highlighted && (
        <div className="absolute -top-3 left-6 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#00FF85] text-black">
          <Sparkles className="w-3 h-3" /> Most popular
        </div>
      )}

      <h3 className="font-heading text-xl font-bold text-white">{offer.name}</h3>
      <p className="text-sm text-white/60 mt-1">{offer.tagline}</p>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-heading text-3xl font-bold text-white">
          {offer.priceLabel ?? formatPrice(offer.priceCents)}
        </span>
        <span className="text-xs text-white/50">{offer.priceSuffix}</span>
      </div>

      <ul className="mt-5 space-y-2 flex-1">
        {offer.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-white/80">
            <Check
              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                offer.highlighted ? "text-[#00FF85]" : "text-white/60"
              }`}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {cta}
    </div>
  );
}
