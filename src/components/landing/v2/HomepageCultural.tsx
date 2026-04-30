import SectionShell from "./SectionShell";

export default function HomepageCultural() {
  return (
    <SectionShell id="cultural" className="bg-background">
      <div className="absolute inset-0 pointer-events-none opacity-[0.07]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary))_0,transparent_60%)]" />
      </div>
      <div className="relative max-w-4xl">
        <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-4">
          Cultural & Diaspora Creators
        </div>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
          80 million Persian-speaking people.{" "}
          <span className="text-primary">Zero platforms built for them.</span>
        </h2>
        <div className="space-y-5 text-base sm:text-lg text-foreground/80 leading-relaxed">
          <p>
            The Persian diaspora spans Los Angeles, London, Toronto, Dubai, Stockholm, and Tehran.
            They watch the same artists. They attend the same concerts. They buy from the same creators.
            There has never been a platform that recognized them as a market.
          </p>
          <p>
            UPLY is building that infrastructure. Persian content is prioritized in discovery.
            Persian events are surfaced in the local feed. Creators can mark their content as Persian —
            and an audience of <span className="text-primary font-semibold">80 million</span> is waiting.
          </p>
          <p className="text-foreground/70">
            And it doesn't stop there. Every diaspora community deserves the same infrastructure —
            Latinx, South Asian, Arabic, African — wherever creators are connecting culture to commerce.
          </p>
        </div>
        <div className="mt-8 p-5 rounded-xl border-l-4 border-primary bg-card/30">
          <p className="text-foreground/90 text-sm sm:text-base">
            <span className="font-display font-bold text-foreground">BAZI Music</span> has produced
            some of the largest Persian concerts in North America. UPLY is built by the same team —
            for the same community, and every community like it globally.
          </p>
        </div>
      </div>
    </SectionShell>
  );
}
