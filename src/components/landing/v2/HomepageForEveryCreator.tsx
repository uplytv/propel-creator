import { Music2, Radio, GraduationCap, ShoppingBag, Ticket, Tv, ArrowRight } from "lucide-react";
import { TRIAL_CARD_PROMISE } from "@/components/pricing/plans";

// One compact section replacing the nine persona sections (Musicians, Streamers,
// Educators, LiveCommerce, Events, TV, Cultural, B2B, …) — same message, one screen.
const PERSONAS = [
  { icon: Music2, title: "Musicians", line: "Sell tracks and tickets. You keep 95%." },
  { icon: Radio, title: "Streamers", line: "Tips on every plan. Pay-per-view on Unlimited and Agency Pro." },
  { icon: GraduationCap, title: "Educators", line: "Courses and community on every plan." },
  { icon: ShoppingBag, title: "Sellers", line: "Sell a product while you stream." },
  { icon: Ticket, title: "Event creators", line: "Tickets on every plan. QR check-in on Unlimited and Agency Pro." },
  { icon: Tv, title: "Shows", line: "A live show fans pay to watch." },
];

export default function HomepageForEveryCreator() {
  return (
    <section className="relative px-4 py-20 sm:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="eyebrow-gold mb-2">Built for you</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            One platform. Every way you{" "}
            <span className="bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-mid))] bg-clip-text text-transparent">create.</span>
          </h2>
          <p className="text-foreground/80 mt-3 max-w-xl mx-auto">
            Sell it here. You keep 95% of what fans pay. Stripe fees are separate.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {PERSONAS.map((p) => (
            <div key={p.title} className="rounded-xl border border-border bg-card p-5 shadow-[var(--card-shadow)]">
              <p.icon className="w-5 h-5 text-primary mb-3" />
              <h3 className="font-bold text-foreground mb-1">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.line}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <a
            href="#pricing"
            className="btn-primary-glow inline-flex items-center justify-center gap-1.5 rounded-md px-8 h-12 text-sm font-bold tracking-wide"
          >
            See plans <ArrowRight className="w-4 h-4" aria-hidden />
          </a>
          <p className="text-sm text-foreground/80 mt-3 max-w-lg mx-auto">{TRIAL_CARD_PROMISE}</p>
        </div>
      </div>
    </section>
  );
}
