import SectionShell from "./SectionShell";
import FeatureCallout from "./FeatureCallout";

const FEATURES = [
  { emoji: "⚡", label: "Flash Sales", desc: "Drop a product live with a 60-second countdown overlay." },
  { emoji: "🛒", label: "Live Commerce Overlay", desc: "Viewers buy without leaving the stream." },
  { emoji: "📦", label: "Digital Products", desc: "Sell PDFs, templates, downloads with instant delivery." },
  { emoji: "💳", label: "Stripe Connect", desc: "5% UPLY sale fee plus Stripe processing." },
  { emoji: "🎯", label: "Membership Gating", desc: "Exclusive drops for paying members only." },
];

const TAKES = [
  { name: "TikTok Shop", rate: "8%" },
  { name: "Amazon Live", rate: "Cut" },
  { name: "Whatnot", rate: "8%" },
  { name: "UPLY", rate: "5%", highlight: true },
];

export default function HomepageLiveCommerce() {
  return (
    <SectionShell id="commerce" className="bg-card/20">
      <div className="max-w-3xl mb-10">
        <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-4">
          Live Commerce & Retail
        </div>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
          The live shopping revolution is here.{" "}
          <span className="text-primary">Your margin shouldn't fund the platform.</span>
        </h2>
        <p className="text-base sm:text-lg text-foreground/70 leading-relaxed">
          TikTok Shop takes 8%. Amazon Live takes a cut. Whatnot takes 8%. Your audience is loyal , they don't need a marketplace algorithm to find you. They need a checkout button while you're live.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {TAKES.map((t) => (
          <div
            key={t.name}
            className={`rounded-xl p-4 text-center border ${
              t.highlight
                ? "border-primary bg-primary/10"
                : "border-border/50 bg-card/30"
            }`}
          >
            <div className={`text-xs ${t.highlight ? "text-primary" : "text-foreground/60"} mb-1`}>{t.name}</div>
            <div className={`font-display text-2xl font-bold ${t.highlight ? "text-primary" : "text-foreground/80"}`}>{t.rate}</div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {FEATURES.map((f) => <FeatureCallout key={f.label} {...f} />)}
      </div>

      <p className="text-foreground/70 italic max-w-2xl">
        "Your audience watches you for you. The platform should get out of the way."
      </p>
    </SectionShell>
  );
}
