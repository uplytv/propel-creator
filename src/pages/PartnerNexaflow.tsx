import { useMemo, useState } from "react";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import uplyLogo from "@/assets/logo.png";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  Globe,
  Megaphone,
  Palette,
  Search,
  Sparkles,
  Users,
} from "lucide-react";

/**
 * UPLY × Nexaflow AI — public partnership landing page.
 * Route: /partners/nexaflow (with /nexaflow redirecting here).
 * Light UPLY brand: white canvas, blue→purple gradient accents.
 */

const GRADIENT = "linear-gradient(90deg,#3D7CFF 0%,#B025FF 100%)";

const SYSTEM = [
  {
    icon: Users,
    title: "Pipeline Conversion Engine",
    body: "AI-assisted qualification paired with dedicated human closers who turn interested leads into signed clients.",
  },
  {
    icon: Megaphone,
    title: "Demand Acquisition Layer",
    body: "Data-driven paid acquisition across Meta, Google and TikTok, continuously optimized by AI against real revenue.",
  },
  {
    icon: Search,
    title: "Organic Visibility Engine",
    body: "Search and discovery optimization so the right buyers find you without paying for every click.",
  },
  {
    icon: Globe,
    title: "Conversion-Ready Digital Presence",
    body: "A custom-built site and storefront designed to convert, hosted and run on UPLY.",
  },
  {
    icon: Palette,
    title: "Brand Identity System",
    body: "Logo and visual identity engineered for instant recognition across every channel you show up on.",
  },
  {
    icon: Sparkles,
    title: "UPLY Operating System",
    body: "Your ARIA AI agents, community, live commerce, payments and analytics — all in one place, 95% payout.",
  },
];

type TierKey = "growth" | "pro";

const TIERS: {
  key: TierKey;
  name: string;
  setup: number;
  monthly: number;
  annual: number;
  popular?: boolean;
  features: string[];
}[] = [
  {
    key: "growth",
    name: "Growth Revenue System",
    setup: 1500,
    monthly: 297,
    annual: 2970,
    features: [
      "Brand Identity System",
      "Conversion-Ready Digital Presence",
      "Organic Visibility Engine",
      "UPLY Operating System (Pro tier)",
      "Monthly strategy session with Nexaflow AI",
    ],
  },
  {
    key: "pro",
    name: "Pro Revenue System",
    setup: 2500,
    monthly: 497,
    annual: 4970,
    popular: true,
    features: [
      "Everything in Growth",
      "Pipeline Conversion Engine (dedicated closers)",
      "Demand Acquisition Layer (ad spend billed separately)",
      "Priority Nexaflow AI consulting",
      "ARIA agents fully configured",
      "Quarterly revenue system audit",
    ],
  },
];

const STEPS = [
  {
    n: "01",
    title: "Audit",
    body: "Nexaflow AI maps your offer, margins and current demand, then engineers the revenue model before anything is built.",
  },
  {
    n: "02",
    title: "Build",
    body: "Identity, digital presence, visibility and pipeline are built as one connected system — not disconnected projects.",
  },
  {
    n: "03",
    title: "Run on UPLY",
    body: "Everything goes live on UPLY, where your audience, offers, payments and ARIA agents operate together every day.",
  },
];

const FAQ = [
  {
    q: "What does the setup fee include?",
    a: "The one-time setup covers the full build: revenue audit, brand identity system, your conversion-ready digital presence on UPLY, organic visibility foundations, and configuration of your UPLY operating system and ARIA agents. Pro adds pipeline and paid acquisition setup.",
  },
  {
    q: "Do I need my own ad budget?",
    a: "Only for the Demand Acquisition Layer on the Pro Revenue System. Management is included in your monthly fee; ad spend is paid directly to the platforms and billed separately. Growth runs entirely on organic visibility.",
  },
  {
    q: "How long is the contract?",
    a: "Monthly plans have a 6-month minimum so the system has time to compound. Annual plans are paid upfront and include two months free.",
  },
  {
    q: "What happens after setup?",
    a: "Your system goes live on UPLY and moves into the run phase: ongoing optimization, strategy sessions with Nexaflow AI, and continuous ARIA-driven reporting on what is actually producing revenue.",
  },
];

