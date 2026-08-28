import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import uplyLogo from "@/assets/logo.png";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  Check,
  FileSignature,
  Globe,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Repeat,
  Search,
  Settings2,
  Target,
  UserCheck,
  Zap,
} from "lucide-react";

/**
 * Uply AI Growth Systems — public services landing page.
 * Route: /services (with /agency redirecting here).
 * Light UPLY brand: white canvas, blue→purple gradient accents.
 * No auth, no app chrome. Designed for mobile-first brochure QR scans.
 */

const GRADIENT = "linear-gradient(90deg,#3D7CFF 0%,#B025FF 100%)";

const PIPELINE = [
  {
    icon: Search,
    title: "Search",
    caption: "They find you on Google when the need is real.",
  },
  {
    icon: Phone,
    title: "Call",
    caption: "AI answers 24/7, books appointments, and takes messages.",
  },
  {
    icon: MessageSquare,
    title: "Follow-Up",
    caption: "Automatic texts keep leads warm until they're ready.",
  },
  {
    icon: Calendar,
    title: "Appointment",
    caption: "Reminders reduce no-shows and protect your calendar.",
  },
  {
    icon: UserCheck,
    title: "Customer",
    caption: "Reviews turn one visit into a repeat customer.",
  },
];

const SERVICES = [
  {
    icon: Bot,
    title: "24/7 AI Receptionist",
    body: "Never miss another call. AI answers, qualifies, and books around the clock.",
  },
  {
    icon: Globe,
    title: "Conversion-First Website",
    body: "Built to book, not just look good. Mobile-optimized with clear calls to action.",
  },
  {
    icon: MapPin,
    title: "Local SEO + Google",
    body: "Own the map when customers search. Google Business Profile and local rankings.",
  },
  {
    icon: Target,
    title: "Paid Lead Acquisition",
    body: "Funnels for your highest-value services. Google + Meta ads that pay for themselves.",
  },
  {
    icon: Repeat,
    title: "Automated Follow-Up",
    body: "No lead ever goes cold. SMS and email sequences run on autopilot.",
  },
  {
    icon: BarChart3,
    title: "Growth Reporting",
    body: "See exactly what's working. Calls, leads, bookings, and ROI in one dashboard.",
  },
];

type TierKey = "foundation" | "growth" | "scale";

const TIERS: {
  key: TierKey;
  name: string;
  setup: number;
  monthly: number;
  popular?: boolean;
  headline: string;
  features: string[];
}[] = [
  {
    key: "foundation",
    name: "Foundation",
    setup: 2500,
    monthly: 997,
    headline: "Build the infrastructure to convert the customers already looking for you.",
    features: [
      "Professional website",
      "Mobile optimization",
      "Core service pages",
      "Local SEO foundation",
      "Google Business Profile optimization",
      "Lead capture system",
      "Analytics + tracking",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    setup: 5000,
    monthly: 1997,
    popular: true,
    headline: "Your full customer-acquisition engine — traffic, capture, and automated follow-up.",
    features: [
      "Everything in Foundation",
      "AI receptionist + missed-call automation",
      "SMS + email follow-up sequences",
      "Advanced local SEO",
      "Review-generation system",
      "High-value service landing pages",
      "CRM / pipeline setup",
      "Google Ads setup + conversion tracking",
    ],
  },
  {
    key: "scale",
    name: "AI Scale",
    setup: 7500,
    monthly: 2997,
    headline: "Full marketing + AI automation — the complete system for market leadership.",
    features: [
      "Everything in Growth",
      "Advanced AI receptionist workflows",
      "Google + Meta advertising",
      "High-value service funnels",
      "Lead reactivation campaigns",
      "Advanced SEO + competitor analysis",
      "Custom reporting dashboard",
      "Priority strategy + support",
    ],
  },
];

const BILLING_STEPS = [
  {
    icon: FileSignature,
    n: "1",
    title: "Sign",
    body: "Approve scope + agreement so we know exactly what we're building.",
  },
  {
    icon: Settings2,
    n: "2",
    title: "Setup",
    body: "Implementation fee is paid before work begins. Then we build.",
  },
  {
    icon: Zap,
    n: "3",
    title: "Autopay",
    body: "Monthly retainer begins after launch / onboarding is complete.",
  },
  {
    icon: TrendingUpIcon,
    n: "4",
    title: "Grow",
    body: "We manage, report, and optimize — you focus on running your business.",
  },
];

// Lucide doesn't export a plain upward-trend icon named exactly; alias BarChart3 for the Grow step.
function TrendingUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return <BarChart3 {...props} />;
}

function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-clip-text text-transparent" style={{ backgroundImage: GRADIENT }}>
      {children}
    </span>
  );
}

