import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { FOUNDER_OFFERS, getFounderOffer } from "@/data/founderOffers";
import FounderOfferCard from "./FounderOfferCard";

interface Props {
  /** "full" shows all 3 tiers side by side; "compact" shows the headline
   *  done-for-you offer with a link to the full pricing page. */
  variant?: "full" | "compact";
  /** Where this block is rendered — included in analytics events. */
  source: string;
  /** Optional override headline. */
  headline?: string;
  /** Optional override subhead. */
  subhead?: string;
}

export default function FounderOffersPricing({
  variant = "full",
  source,
  headline,
  subhead,
}: Props) {
  if (variant === "compact") {
    const offer = getFounderOffer("done-for-you-course");
    if (!offer) return null;
    return (
      <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-[#00FF85]/[0.08] via-white/[0.03] to-white/[0.02] border border-[#00FF85]/25">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00FF85]/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-[#00FF85]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#00FF85] font-semibold">
              Done for you · $495
            </p>
            <h3 className="font-heading text-lg sm:text-xl font-bold text-white mt-1">
              Skip the setup — we'll build your course for you.
            </h3>
            <p className="text-sm text-white/65 mt-1.5">
              Pay once and a UPLY rep builds your entire course from scratch — outline, lessons, media, and pricing. Rep contacts you within 1 business day.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                to="/founder-services"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00FF85] text-black text-sm font-semibold hover:bg-[#00FF85]/90 transition"
              >
                Compare tiers <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/founder-services#done-for-you"
                className="text-sm text-white/70 hover:text-white"
              >
                See what's included →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="w-full">
      <div className="text-center mb-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#00FF85] font-semibold mb-3">
          Founder Services
        </p>
        <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white">
          {headline ?? "Build it yourself, with help, or have us do it."}
        </h2>
        <p className="text-base text-white/65 mt-3 max-w-2xl mx-auto">
          {subhead ??
            "UPLY gives you the platform free. Want a real human to set it up — or build the whole thing for you? Pick a tier."}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {FOUNDER_OFFERS.map((o) => (
          <FounderOfferCard key={o.key} offer={o} source={source} />
        ))}
      </div>
      <p className="text-center text-xs text-white/40 mt-6">
        Payments processed securely by Stripe. UPLY platform service — direct charge, no creator split applied.
      </p>
    </section>
  );
}