const REVENUE_RANGES = [
  "Pre-revenue",
  "$1k–$10k / mo",
  "$10k–$50k / mo",
  "$50k–$250k / mo",
  "$250k+ / mo",
];

function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-clip-text text-transparent" style={{ backgroundImage: GRADIENT }}>
      {children}
    </span>
  );
}

export default function PartnerNexaflow() {
  const [annual, setAnnual] = useState(false);
  const [loadingTier, setLoadingTier] = useState<TierKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    business: "",
    email: "",
    phone: "",
    monthly_revenue: "",
    tier: "pro" as TierKey,
  });

  const billingPeriod = annual ? "annual" : "monthly";
  const scrollToForm = (tier?: TierKey) => {
    if (tier) setForm((f) => ({ ...f, tier }));
    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });
  };

  const startCheckout = async (tier: TierKey) => {
    setLoadingTier(tier);
    try {
      const { data, error } = await supabase.functions.invoke("create-partner-checkout", {
        body: { tier, billing_period: billingPeriod, email: form.email || undefined },
      });
      if (error || !data?.url) throw new Error(error?.message || "Checkout unavailable");
      window.open(data.url as string, "_blank");
    } catch {
      toast.error("Checkout is not available right now — send your details and we'll reach out.");
      scrollToForm(tier);
    } finally {
      setLoadingTier(null);
    }
  };

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSubmitting(true);
    try {
      // partner_leads is not in the generated types yet — cast at the boundary.
      const { data, error } = await (supabase as any)
        .from("partner_leads")
        .insert({
          partner: "nexaflow",
          name: form.name.trim(),
          business: form.business.trim() || null,
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          monthly_revenue: form.monthly_revenue || null,
          tier: form.tier,
          billing_period: billingPeriod,
          source: "/partners/nexaflow",
        })
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (data?.id) {
        supabase.functions.invoke("notify-partner-lead", { body: { lead_id: data.id } });
      }
      setSubmitted(true);
      toast.success("Got it — we'll be in touch within one business day.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const priceLabel = useMemo(
    () => (t: (typeof TIERS)[number]) =>
      annual ? `$${t.annual.toLocaleString()}/yr` : `$${t.monthly}/mo`,
    [annual]
  );

  return (
    <div className="min-h-screen bg-white text-[#0b0b0f] font-sans">
      <SEOHead
        title="AI Revenue System | UPLY × Nexaflow AI"
        description="Nexaflow AI engineers the revenue system. UPLY runs it — the AI-powered operating system where your audience, offers, and payments live."
        canonicalUrl="https://uply.tv/partners/nexaflow"
      />

      {/* HERO */}
      <header className="relative overflow-hidden px-5 pt-10 pb-16 sm:pt-16 sm:pb-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-[0.18] blur-[110px]"
          style={{ background: GRADIENT }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-8 flex items-center justify-center gap-4">
            <img src={uplyLogo} alt="UPLY" className="h-9 w-auto" />
            <span className="text-xl font-light text-[#c9c9d1]">×</span>
            {/* TODO(manual): replace with the official Nexaflow AI logo when provided. */}
            <span className="text-lg font-extrabold tracking-tight">
              Nexaflow<GradientText> AI</GradientText>
            </span>
          </div>

          <p className="mb-4 inline-block rounded-full border border-[#ececf3] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#6b6b7b]">
            Partnership
          </p>

          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            The <GradientText>AI Revenue System</GradientText> for businesses and creators.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base text-[#4b4b5a] sm:text-lg">
            Nexaflow AI engineers the revenue system. UPLY runs it — the AI-powered operating
            system where your audience, offers, and payments live.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={() => scrollToForm()}
              className="h-12 rounded-full border-0 text-white hover:opacity-90"
              style={{ backgroundImage: GRADIENT }}
            >
              Apply / Book a strategy call <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              className="h-12 rounded-full border-[#e5e5ee]"
            >
              See pricing
            </Button>
          </div>

          <div className="mt-10 grid gap-3 text-left sm:grid-cols-2">
            <div className="rounded-2xl border border-[#ececf3] p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8a99]">
                Nexaflow AI
              </p>
              <p className="mt-1 font-extrabold">The strategy + build partner</p>
              <p className="mt-1 text-sm text-[#4b4b5a]">
                AI consulting and revenue engineering — the model, the build, the optimization.
              </p>
            </div>
            <div className="rounded-2xl border border-[#ececf3] p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8a99]">
                uply
              </p>
              <p className="mt-1 font-extrabold">The operating system layer</p>
              <p className="mt-1 text-sm text-[#4b4b5a]">
                ARIA agents, 95% payout, community, live commerce, storefront and analytics.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* SYSTEM COMPONENTS */}
      <section className="border-t border-[#f0f0f6] px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            One integrated <GradientText>system</GradientText>. Six working parts.
          </h2>
          <p className="mt-3 max-w-2xl text-[#4b4b5a]">
            Nothing here is sold as a standalone project. Each component feeds the next, and all of
            it runs inside UPLY where the revenue actually lands.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SYSTEM.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-[#ececf3] p-6 transition hover:shadow-md">
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-white"
                  style={{ backgroundImage: GRADIENT }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4b4b5a]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-[#f0f0f6] bg-[#fbfbfe] px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">How it works</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-[#ececf3] bg-white p-6">
                <p className="text-2xl font-extrabold">
                  <GradientText>{s.n}</GradientText>
                </p>
                <h3 className="mt-2 font-extrabold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4b4b5a]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="border-t border-[#f0f0f6] px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Who it's for</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: BadgeCheck,
                t: "Local businesses",
                d: "Storefronts and venues that need consistent demand and a presence people actually book from.",
              },
              {
                icon: BarChart3,
                t: "Service businesses",
                d: "Teams with a real offer and no reliable pipeline turning interest into signed clients.",
              },
              {
                icon: Sparkles,
                t: "Creators launching offers",
                d: "Audiences ready to buy a community, course, product or live experience — run on UPLY.",
              },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl border border-[#ececf3] p-6">
                <Icon className="h-5 w-5 text-[#3D7CFF]" />
                <h3 className="mt-3 font-extrabold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4b4b5a]">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-t border-[#f0f0f6] bg-[#fbfbfe] px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Build it once. <GradientText>Run it forever.</GradientText>
            </h2>
            <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-[#e5e5ee] bg-white p-1">
              {(["monthly", "annual"] as const).map((p) => {
                const active = (p === "annual") === annual;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAnnual(p === "annual")}
                    aria-pressed={active}
                    className={`min-h-[40px] rounded-full px-5 text-sm font-bold capitalize transition ${
                      active ? "text-white" : "text-[#4b4b5a]"
                    }`}
                    style={active ? { backgroundImage: GRADIENT } : undefined}
                  >
                    {p}
                    {p === "annual" && <span className="ml-1 text-xs font-semibold">· 2 months free</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {TIERS.map((t) => (
              <div
                key={t.key}
                className={`relative flex flex-col rounded-3xl bg-white p-7 ${
                  t.popular ? "border-2 border-transparent shadow-xl" : "border border-[#ececf3]"
                }`}
                style={
                  t.popular
                    ? {
                        backgroundImage: `linear-gradient(#fff,#fff), ${GRADIENT}`,
                        backgroundOrigin: "border-box",
                        backgroundClip: "padding-box, border-box",
                      }
                    : undefined
                }
              >
                {t.popular && (
                  <span
                    className="absolute -top-3 left-7 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white"
                    style={{ backgroundImage: GRADIENT }}
                  >
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-extrabold">{t.name}</h3>
                <div className="mt-4">
                  <p className="text-4xl font-extrabold tracking-tight">{priceLabel(t)}</p>
                  <p className="mt-1 text-sm text-[#4b4b5a]">
                    + ${t.setup.toLocaleString()} one-time setup
                  </p>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-[#26262f]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#B025FF]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7 space-y-2">
                  <Button
                    onClick={() => scrollToForm(t.key)}
                    className="h-12 w-full rounded-full border-0 text-white hover:opacity-90"
                    style={{ backgroundImage: GRADIENT }}
                  >
                    Apply / Book a strategy call
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => startCheckout(t.key)}
                    disabled={loadingTier === t.key}
                    className="h-12 w-full rounded-full border-[#e5e5ee]"
                  >
                    {loadingTier === t.key ? "Opening checkout…" : "Start now"}
                  </Button>
                  <p className="pt-1 text-center text-xs text-[#8a8a99]">
                    6-month minimum on monthly · annual paid upfront
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-[#f0f0f6] px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Questions</h2>
          <Accordion type="single" collapsible className="mt-6">
            {FAQ.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left font-bold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-[#4b4b5a]">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* LEAD FORM */}
      <section id="apply" className="border-t border-[#f0f0f6] bg-[#fbfbfe] px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-xl">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Apply for a <GradientText>strategy call</GradientText>
          </h2>
          <p className="mt-3 text-[#4b4b5a]">
            Tell us where you are now. Nexaflow AI reviews every application and responds within one
            business day.
          </p>

          {submitted ? (
            <div className="mt-8 rounded-2xl border border-[#ececf3] bg-white p-8 text-center">
              <p className="text-lg font-extrabold">Application received 🎉</p>
              <p className="mt-2 text-sm text-[#4b4b5a]">
                We'll reach out shortly to schedule your audit call.
              </p>
            </div>
          ) : (
            <form onSubmit={submitLead} className="mt-8 space-y-4 rounded-2xl border border-[#ececf3] bg-white p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pn-name">Name *</Label>
                  <Input
                    id="pn-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 text-base"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pn-business">Business</Label>
                  <Input
                    id="pn-business"
                    value={form.business}
                    onChange={(e) => setForm({ ...form, business: e.target.value })}
                    className="mt-1 text-base"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pn-email">Email *</Label>
                  <Input
                    id="pn-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1 text-base"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pn-phone">Phone</Label>
                  <Input
                    id="pn-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1 text-base"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Monthly revenue</Label>
                  <Select
                    value={form.monthly_revenue}
                    onValueChange={(v) => setForm({ ...form, monthly_revenue: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a range" />
                    </SelectTrigger>
                    <SelectContent>
                      {REVENUE_RANGES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Which tier</Label>
                  <Select
                    value={form.tier}
                    onValueChange={(v) => setForm({ ...form, tier: v as TierKey })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="growth">Growth Revenue System</SelectItem>
                      <SelectItem value="pro">Pro Revenue System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="h-12 w-full rounded-full border-0 text-white hover:opacity-90"
                style={{ backgroundImage: GRADIENT }}
              >
                {submitting ? "Sending…" : "Apply now"}
              </Button>
            </form>
          )}
        </div>
      </section>

      <footer className="border-t border-[#f0f0f6] px-5 py-10 text-center">
        <div className="flex items-center justify-center gap-3">
          <img src={uplyLogo} alt="UPLY" className="h-6 w-auto" />
          <span className="text-sm text-[#c9c9d1]">×</span>
          <span className="text-sm font-extrabold">Nexaflow AI</span>
        </div>
        <p className="mt-3 text-xs text-[#8a8a99]">
          © {new Date().getFullYear()} UPLY. Ad spend is billed separately by the advertising
          platforms. Results vary by market, offer and execution.
        </p>
      </footer>
    </div>
  );
}