function ContactButtons({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${className}`}>
      <Button
        size="lg"
        asChild
        className="h-12 rounded-full border-0 text-white hover:opacity-90"
        style={{ backgroundImage: GRADIENT }}
      >
        <a href="tel:2026040813">
          <Phone className="mr-2 h-4 w-4" />
          Call / Text 202-604-0813
        </a>
      </Button>
      <Button
        size="lg"
        variant="outline"
        asChild
        className="h-12 rounded-full border-[#e5e5ee]"
      >
        <a href="mailto:Arian@uplyads.com">
          <Mail className="mr-2 h-4 w-4" />
          Email Us
        </a>
      </Button>
    </div>
  );
}

export default function Services() {
  return (
    <div className="min-h-screen bg-white text-[#0b0b0f] font-sans">
      <SEOHead
        title="AI Growth Systems for Local Businesses | Uply LLC"
        description="Uply AI Growth Systems builds websites, local SEO, paid ads, and AI automation that answers every call, captures every lead, and follows up automatically."
        canonicalUrl="https://uply.tv/services"
      />

      {/* Header */}
      <header className="relative z-10 border-b border-[#f0f0f6] bg-white/80 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src={uplyLogo} alt="UPLY" className="h-8 w-auto" />
            <span className="text-sm font-extrabold tracking-tight">AI Growth Systems</span>
          </a>
          <a
            href="tel:2026040813"
            className="rounded-full px-4 py-2 text-sm font-bold text-white"
            style={{ backgroundImage: GRADIENT }}
          >
            202-604-0813
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden px-5 pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-[0.18] blur-[110px]"
          style={{ background: GRADIENT }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-block rounded-full border border-[#ececf3] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#6b6b7b]">
            UPLY — AI GROWTH SYSTEMS
          </p>

          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Your business closes at 5. <GradientText>Your growth system doesn't.</GradientText>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base text-[#4b4b5a] sm:text-lg">
            We build websites, local SEO, paid ads, and AI automation systems that answer every
            call, capture every lead, and follow up automatically — so more opportunities become
            booked appointments.
          </p>

          <ContactButtons className="mt-8 justify-center" />
        </div>
      </section>

      {/* PIPELINE */}
      <section className="border-t border-[#f0f0f6] bg-[#fbfbfe] px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-stretch justify-center gap-4 sm:gap-6">
            {PIPELINE.map((step, idx) => (
              <div key={step.title} className="flex items-center gap-4 sm:gap-6">
                <div className="flex w-36 flex-col items-center text-center sm:w-40">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md"
                    style={{ backgroundImage: GRADIENT }}
                  >
                    <step.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 font-extrabold">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#4b4b5a]">{step.caption}</p>
                </div>
                {idx < PIPELINE.length - 1 && (
                  <ArrowRight className="hidden h-4 w-4 text-[#c9c9d1] sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="border-t border-[#f0f0f6] px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Six services. <GradientText>One growth system.</GradientText>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[#4b4b5a]">
              Each piece works together so you stop leaking leads and start booking more.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-[#ececf3] p-6 transition hover:shadow-md"
              >
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

      {/* PRICING */}
      <section id="pricing" className="border-t border-[#f0f0f6] bg-[#fbfbfe] px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Pricing that's <GradientText>built for ROI.</GradientText>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[#4b4b5a]">
              One-time setup to build the system. Monthly retainer to run and optimize it.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {TIERS.map((t) => (
              <div
                key={t.key}
                className={`relative flex flex-col rounded-3xl bg-white p-7 ${
                  t.popular
                    ? "border-2 border-transparent shadow-xl"
                    : "border border-[#ececf3]"
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
                <p className="mt-2 text-sm text-[#4b4b5a]">{t.headline}</p>

                <div className="mt-5">
                  <p className="text-4xl font-extrabold tracking-tight">${t.monthly.toLocaleString()}</p>
                  <p className="text-sm text-[#6b6b7b]">/month ongoing</p>
                  <p className="mt-2 text-sm font-semibold text-[#26262f]">
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

                <div className="mt-7">
                  <Button
                    asChild
                    className="h-12 w-full rounded-full border-0 text-white hover:opacity-90"
                    style={{ backgroundImage: GRADIENT }}
                  >
                    <a href="tel:2026040813">
                      <Phone className="mr-2 h-4 w-4" />
                      Call to get started
                    </a>
                  </Button>
                  <p className="mt-2 text-center text-xs text-[#8a8a99]">
                    Setup due before work begins · Monthly retainer after launch
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW BILLING WORKS */}
      <section className="border-t border-[#f0f0f6] px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
            How billing works
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BILLING_STEPS.map(({ icon: Icon, n, title, body }) => (
              <div key={title} className="rounded-2xl border border-[#ececf3] p-6">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ backgroundImage: GRADIENT }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-extrabold text-[#e5e5ee]">{n}</p>
                </div>
                <h3 className="mt-4 font-extrabold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4b4b5a]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="border-t border-[#f0f0f6] bg-[#fbfbfe] px-5 py-16 sm:py-20">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl px-6 py-12 text-center text-white sm:px-12 sm:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: GRADIENT }}
          />
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Book your free growth audit
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-white/90 sm:text-lg">
              We'll show you exactly what we'd fix first — no pitch, no pressure.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                asChild
                variant="secondary"
                className="h-12 rounded-full bg-white text-[#0b0b0f] hover:bg-white/90"
              >
                <a href="tel:2026040813">
                  <Phone className="mr-2 h-4 w-4" />
                  Call / Text 202-604-0813
                </a>
              </Button>
              <Button
                size="lg"
                asChild
                variant="outline"
                className="h-12 rounded-full border-white/40 text-white hover:bg-white/10"
              >
                <a href="mailto:Arian@uplyads.com">
                  <Mail className="mr-2 h-4 w-4" />
                  Email Us
                </a>
              </Button>
            </div>
            <p className="relative mt-6 text-sm text-white/80">
              Uply LLC — Arian & Amir · 202-604-0813 · Arian@uplyads.com
            </p>
          </div>
        </div>
      </section>

      {/* FINE PRINT */}
      <footer className="border-t border-[#f0f0f6] px-5 py-10">
        <div className="mx-auto max-w-5xl text-center">
          <img src={uplyLogo} alt="UPLY" className="mx-auto mb-4 h-8 w-auto" />
          <p className="text-xs leading-relaxed text-[#8a8a99]">
            Pricing reflects the stated scope and may change for complex integrations or unusually
            competitive markets. Advertising spend, premium third-party software and usage fees are
            separate unless included in writing. We do not guarantee specific revenue, lead volume or
            search rankings; results depend on market conditions, offer, budget, sales process and
            execution.
          </p>
          <p className="mt-4 text-xs text-[#8a8a99]">
            © {new Date().getFullYear()} Uply LLC. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
