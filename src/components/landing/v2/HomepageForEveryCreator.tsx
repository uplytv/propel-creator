import { Link } from "react-router-dom";
import { Music2, Radio, GraduationCap, ShoppingBag, Ticket, Tv, ArrowRight } from "lucide-react";

// One compact section replacing the nine persona sections (Musicians, Streamers,
// Educators, LiveCommerce, Events, TV, Cultural, B2B, …) — same message, one screen.
const PERSONAS = [
  { icon: Music2, title: "Musicians", line: "Drop music, sell tracks and tickets — AI handles the promo." },
  { icon: Radio, title: "Streamers", line: "Go live in HD with tips, subs and pay-per-view." },
  { icon: GraduationCap, title: "Educators", line: "Courses, classroom and community in one place." },
  { icon: ShoppingBag, title: "Sellers", line: "Live shopping, products and instant checkout." },
  { icon: Ticket, title: "Event creators", line: "Tickets, QR check-in and PPV livestreams." },
  { icon: Tv, title: "Shows & TV", line: "Put your content on the big screen with UPLY TV." },
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
          <p className="text-foreground/70 mt-3 max-w-xl mx-auto">
            Whatever you make, UPLY runs the business side — AI-powered tools for content, growth, and sales.
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
          <Link
            to="/auth?mode=signup"
            className="btn-primary-glow inline-flex items-center justify-center gap-1.5 rounded-md px-8 h-12 text-sm font-bold tracking-wide"
          >
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-muted-foreground mt-3">Free to start. No card required.</p>
        </div>
      </div>
    </section>
  );
}
