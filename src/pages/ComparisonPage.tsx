// UPLY vs {Competitor} — SEO comparison template.
// One template renders every config in src/data/comparisons.ts.
// Route: /vs/:slug (must be wired ABOVE the /:username catch-all in App.tsx).

import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, Check, Compass, Minus } from "lucide-react";
import HomepageNav from "@/components/landing/v2/HomepageNav";
import HomepageFooter from "@/components/landing/v2/HomepageFooter";
import SEOHead from "@/components/SEOHead";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getComparison, type ComparisonCell } from "@/data/comparisons";
import { TRIAL_RISK_REVERSAL } from "@/components/pricing/plans";

/** Render a boolean/string table cell — check, dash, or plain text. */
function Cell({ value, highlight }: { value: ComparisonCell; highlight?: boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Check className={`w-4 h-4 shrink-0 ${highlight ? "text-primary" : "text-foreground/50"}`} aria-hidden />
        <span className="sr-only">Yes</span>
        <span className={`text-sm ${highlight ? "font-semibold text-foreground" : "text-foreground/70"}`}>
          Included
        </span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1.5 text-foreground/40">
        <Minus className="w-4 h-4 shrink-0" aria-hidden />
        <span className="text-sm">Not offered</span>
      </span>
    );
  }
  return (
    <span className={`text-sm leading-snug ${highlight ? "font-medium text-foreground" : "text-foreground/70"}`}>
      {value}
    </span>
  );
}

export default function ComparisonPage() {
  const { slug } = useParams<{ slug: string }>();
  const config = getComparison(slug);

  if (!config) return <Navigate to="/" replace />;

  const { competitorName: name } = config;
  const title = `UPLY vs ${name} (2026) — Which is right for creators?`;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: config.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground antialiased">
      <SEOHead
        title={title}
        description={config.heroSummary}
        canonicalUrl={`https://uply.tv/vs/${config.slug}`}
        jsonLd={faqJsonLd}
      />
      <HomepageNav />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pt-28 pb-16 sm:pt-32 sm:pb-20">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 -top-1/4 -translate-x-1/2 w-[70vw] h-[70vw] max-w-[820px] max-h-[820px] rounded-full bg-primary/15 blur-[130px]" />
          <div className="absolute right-[8%] top-[16%] w-[30vw] h-[30vw] max-w-[320px] max-h-[320px] rounded-full bg-[hsl(var(--gold)/0.10)] blur-[110px]" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center gap-6">
          <p className="eyebrow-gold">{config.tagline} — compared</p>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
            <span className="text-gradient">UPLY</span> vs {name}
          </h1>
          <p className="text-base sm:text-lg text-foreground/75 max-w-2xl leading-relaxed">
            {config.heroSummary}
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Link
              to="/pricing"
              className="btn-primary-glow w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 h-12 text-sm font-bold tracking-wide"
            >
              Start your 14-day free trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/discover"
              className="btn-gold-outline w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 h-12 text-sm font-bold tracking-wide"
            >
              <Compass className="w-4 h-4" /> Explore creators
            </Link>
          </div>
          <p className="text-xs text-foreground/55">{TRIAL_RISK_REVERSAL}</p>
        </div>
      </section>

      {/* ── Feature table ── */}
      <section className="relative px-4 py-16 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="eyebrow-gold mb-2">Side by side</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              UPLY vs {name}, feature by feature
            </h2>
          </div>
          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="px-4 py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-foreground/60 w-[38%]">
                    Feature
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-primary bg-primary/5 border-x border-primary/20 w-[31%]">
                    UPLY
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-foreground/60 w-[31%]">
                    {name}
                  </th>
                </tr>
              </thead>
              <tbody>
                {config.featureTable.map((row) => (
                  <tr key={row.feature} className="border-b border-border last:border-b-0">
                    <th scope="row" className="px-4 py-3.5 text-sm font-semibold text-foreground/90 align-top">
                      {row.feature}
                    </th>
                    <td className="px-4 py-3.5 bg-primary/5 border-x border-primary/20 align-top">
                      <Cell value={row.uply} highlight />
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <Cell value={row.them} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-foreground/50 text-center">
            Feature availability summarized at a category level as of 2026 — details vary by plan on both platforms.
          </p>
        </div>
      </section>

      {/* ── Pricing snapshot ── */}
      <section className="relative px-4 py-16 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="eyebrow-gold mb-2">Pricing snapshot</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">What each platform costs</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-border bg-card/50 p-6">
              <h3 className="text-base font-bold mb-4">{config.pricing.them.heading}</h3>
              <ul className="space-y-3">
                {config.pricing.them.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-foreground/70 leading-relaxed">
                    <Minus className="w-4 h-4 mt-0.5 shrink-0 text-foreground/40" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-primary/40 bg-primary/5 p-6">
              <h3 className="text-base font-bold mb-4 text-primary">{config.pricing.uply.heading}</h3>
              <ul className="space-y-3">
                {config.pricing.uply.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-foreground/85 leading-relaxed">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 text-xs text-foreground/50 text-center max-w-3xl mx-auto">{config.pricing.note}</p>
        </div>
      </section>

      {/* ── Choose X / Choose UPLY ── */}
      <section className="relative px-4 py-16 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="eyebrow-gold mb-2">The honest answer</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Which one fits you?</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-border bg-card/50 p-6">
              <h3 className="text-base font-bold mb-4">Choose {name} if…</h3>
              <ul className="space-y-3">
                {config.chooseThem.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-foreground/70 leading-relaxed">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-foreground/40" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-primary/40 bg-primary/5 p-6">
              <h3 className="text-base font-bold mb-4">
                Choose <span className="text-gradient font-extrabold">UPLY</span> if…
              </h3>
              <ul className="space-y-3">
                {config.chooseUply.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-foreground/85 leading-relaxed">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="relative px-4 py-16 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <p className="eyebrow-gold mb-2">FAQ</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              UPLY vs {name} — common questions
            </h2>
          </div>
          <Accordion type="single" collapsible className="border border-border divide-y divide-border">
            {config.faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`} className="border-b-0 px-5">
                <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline hover:text-gold">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-foreground/70 leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Final CTA band ── */}
      <section className="relative px-4 py-20 border-t border-border overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[600px] max-h-[600px] rounded-full bg-primary/15 blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-5">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            One platform. <span className="text-gradient">95% yours.</span>
          </h2>
          <p className="text-foreground/70 max-w-xl">
            Streams, tickets, courses, community, music, and an AI team — the whole creator
            business in one place, with a 14-day free trial to prove it.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              to="/pricing"
              className="btn-primary-glow inline-flex items-center justify-center gap-1.5 px-7 h-12 text-sm font-bold tracking-wide"
            >
              Start your 14-day free trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/discover"
              className="btn-gold-outline inline-flex items-center justify-center gap-1.5 px-7 h-12 text-sm font-bold tracking-wide"
            >
              Explore creators
            </Link>
          </div>
          <p className="text-xs text-foreground/55">{TRIAL_RISK_REVERSAL}</p>
        </div>
      </section>

      <HomepageFooter />
    </div>
  );
}
