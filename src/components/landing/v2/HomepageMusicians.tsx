import SectionShell from "./SectionShell";
import FeatureCallout from "./FeatureCallout";

const FEATURES = [
  { emoji: "🎵", label: "Presave Campaigns", desc: "Spotify and Apple Music presaves — fans save your track before it drops." },
  { emoji: "🔒", label: "Fan Unlock Gates", desc: "Follow on Spotify, enter email, or share to unlock exclusive content." },
  { emoji: "🎁", label: "Contests & Giveaways", desc: "Fans enter and refer friends for more entries. Viral by design." },
  { emoji: "🔗", label: "SmartLinks", desc: "One URL, every platform, analytics by country. Permanent. Never breaks." },
  { emoji: "📢", label: "Ad Campaign Builder", desc: "Export Meta, TikTok, and Google briefs in one click. No ToneDen needed." },
];

export default function HomepageMusicians() {
  return (
    <SectionShell id="musicians" className="bg-background">
      {/* Subtle waveform bg */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.06]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0,hsl(var(--primary))_50%,transparent_100%)] [mask-image:repeating-linear-gradient(90deg,#000_0,#000_2px,transparent_2px,transparent_8px)]" />
      </div>
      <div className="relative">
        <div className="max-w-3xl mb-10">
          <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-4">
            Musicians & Artists
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Your music deserves a platform that doesn't disappear.
          </h2>
          <p className="text-base sm:text-lg text-foreground/70 leading-relaxed">
            ToneDen broke every presave link it ever created. Feature.fm charges $29/mo for a custom domain.
            Hypeddit charges for fan unlock gates. UPLY does all of it — free, permanently.
          </p>
        </div>

        <blockquote className="border-l-4 border-primary pl-5 py-3 mb-10 bg-card/40 rounded-r-lg max-w-3xl">
          <p className="text-foreground/90 italic">
            "ToneDen's domain expired in 2024. Every link they ever created broke overnight.
            UPLY links are permanent. We own our infrastructure."
          </p>
        </blockquote>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => <FeatureCallout key={f.label} {...f} />)}
        </div>
      </div>
    </SectionShell>
  );
}
