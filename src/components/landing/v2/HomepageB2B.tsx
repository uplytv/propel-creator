import SectionShell from "./SectionShell";
import FeatureCallout from "./FeatureCallout";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { emoji: "🏗️", label: "White-Label Platform", desc: "Full UPLY stack with your branding." },
  { emoji: "🎙️", label: "Podcast Hosting", desc: "iTunes-compatible RSS — Spotify and Apple submission." },
  { emoji: "📺", label: "TV Channel", desc: "Roku and Fire TV channel under your brand." },
  { emoji: "📊", label: "Network Analytics", desc: "Dashboard across all creators in your network." },
  { emoji: "🤝", label: "Jobs Marketplace", desc: "Connect brands with creators directly." },
  { emoji: "🔐", label: "Admin Dashboard", desc: "Creator management, payouts, content controls." },
];

export default function HomepageB2B() {
  return (
    <SectionShell id="b2b" className="bg-card/20">
      <div className="max-w-3xl mb-10">
        <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-4">
          B2B & Enterprise
        </div>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
          Your media company needs creator infrastructure. <span className="text-primary">We built it.</span>
        </h2>
        <p className="text-base sm:text-lg text-foreground/70 leading-relaxed">
          UPLY is the <span className="text-foreground font-semibold">Informatica of the creator economy</span> —
          the infrastructure layer, not another app. Media companies, talent agencies, record labels, and brand
          networks can license UPLY's entire stack as white-label creator infrastructure.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {FEATURES.map((f) => <FeatureCallout key={f.label} {...f} />)}
      </div>

      <a href="mailto:partners@uply.tv">
        <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10">
          Contact us for white-label pricing →
        </Button>
      </a>
    </SectionShell>
  );
}
