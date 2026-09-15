import SectionShell from "./SectionShell";
import { ExternalLink } from "lucide-react";

/**
 * Value-based comparison against Skool and Whop.
 *
 * Sourcing rules applied here:
 *  - Skool pricing is quoted from the official pricing page and dated.
 *  - Whop pricing is NOT quoted (not verified here); Whop is described by what
 *    it openly offers, and we differentiate on concrete UPLY workflows instead.
 *  - No claim that UPLY is universally cheaper, and no claim that a competitor
 *    "can't" do something we haven't verified.
 */

const SKOOL_SOURCE = "https://www.skool.com/pricing";
const SKOOL_VERIFIED = "15 Sep 2026";

const ROWS: { capability: string; uply: string; note?: string }[] = [
  {
    capability: "Community + courses",
    uply: "Built in — spaces, classroom modules, member management",
  },
  {
    capability: "Live streaming with tips and pay-per-view",
    uply: "Built in — RTMP ingest, HLS playback, live chat",
  },
  {
    capability: "Event ticketing with QR door scanning and resale",
    uply: "Built in — tiers, wristband codes, scan roles",
  },
  {
    capability: "AI drafting from your own notes or transcript",
    uply: "ARIA produces clip ideas, 4 social posts, an email, a thread and titles — you review and publish",
  },
  {
    capability: "Lead capture and follow-up list",
    uply: "Leads from your pages in one filterable list with status and CSV export",
  },
  {
    capability: "Payments",
    uply: "Your own connected Stripe account; flat 5% UPLY platform fee on sales",
  },
  {
    capability: "Done-for-you onboarding",
    uply: "Free setup call with your trial; a paid done-for-you build is available as a separate service",
  },
];

export default function HomepageComparison() {
  return (
    <SectionShell id="comparison" className="bg-background">
      <div className="text-center max-w-3xl mx-auto mb-8">
        <p className="eyebrow-gold mb-4">How we compare</p>
        <h2 className="type-display-lg text-foreground mb-4">
          Next to <span className="italic text-gold font-normal">Skool and Whop.</span>
        </h2>
        <p className="text-foreground/70 text-base sm:text-lg">
          Both are good at what they do. The honest difference is scope: UPLY runs the community,
          the stream, the ticketed event and the follow-up on one login.
        </p>
      </div>

      <div className="card-editorial mx-auto max-w-4xl rounded-md overflow-hidden">
        <div className="grid grid-cols-[1fr_1.6fr] border-b border-border/60 px-4 sm:px-6 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
          <div>Capability</div>
          <div className="text-gold">On UPLY</div>
        </div>
        {ROWS.map((r, i) => (
          <div
            key={r.capability}
            className={`grid grid-cols-[1fr_1.6fr] gap-3 px-4 sm:px-6 py-3 sm:py-4 text-sm ${i % 2 ? "bg-card/40" : ""}`}
          >
            <div className="font-semibold text-foreground">{r.capability}</div>
            <div className="text-foreground/75">{r.uply}</div>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-6 max-w-4xl grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-card/40 p-5">
          <h3 className="text-base font-bold text-foreground mb-2">Skool</h3>
          <p className="text-sm text-foreground/70">
            Skool's published pricing is <strong className="text-foreground">Hobby at $9/month plus a 10%
            transaction fee</strong> and <strong className="text-foreground">Pro at $99/month plus a 2.9%
            displayed fee</strong>.
          </p>
          <p className="mt-2 text-xs text-foreground/55">
            Verified {SKOOL_VERIFIED} at{" "}
            <a
              href={SKOOL_SOURCE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-foreground/80"
            >
              skool.com/pricing <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
            . Compare against your own volume — which platform costs less depends on your price points
            and sales mix.
          </p>
        </div>
        <div className="rounded-md border border-border bg-card/40 p-5">
          <h3 className="text-base font-bold text-foreground mb-2">Whop</h3>
          <p className="text-sm text-foreground/70">
            Whop is a strong marketplace for digital products and paid communities, and it ships its own
            AI and business tooling. The difference isn't "AI" — it's the workflow: on UPLY the same
            account runs a live stream, sells a ticket with door scanning, and hands you the lead list
            afterwards.
          </p>
          <p className="mt-2 text-xs text-foreground/55">
            We don't quote Whop's pricing here — check their current terms directly.
          </p>
        </div>
      </div>
    </SectionShell>
  );
}
