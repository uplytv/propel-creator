import SectionShell from "./SectionShell";
import FeatureCallout from "./FeatureCallout";

const FEATURES = [
  { emoji: "📚", label: "Courses + Classroom", desc: "Modules, lessons, progress tracking, completion certificates." },
  { emoji: "🏘️", label: "Community", desc: "Skool-style spaces with leaderboards, member directory, events, calendar." },
  { emoji: "🎯", label: "Content Gating", desc: "Free tier, paid tier, or individual lesson unlocks." },
  { emoji: "🤖", label: "ARIA AI Growth Plan", desc: "Personalized 30/60/90-day strategy based on your goals and KPIs." },
  { emoji: "📧", label: "Email Broadcasts", desc: "Blast your entire member list from inside UPLY." },
  { emoji: "📊", label: "Analytics", desc: "Who's completing lessons, where they drop off, what drives revenue." },
];

export default function HomepageEducators() {
  return (
    <SectionShell id="educators" className="bg-background">
      <div className="max-w-3xl mb-10">
        <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-4">
          Educators & Course Creators
        </div>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
          Community and courses on Free. <span className="text-primary">Pro adds ARIA AI for $99/month.</span>
        </h2>
        <p className="text-base sm:text-lg text-foreground/70 leading-relaxed">
          Your knowledge is the product. The platform should be infrastructure , not a partner taking 12–15% of every sale you make.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-6 sm:p-8 mb-10 max-w-3xl">
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-2">The Math</div>
        <p className="font-display text-xl sm:text-2xl text-foreground leading-snug">
          Free $0/month + 3% UPLY fee. Pro $99/month and Studio $249/month + 0% UPLY fee. Stripe processing extra.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f) => <FeatureCallout key={f.label} {...f} />)}
      </div>
    </SectionShell>
  );
}
