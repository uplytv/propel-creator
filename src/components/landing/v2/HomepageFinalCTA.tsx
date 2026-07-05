import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function HomepageFinalCTA() {
  return (
    <section className="relative w-full min-h-[90svh] flex items-center justify-center px-4 sm:px-6 py-20 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[700px] max-h-[700px] rounded-full bg-primary/15 blur-[120px]" />
      </div>
      <div className="relative max-w-4xl mx-auto text-center">
        <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-tight mb-6">
          You weren't early to YouTube. You weren't early to Instagram.{" "}
          <span className="text-primary">You weren't early to TikTok Shop.</span>
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-foreground/70 max-w-3xl mx-auto leading-relaxed mb-8">
          Every platform that made creators rich — the ones who got there first won the biggest.
          UPLY is the creator operating system. The infrastructure. The one platform that does everything —
          and pays you like a partner, not a landlord.
        </p>
        <p className="text-foreground/60 mb-8">
          Beta is live. Founding creators are building now.
        </p>

        <Link to="/auth?mode=signup">
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_60px_hsl(var(--primary)/0.5)] font-bold text-base px-8 py-6 h-auto"
          >
            Claim Your Founding Creator Spot <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Link>

        <div className="mt-6 text-sm text-foreground/60 font-mono">uply.tv/founding</div>
        <p className="mt-6 text-sm text-primary font-semibold">
          100,000 creators and this offer closes. Forever.
        </p>
      </div>
    </section>
  );
}
