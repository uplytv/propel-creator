import SectionShell from "./SectionShell";
import { Check, X, Tv } from "lucide-react";

const ROWS: { label: string; twitch: string; kick: string; uply: string }[] = [
  { label: "Revenue split", twitch: "50% theirs", kick: "5% theirs", uply: "Free 3%; Pro/Studio 0%" },
  { label: "Simulcast", twitch: "❌ Banned", kick: "✅", uply: "✅ 8 platforms" },
  { label: "Roku / Fire TV", twitch: "View only", kick: "❌", uply: "✅ Full platform" },
  { label: "Courses", twitch: "❌", kick: "❌", uply: "✅" },
  { label: "Community", twitch: "❌", kick: "❌", uply: "✅" },
  { label: "Memberships", twitch: "❌", kick: "❌", uply: "✅" },
];

export default function HomepageStreamers() {
  return (
    <SectionShell id="streamers" className="bg-card/20">
      <div className="max-w-3xl mb-10">
        <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-4">
          Streamers
        </div>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
          Free: 3%. Pro and Studio: 0% UPLY fees. <span className="text-primary">And we put you on TV.</span>
        </h2>
      </div>

      {/* Comparison table */}
      <div className="rounded-2xl border border-border/50 bg-card/40 overflow-hidden mb-10">
        <div className="grid grid-cols-4 text-xs sm:text-sm">
          <div className="p-4 sm:p-5 font-semibold text-foreground/60 border-b border-border/50"></div>
          <div className="p-4 sm:p-5 font-display font-bold text-foreground/80 border-b border-border/50">Twitch</div>
          <div className="p-4 sm:p-5 font-display font-bold text-foreground/80 border-b border-border/50">Kick</div>
          <div className="p-4 sm:p-5 font-display font-bold text-primary border-b border-border/50 bg-primary/5">UPLY</div>
          {ROWS.map((row, i) => (
            <div key={row.label} className="contents">
              <div className={`p-4 sm:p-5 text-foreground/80 font-medium ${i < ROWS.length - 1 ? "border-b border-border/30" : ""}`}>{row.label}</div>
              <div className={`p-4 sm:p-5 text-foreground/70 ${i < ROWS.length - 1 ? "border-b border-border/30" : ""}`}>{row.twitch}</div>
              <div className={`p-4 sm:p-5 text-foreground/70 ${i < ROWS.length - 1 ? "border-b border-border/30" : ""}`}>{row.kick}</div>
              <div className={`p-4 sm:p-5 text-primary font-semibold bg-primary/5 ${i < ROWS.length - 1 ? "border-b border-border/30" : ""}`}>{row.uply}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 p-5 rounded-xl border border-border/40 bg-card/30">
        <Tv className="w-8 h-8 text-primary shrink-0" />
        <div>
          <div className="font-display font-bold text-foreground">Roku · Fire TV · LG Channels</div>
          <div className="text-sm text-foreground/70">300M households. Skool isn't there. Kajabi isn't there. You are.</div>
        </div>
      </div>

      <p className="text-base sm:text-lg text-foreground/80 leading-relaxed max-w-4xl">
        Go live and simultaneously broadcast to YouTube, TikTok, Instagram, Facebook, X, LinkedIn, Kick, and Twitch.
        Pick <span className="text-foreground font-semibold">landscape</span> for Twitch-style pro streams or <span className="text-foreground font-semibold">portrait</span> for TikTok. No switching mid-stream, no dropped connections.
      </p>

      <div className="grid grid-cols-2 gap-4 mt-6 max-w-md">
        <div className="aspect-video rounded-lg border border-border/50 bg-card/40 flex items-center justify-center text-xs text-foreground/60">
          <span><Check className="inline w-3 h-3 text-primary mr-1" />Landscape</span>
        </div>
        <div className="aspect-[9/16] rounded-lg border border-border/50 bg-card/40 flex items-center justify-center text-xs text-foreground/60 max-h-32">
          <span><Check className="inline w-3 h-3 text-primary mr-1" />Portrait</span>
        </div>
      </div>
    </SectionShell>
  );
}
