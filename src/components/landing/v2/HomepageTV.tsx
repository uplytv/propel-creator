import SectionShell from "./SectionShell";
import { Tv } from "lucide-react";

export default function HomepageTV() {
  return (
    <SectionShell id="tv" className="bg-gradient-to-b from-background via-card/30 to-background">
      <div className="text-center max-w-4xl mx-auto">
        <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-4">
          TV Distribution
        </div>
        <h2 className="font-display text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
          Your content. <span className="text-primary">On the biggest screen in the house.</span>
        </h2>

        {/* TV mockup */}
        <div className="relative mx-auto my-10 max-w-3xl">
          <div className="rounded-2xl border-[10px] border-foreground/20 bg-card overflow-hidden shadow-[0_0_80px_hsl(var(--primary)/0.25)]">
            <div className="aspect-video bg-gradient-to-br from-primary/30 via-background to-background flex items-center justify-center">
              <div className="text-center">
                <Tv className="w-16 h-16 text-primary mx-auto mb-3" />
                <div className="font-display text-2xl sm:text-4xl font-bold text-foreground">UPLY on TV</div>
                <div className="text-foreground/60 text-sm mt-1">Live streams · Courses · Community · Events</div>
              </div>
            </div>
          </div>
          <div className="mx-auto mt-2 h-2 w-32 bg-foreground/20 rounded-b-lg" />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-8">
          {["Roku", "Amazon Fire TV", "LG Channels"].map((p) => (
            <div key={p} className="px-4 py-2 rounded-full border border-border/50 bg-card/40 text-foreground/80 text-sm font-semibold">
              {p}
            </div>
          ))}
          <div className="px-4 py-2 rounded-full bg-primary/15 border border-primary/40 text-primary text-sm font-bold">
            300M households
          </div>
        </div>

        <p className="text-base sm:text-lg text-foreground/70 max-w-2xl mx-auto leading-relaxed">
          The first creator platform on living room TV. Skool isn't here. Kajabi isn't here. Patreon isn't here.
          <span className="text-foreground font-semibold"> You are.</span>
        </p>

        <p className="text-sm text-foreground/50 mt-4 italic">
          Zero-layer distribution. Publish once on UPLY. Reach everywhere.
        </p>
      </div>
    </SectionShell>
  );
}
