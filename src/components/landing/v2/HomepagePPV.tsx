import { Link } from "react-router-dom";
import { DollarSign, Globe, Lock, ArrowRight } from "lucide-react";

const FEATURES = [
  { icon: DollarSign, t: "Keep 95%", b: "Instant payouts on every pass." },
  { icon: Globe, t: "Watch anywhere", b: "HD to phone, web, and Roku TV." },
  { icon: Lock, t: "Secure paywall", b: "Only paying fans get in." },
];

export default function HomepagePPV() {
  return (
    <section id="ppv" className="relative px-4 py-20 sm:py-28">
      <div className="max-w-5xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl border border-gold-hairline bg-card/50 backdrop-blur-md p-8 sm:p-12">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute right-0 top-0 w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] rounded-full bg-primary/10 blur-[110px]" />
          </div>
          <div className="relative z-10 grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="eyebrow-gold inline-flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" /> New · Pay-Per-View Live
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Charge fans to watch you{" "}
                <span className="bg-gradient-to-r from-[hsl(220_100%_62%)] to-[hsl(280_85%_60%)] bg-clip-text text-transparent">live.</span>
              </h2>
              <p className="text-foreground/75 mt-3 max-w-md">
                Sell pay-per-view passes to concerts, workshops, and events. Any price, any screen —
                and you keep <span className="text-gold font-semibold">95%</span>.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Link to="/ppv" className="btn-primary-glow inline-flex items-center justify-center gap-1.5 rounded-md px-6 h-11 text-sm font-bold">
                  Explore PPV <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/auth" className="btn-gold-outline inline-flex items-center justify-center gap-1.5 rounded-md px-6 h-11 text-sm font-bold">
                  Start streaming
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {FEATURES.map((f) => (
                <div key={f.t} className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-4">
                  <div className="w-9 h-9 rounded-lg bg-[hsl(var(--gold)/0.12)] text-gold flex items-center justify-center shrink-0">
                    <f.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{f.t}</p>
                    <p className="text-xs text-muted-foreground">{f.b}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
