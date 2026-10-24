import { ExternalLink } from "lucide-react";
import { FEE_DISCLOSURE_SHORT, PLATFORM_FEE_PCT } from "@/components/pricing/plans";

/**
 * Honest public comparison. UPLY cells are the plan list and the 5% fee.
 * Competitor prices are quoted only when this file has a dated source.
 * No GMV, no creator earnings, no "lowest fees."
 */

const SKOOL_SOURCE = "https://www.skool.com/pricing";
const SKOOL_VERIFIED = "15 Sep 2026";

const UPLY_ROWS = [
  {
    label: "Live and pay-per-view",
    value: "Tips on every plan. Pay-per-view on Unlimited and Agency Pro.",
  },
  {
    label: "Sales fee",
    value: `Flat ${PLATFORM_FEE_PCT}%. You keep ${100 - PLATFORM_FEE_PCT}% of the charge. Stripe’s processing and payout fees are separate. Your plan is billed separately.`,
  },
  {
    label: "Community and courses",
    value: "On every plan.",
  },
  {
    label: "Ticketing",
    value: "Events and tickets on every plan. Resale and QR check-in on Unlimited and Agency Pro.",
  },
];

const OTHERS = [
  {
    name: "Skool",
    body: "Built around community and courses. Published prices we checked: Hobby at $9/month plus a 10% transaction fee, and Pro at $99/month plus a 2.9% displayed fee.",
    source: SKOOL_SOURCE,
    sourceLabel: `skool.com/pricing · ${SKOOL_VERIFIED}`,
  },
  {
    name: "Whop",
    body: "A marketplace for digital products and paid communities. We do not quote their fee. UPLY’s sales fee is a flat 5%, and the same login runs live and tickets.",
  },
  {
    name: "Kajabi",
    body: "Courses, coaching, and funnels. We do not quote their fee. UPLY adds live, pay-per-view, and tickets beside the classroom.",
  },
  {
    name: "Mighty Networks",
    body: "Communities and courses. We do not quote their fee. UPLY adds live, pay-per-view, and tickets on the same login.",
  },
];

export default function EarnCompare() {
  return (
    <div>
      <div className="text-center max-w-3xl mx-auto mb-8">
        <p className="eyebrow-gold mb-3">Switching</p>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
          One login. You keep {100 - PLATFORM_FEE_PCT}%.
        </h2>
        <p className="text-base text-foreground/80">
          Memberships, courses, tickets, and live. {FEE_DISCLOSURE_SHORT}.
        </p>
      </div>

      <dl className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
        {UPLY_ROWS.map((row) => (
          <div key={row.label} className="rounded-xl border border-border bg-card p-4 text-left">
            <dt className="text-xs font-bold uppercase tracking-wider text-foreground/80">{row.label}</dt>
            <dd className="mt-1 text-sm font-medium text-foreground leading-snug">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-2">
        {OTHERS.map((other) => (
          <div key={other.name} className="rounded-xl border border-border bg-card/60 p-4 text-left">
            <h3 className="text-sm font-bold text-foreground">{other.name}</h3>
            <p className="mt-1 text-sm text-foreground/80 leading-snug">{other.body}</p>
            {other.source && (
              <a
                href={other.source}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-foreground underline underline-offset-4"
              >
                {other.sourceLabel} <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            )}
          </div>
        ))}
      </div>

      <p className="mx-auto mt-4 max-w-3xl text-center text-sm text-foreground/80">
        Other platforms change their prices. Confirm them on their sites. UPLY’s sales fee on this page is the flat {PLATFORM_FEE_PCT}% in the product.
      </p>
    </div>
  );
}
