import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { X, Info, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Display count logic ──
const HARDCODED_FALLBACK = 24200;

function formatCount(count: number): string {
  return count.toLocaleString();
}

function getDisplayCount(effectiveCount: number): { display: string; isEarly: boolean } {
  if (effectiveCount < 100000) return { display: formatCount(effectiveCount), isEarly: true };
  if (effectiveCount < 1000000) return { display: formatCount(effectiveCount), isEarly: false };
  return { display: (effectiveCount / 1000000).toFixed(1) + "M", isEarly: false };
}

// ── Milestones ──
interface Milestone {
  count: number;
  label: string;
  unlock: string;
  detail: string;
  context: string;
  reward_type: string;
  is_unlocked: boolean;
  urgency?: boolean;
  prize_line?: string;
  judging?: string;
  logistics?: string;
  deal_details?: string;
}

const milestones: Milestone[] = [
  {
    count: 10000, label: "10K", unlock: "ARIA gets smarter",
    detail: "Every creator makes ARIA better for everyone — more data means stronger AI recommendations, better content suggestions, and smarter growth strategies across the entire platform.",
    context: "Already unlocked ✓", reward_type: "platform", is_unlocked: true,
  },
  {
    count: 100000, label: "100K", unlock: "$100K cash + Rolex Submariner",
    detail: "UPLY awards the top creator $100,000 cash and a Rolex Submariner delivered to their door. The ultimate reward for helping build the platform from the ground up. The window closes the moment UPLY hits 100K and never reopens.",
    context: "This window closes permanently at 100K", reward_type: "money", is_unlocked: false,
    prize_line: "$100K cash + Rolex Submariner",
  },
  {
    count: 500000, label: "500K", unlock: "Unlock Creator Fund + pass Skool",
    detail: "The UPLY Creator Fund opens — direct funding for creators building on the platform. At the same time UPLY officially surpasses Skool's estimated total user base making it the largest independent creator community platform in the world. Every founding creator receives a permanent Founding Pioneer badge.",
    context: "Creator Fund unlocks • Skool estimated at ~500K total users", reward_type: "status", is_unlocked: false,
  },
  {
    count: 1000000, label: "1M", unlock: "Founding Rate Lock + Founding Creator forever",
    detail: "Every creator who joined before 1M locks in the Founding Rate — their 95% payout is guaranteed for life — and earns Founding Creator status: priority support, exclusive badges, and early access to every future feature. The window closes the moment UPLY hits 1M and never reopens.",
    context: "This window closes permanently at 1M", reward_type: "urgency", urgency: true, is_unlocked: false,
  },
  {
    count: 10000000, label: "10M", unlock: "The UPLY Awards — fly to Vegas, sign a deal, drive home in a supercar",
    detail: "At 10M creators UPLY launches its annual Awards — a live ceremony celebrating the world's top creators. The Creator of the Year wins a supercar of their choice up to $300,000, an all-expenses-paid trip for two to the Aria Hotel in Las Vegas, a 12-month UPLY Creator Partnership worth $50,000 in promotional value, and a professional film crew documenting every moment of the experience. This is not a prize. This is a career-defining moment.",
    context: "Annual event. Annual supercar. Annual deal. Every year.", reward_type: "supercar",
    prize_line: "Supercar up to $300K + Aria Las Vegas + $50K Partnership Deal",
    judging: "40% revenue growth · 30% community engagement · 30% member votes",
    logistics: "Round-trip flights for winner + guest · 3 nights Aria Hotel · All meals included · Professional film crew provided",
    deal_details: "12-month featured creator partnership · Priority platform support · $50K in co-marketing from UPLY · Content ownership stays with the creator",
    is_unlocked: false,
  },
  {
    count: 100000000, label: "100M", unlock: "IPO",
    detail: "UPLY goes public. 100 million creators on the platform — the largest creator economy company in history takes the next step. Every founding creator who believed from the beginning helped build this. The mission is complete.",
    context: "100M creators • UPLY goes public", reward_type: "mission", is_unlocked: false,
  },
];

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

// ── Ticker ──
interface TickerItem { name: string; type: string; ago: string; }

function formatTimeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function privacyName(name: string | null) {
  if (!name) return "A creator";
  const parts = name.trim().split(" ");
  if (parts.length < 2) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

const PLACEHOLDER_ITEMS: TickerItem[] = [
  { name: "A creator from Virginia", type: "Music", ago: "just now" },
  { name: "A creator from Los Angeles", type: "Fitness", ago: "2m ago" },
  { name: "A creator from London", type: "Art", ago: "5m ago" },
];

// ── Reward badge config ──
const REWARD_BADGES: Record<string, { emoji: string; label: string; bg: string; border: string; text: string }> = {
  platform: { emoji: "⚡", label: "Platform", bg: "rgba(99,102,241,0.15)", border: "rgba(99,102,241,0.4)", text: "#818CF8" },
  money: { emoji: "💰", label: "Cash Prize", bg: "rgba(61, 124, 255,0.12)", border: "rgba(61, 124, 255,0.4)", text: "hsl(var(--primary))" },
  status: { emoji: "🏆", label: "Status", bg: "rgba(255,215,0,0.12)", border: "rgba(255,215,0,0.4)", text: "#FFD700" },
  urgency: { emoji: "⚡", label: "Closes at 1M", bg: "rgba(220,38,38,0.15)", border: "rgba(220,38,38,0.5)", text: "#FF4444" },
  
  supercar: { emoji: "🏎️", label: "UPLY Awards", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.4)", text: "#FB923C" },
  mission: { emoji: "👑", label: "Mission", bg: "rgba(255,215,0,0.15)", border: "rgba(255,215,0,0.5)", text: "#FFD700" },
};

// ── Share Modal ──
function ShareModal({ displayCount, effectiveCount, onClose }: { displayCount: string; effectiveCount: number; onClose: () => void }) {
  const isMobile = useIsMobile();
  const past1M = effectiveCount >= 1000000;

  const shareText = past1M
    ? `I was on @uplyTV before 1M creators.\n\nFounding Rate Lock — 95% payout for life ✓\nEntered for the $10K + Rolex at 5M ✓\nEligible for the supercar + Vegas + deal at 10M ✓\n\nWindow closed. I got in.\n\nuply.tv`
    : `I joined @uplyTV before 1M creators.\n\nFounding Rate Lock — 95% payout for life.\n\nAt 5M: $10K cash + Rolex 🏆\nAt 10M: supercar up to $300K + Vegas + $50K deal 🏎️\n\nWindow still open → uply.tv`;

  const handleShare = async () => {
    const fullContent = shareText + "\n\nhttps://uply.tv";
    // Always try native share sheet first (shows app picker on mobile & supported desktops)
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "I joined UPLY before 1M creators",
          text: shareText,
          url: "https://uply.tv",
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to copy
      }
    }
    // Fallback: copy to clipboard
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(fullContent);
        toast.success("Copied to clipboard — paste it anywhere 📋");
        return;
      } catch {
        // Clipboard failed — fall through
      }
    }
    // Last resort: open Twitter intent
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-foreground font-heading text-center text-[18px]" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
            Share before the window closes
          </DialogTitle>
        </DialogHeader>
        {/* Preview card */}
        <div className="mx-auto mb-5 w-full max-w-[480px] rounded-[10px] overflow-hidden flex flex-col items-center justify-center text-center p-6"
          style={{ background: "#0A0A0A", border: "1px solid hsl(var(--primary))" }}>
          {/* UPLY logo mark */}
          <p className="text-[32px] font-extrabold font-heading text-foreground mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>U</p>
          {past1M ? (
            <>
              <p className="text-[20px] font-extrabold text-primary font-heading" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>I was here before 1M.</p>
              <p className="text-[13px] text-foreground mt-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Founding Rate Lock — 95% payout for life.</p>
              <p className="text-[13px] text-primary mt-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>uply.tv</p>
            </>
          ) : (
            <>
              <p className="text-[20px] font-extrabold text-primary font-heading" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>I joined before 1M.</p>
              <p className="text-[13px] text-foreground mt-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>The Founding Rate Lock window<br />is still open.</p>
              <p className="text-[12px] text-muted-foreground mt-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>+{displayCount} creators so far.</p>
              <p className="text-[13px] text-primary mt-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>uply.tv — invite only.</p>
            </>
          )}
        </div>
        {/* Single share button */}
        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 text-[15px] font-bold transition-opacity hover:opacity-90 active:scale-[0.97]"
          style={{
            height: 48,
            borderRadius: 6,
            background: "hsl(var(--primary))",
            color: "#000",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
          }}
        >
          Share UPLY <ChevronRight className="w-4 h-4" />
        </button>
      </DialogContent>
    </Dialog>
  );
}

function AwardsModal({ onClose }: { onClose: () => void }) {
  const categories = [
    { name: "🏆 Creator of the Year", special: "gold" },
    { name: "🔴 Best Live Streamer" },
    { name: "👥 Community Builder of the Year" },
    { name: "📈 Most Growth" },
    { name: "📚 Best Course" },
    { name: "❤️ Fan Favorite" },
    { name: "🌱 Rising Creator" },
    { name: "🤝 Best Collab" },
    { name: "💡 Most Innovative" },
    { name: "👑 UPLY OG", special: "og" },
  ];

  const [ogTooltip, setOgTooltip] = useState(false);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-[24px] font-bold text-foreground text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            🏎️ The UPLY Awards
          </DialogTitle>
        </DialogHeader>
        <p className="text-[15px] text-muted-foreground text-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          The night your creator career changes forever.
        </p>

        {/* Cinematic description */}
        <div className="rounded-lg p-5 my-4" style={{ background: "#0A0A0A", border: "1px solid hsl(var(--border))" }}>
          {[
            { text: "You land in Las Vegas.", highlight: false },
            { text: "", highlight: false },
            { text: "A car picks you up from the airport", highlight: false },
            { text: "and takes you to the Aria Hotel.", highlight: false },
            { text: "", highlight: false },
            { text: "That night UPLY holds its annual Awards ceremony —", highlight: false },
            { text: "streamed live to every creator on the platform.", highlight: false },
            { text: "", highlight: false },
            { text: "Your name is announced.", highlight: true },
            { text: "", highlight: false },
            { text: "You walk on stage.", highlight: false },
            { text: "", highlight: false },
            { text: "You sit down with the UPLY team and sign", highlight: false },
            { text: "a 12-month partnership deal.", highlight: false },
            { text: "", highlight: false },
            { text: "You step outside.", highlight: false },
            { text: "", highlight: false },
            { text: "Your supercar is waiting.", highlight: true },
            { text: "", highlight: false },
            { text: "You chose it. UPLY paid for it.", highlight: false },
            { text: "It's yours.", highlight: false },
          ].map((line, i) => (
            line.text === "" ? <br key={i} /> :
            <p key={i} className={line.highlight ? "font-heading font-bold text-[15px] text-primary" : "text-[14px] text-muted-foreground"}
              style={{ fontFamily: line.highlight ? "'Space Grotesk', sans-serif" : "'Plus Jakarta Sans', sans-serif", lineHeight: 2.0 }}>
              {line.text}
            </p>
          ))}
        </div>

        {/* Prize Cards */}
        <div className="space-y-2">
          {/* Supercar */}
          <div className="rounded-lg p-4 bg-card border border-border">
            <p className="font-heading text-[16px] font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              🏎️ SUPERCAR OF YOUR CHOICE
            </p>
            <p className="text-[13px] text-muted-foreground mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Any car up to $300,000 — Lamborghini, Ferrari, Porsche, McLaren, or any other. Fully paid. Delivered to your door anywhere in the world.
            </p>
            <p className="text-[14px] font-extrabold mt-2" style={{ color: "#FB923C", fontFamily: "'Space Grotesk', sans-serif" }}>
              UP TO $300,000
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {["Lamborghini", "Ferrari", "Porsche", "McLaren", "+ any car"].map(c => (
                <span key={c} className="px-2.5 py-0.5 rounded-full text-[11px] border"
                  style={{ background: "transparent", borderColor: "rgba(249,115,22,0.4)", color: "#FB923C" }}>{c}</span>
              ))}
            </div>
          </div>

          {/* Vegas */}
          <div className="rounded-lg p-4 bg-card border border-border">
            <p className="font-heading text-[16px] font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              🏨 ARIA HOTEL · LAS VEGAS
            </p>
            <p className="text-[13px] text-muted-foreground mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Round-trip flights for you and one guest. 3 nights at the Aria Hotel. All meals covered. UPLY handles every logistic — you just show up.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {["✈️ Flights for 2", "🏨 3 Nights Aria", "🍽️ All Meals"].map(c => (
                <span key={c} className="px-2.5 py-0.5 rounded-full text-[11px] border"
                  style={{ background: "transparent", borderColor: "rgba(255,215,0,0.4)", color: "#FFD700" }}>{c}</span>
              ))}
            </div>
          </div>

          {/* Partnership */}
          <div className="rounded-lg p-4 bg-card border border-border">
            <p className="font-heading text-[16px] font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              🤝 UPLY CREATOR PARTNERSHIP
            </p>
            <p className="text-[13px] text-muted-foreground mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              A 12-month partnership deal with UPLY signed at the ceremony. Includes featured creator placement on the platform, priority support, and $50,000 in co-marketing commitment from UPLY to promote your content and community.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {["✓ Featured placement", "✓ Priority support", "✓ $50K co-marketing", "✓ You own all content"].map(c => (
                <span key={c} className="px-2.5 py-0.5 rounded-full text-[11px] border"
                  style={{ background: "transparent", borderColor: "rgba(61, 124, 255,0.4)", color: "hsl(var(--primary))" }}>{c}</span>
              ))}
            </div>
          </div>

          {/* Film Crew */}
          <div className="rounded-lg p-4 bg-card border border-border">
            <p className="font-heading text-[16px] font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              🎬 PROFESSIONAL FILM CREW
            </p>
            <p className="text-[13px] text-muted-foreground mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              UPLY provides a professional photographer and videographer to document the full experience — the ceremony, the deal signing, and the moment you see your car for the first time. Every piece of content belongs to you. Post it everywhere.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {["📸 Photos yours", "🎥 Video yours"].map(c => (
                <span key={c} className="px-2.5 py-0.5 rounded-full text-[11px] border"
                  style={{ background: "transparent", borderColor: "rgba(129,140,248,0.4)", color: "#818CF8" }}>{c}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Judging */}
        <div className="mt-6">
          <p className="text-[14px] font-semibold text-foreground mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            How the winner is determined
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { pct: "40%", label: "Revenue Growth" },
              { pct: "30%", label: "Community Score" },
              { pct: "30%", label: "Member Votes" },
            ].map(s => (
              <div key={s.label} className="rounded-md p-3 text-center" style={{ background: "#0A0A0A", border: "1px solid hsl(var(--border))" }}>
                <p className="font-heading text-[28px] font-extrabold text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{s.pct}</p>
                <p className="text-[12px] text-muted-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground italic text-center mt-2">
            Scores calculated over the calendar year. All UPLY creators are eligible. No minimum revenue required.
          </p>
        </div>

        {/* Categories */}
        <div className="mt-6">
          <p className="text-[14px] font-semibold text-foreground mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Award Categories
          </p>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(c => (
              <div key={c.name} className="relative">
                <span
                  className="block px-3 py-1.5 rounded-md text-[11px] text-center cursor-default"
                  style={{
                    background: "hsl(var(--muted) / 0.3)",
                    border: c.special === "gold" ? "1px solid rgba(255,215,0,0.4)" : c.special === "og" ? "1px solid rgba(61, 124, 255,0.4)" : "1px solid hsl(var(--border))",
                    color: c.special === "gold" ? "#FFD700" : c.special === "og" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                  onClick={() => c.special === "og" && setOgTooltip(!ogTooltip)}
                >
                  {c.name}
                </span>
                {c.special === "og" && ogTooltip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-3 py-2 rounded-md text-[10px] text-foreground whitespace-normal w-[200px] text-center z-10"
                    style={{ background: "#0A0A0A", border: "1px solid hsl(var(--border))" }}>
                    Only creators who joined before 1M are eligible for this award — forever.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-6">
          <p className="text-[14px] font-semibold text-foreground mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            How it works
          </p>
          <div className="space-y-2">
            {[
              "UPLY hits 10M creators — Awards ceremony becomes an annual event permanently",
              "Nominations open platform-wide — community nominates creators in each category",
              "Voting window opens for 30 days — all creators and members vote",
              "Creator of the Year determined — revenue growth plus community score plus member votes",
              "Live ceremony streamed on UPLY — winner announced, deal signed, car revealed, film crew rolling",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold"
                  style={{ background: "#0A0A0A", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>{i + 1}</span>
                <p className="text-[13px] text-muted-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Closing */}
        <div className="text-center mt-6">
          <p className="font-heading text-[16px] font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            This happens every year. Every year a new creator wins. Every year a new career changes.
          </p>
          <p className="text-[13px] text-muted-foreground mt-1">
            Starting the day UPLY hits 10M creators.
          </p>
        </div>

        <a href="#waitlist" onClick={onClose}
          className="mt-4 block w-full text-center py-3 rounded-md bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors">
          Apply for Early Access →
        </a>
      </DialogContent>
    </Dialog>
  );
}

// ── Milestone Card ──
function MilestoneCard({ m, effectiveCount, isMobile, onOpenAwards }: {
  m: Milestone; effectiveCount: number; isMobile: boolean;
  onOpenAwards: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const passed = effectiveCount >= m.count;
  const nextIdx = milestones.findIndex(ms => effectiveCount < ms.count);
  const isNext = milestones[nextIdx]?.count === m.count;
  const is100M = m.count === 100000000;
  const is100K = m.count === 100000;
  const is1M = m.count === 1000000;
  
  const is10M = m.count === 10000000;
  const away = m.count - effectiveCount;
  const badge = REWARD_BADGES[m.reward_type];

  const borderStyle = is1M
    ? "2px solid hsl(var(--primary))"
    : passed ? "1px solid hsl(var(--primary))"
    : isNext ? "1px solid hsl(var(--primary) / 0.5)"
    : is100M ? "1px solid #FFD700"
    : "1px solid hsl(var(--border))";

  const bgColor = is1M
    ? "rgba(61, 124, 255,0.05)"
    : passed ? "hsl(var(--primary) / 0.04)"
    : is100M ? "rgba(255,215,0,0.02)"
    : "hsl(var(--card))";

  const showDetails = !isMobile || expanded;

  return (
    <div className="relative flex-shrink-0 rounded-lg p-3.5"
      style={{ border: borderStyle, background: bgColor, width: isMobile ? 220 : 180, animation: isNext && !is1M ? "pulse-border 2s ease-in-out infinite" : undefined }}>
      {/* Reward badge */}
      {badge && (
        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold mb-2"
          style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.text }}>
          {badge.emoji} {badge.label}
        </span>
      )}
      {isMobile && (
        <button onClick={() => setExpanded(!expanded)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <Info className="w-3.5 h-3.5" />
        </button>
      )}
      <p className={`font-heading text-xl font-extrabold ${
        passed ? "text-primary" : isNext ? "text-foreground" : is100M ? "text-[#FFD700]" : "text-muted-foreground/40"
      }`}>{m.label}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">UNLOCKS</p>
      <p className={`text-sm font-semibold mt-0.5 ${passed || isNext ? "text-foreground" : "text-muted-foreground/60"}`}>{m.unlock}</p>

      {/* Detail — always desktop, tap mobile */}
      {!isMobile && (
        <>
          <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{m.detail}</p>
          <p className="text-[11px] text-muted-foreground italic mt-1">{m.context}</p>
        </>
      )}
      <div className="overflow-hidden transition-all duration-200" style={{ maxHeight: isMobile && expanded ? 300 : isMobile ? 0 : undefined }}>
        {isMobile && (
          <>
            <p className="text-xs text-muted-foreground mt-2">{m.detail}</p>
            <p className="text-[11px] text-muted-foreground italic mt-1">{m.context}</p>
          </>
        )}
      </div>

      {/* Prize display for 100K */}
      {is100K && showDetails && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-[13px]">
            <span className="font-heading font-bold text-primary">💰 $100,000 cash</span>
            <span className="text-muted-foreground mx-1">+</span>
            <span className="font-heading font-bold" style={{ color: "#FFD700" }}>⌚ Rolex Submariner</span>
          </p>
        </div>
      )}

      {/* Prize display for 1M */}
      {is1M && showDetails && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-[13px]">
            <span className="font-heading font-bold text-primary">⚡ 0% platform fees</span>
            <span className="text-muted-foreground mx-1">—</span>
            <span className="font-heading font-bold text-foreground">forever</span>
          </p>
          <p className="text-[12px] text-primary font-medium mt-1">+ Founding Creator benefits forever</p>
          <p className="text-[11px] text-muted-foreground italic mt-1">Priority support, exclusive badges, early access to every future feature</p>
        </div>
      )}

      {/* Prize display for 10M */}
      {is10M && showDetails && (
        <div className="mt-2 pt-2 border-t border-border space-y-0">
          {/* Row 1 — Supercar */}
          <div className="flex items-start gap-2 py-2">
            <span className="text-[20px] leading-none mt-0.5">🏎️</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>SUPERCAR OF YOUR CHOICE</p>
              <p className="text-[13px] font-semibold" style={{ color: "#FB923C", fontFamily: "'Space Grotesk', sans-serif" }}>Any car up to $300,000 — fully paid, delivered anywhere</p>
            </div>
            <span className="text-[14px] font-extrabold shrink-0" style={{ color: "#FB923C", fontFamily: "'Space Grotesk', sans-serif" }}>$300K</span>
          </div>
          <div className="border-t border-border" />
          {/* Row 2 — Vegas */}
          <div className="flex items-start gap-2 py-2">
            <span className="text-[20px] leading-none mt-0.5">🏨</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>ARIA HOTEL · LAS VEGAS</p>
              <p className="text-[13px] font-semibold" style={{ color: "#FFD700", fontFamily: "'Space Grotesk', sans-serif" }}>Round-trip flights for you and a guest · 3 nights · All meals</p>
            </div>
            <span className="text-[14px] font-extrabold shrink-0" style={{ color: "#FFD700", fontFamily: "'Space Grotesk', sans-serif" }}>For 2</span>
          </div>
          <div className="border-t border-border" />
          {/* Row 3 — Partnership */}
          <div className="flex items-start gap-2 py-2">
            <span className="text-[20px] leading-none mt-0.5">🤝</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>UPLY CREATOR PARTNERSHIP</p>
              <p className="text-[13px] font-semibold text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>12-month deal · Featured placement · $50K co-marketing commitment</p>
            </div>
            <span className="text-[14px] font-extrabold shrink-0 text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>$50K</span>
          </div>
          <div className="border-t border-border" />
          {/* Row 4 — Film Crew */}
          <div className="flex items-start gap-2 py-2">
            <span className="text-[20px] leading-none mt-0.5">🎬</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>PROFESSIONAL FILM CREW</p>
              <p className="text-[13px] font-semibold" style={{ color: "#818CF8", fontFamily: "'Space Grotesk', sans-serif" }}>UPLY documents everything. All content is yours to own and post.</p>
            </div>
            <span className="text-[14px] font-extrabold shrink-0" style={{ color: "#818CF8", fontFamily: "'Space Grotesk', sans-serif" }}>Yours</span>
          </div>
          <p className="text-[11px] text-muted-foreground italic text-center pt-2">
            Awarded annually at the UPLY Awards · Every year from 10M forward · All logistics handled by UPLY
          </p>
        </div>
      )}

      {/* Bottom status */}
      <div className="mt-3">
        {passed && <p className="text-[11px] text-primary">✓ Unlocked</p>}
        {isNext && !is1M && <p className="text-[11px] text-foreground">{away.toLocaleString()} away</p>}
        {is100M && !passed && !isNext && <p className="text-[11px]" style={{ color: "#FFD700" }}>👑 Largest on Earth</p>}
      </div>

      {/* 1M urgency */}
      {is1M && (
        <div className="mt-2">
          {effectiveCount < 1000000 ? (
            <>
              <p className="text-[10px] font-bold uppercase text-[#FF4444]" style={{ animation: "pulse-dot 2.5s infinite" }}>
                ⚡ WINDOW CLOSES AT 1M — PERMANENTLY
              </p>
              <p className="text-[11px] text-[#FF4444] mt-0.5">{(1000000 - effectiveCount).toLocaleString()} away from closing</p>
            </>
          ) : (
            <p className="text-[11px] text-primary">✓ Window closed — Founding Rate Lock (95% payout for life) secured for early creators</p>
          )}
        </div>
      )}

      {/* Learn more for 10M */}
      {is10M && showDetails && (
        <button onClick={onOpenAwards}
          className="text-[11px] text-muted-foreground hover:text-primary mt-2 flex items-center gap-0.5 transition-colors">
          Learn more <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ── Platform Timeline ──
const platforms = [
  { name: "Instagram", outcome: "2B users today" },
  { name: "TikTok", outcome: "1B users today" },
  { name: "YouTube", outcome: "2.5B users today" },
  { name: "Twitch", outcome: "140M users today" },
];

// ── Main Component ──
const MissionProgress = React.memo(function MissionProgress() {
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [baseOffset, setBaseOffset] = useState(HARDCODED_FALLBACK);
  const [displayCount, setDisplayCount] = useState(HARDCODED_FALLBACK);
  const [animatedValue, setAnimatedValue] = useState(HARDCODED_FALLBACK);
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  
  const [awardsOpen, setAwardsOpen] = useState(false);
  const [counterFlash, setCounterFlash] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const processedIds = useRef(new Set<string>());

  const effectiveCount = displayCount;
  const { display, isEarly } = getDisplayCount(effectiveCount);

  // Use a scaled fill: milestone positions are at log positions, fill should match
  // 24,200 → linear interpolation between milestones for accurate visual
  const computeFill = (count: number) => {
    if (count <= 0) return 0;
    const points = [
      { count: 0, pct: 0 },
      { count: 10000, pct: 14.3 },
      { count: 100000, pct: 28.6 },
      { count: 500000, pct: 42.9 },
      { count: 1000000, pct: 57.1 },
      { count: 10000000, pct: 78.6 },
      { count: 100000000, pct: 100 },
    ];
    for (let i = 1; i < points.length; i++) {
      if (count <= points[i].count) {
        const prev = points[i - 1];
        const curr = points[i];
        const ratio = (count - prev.count) / (curr.count - prev.count);
        return prev.pct + ratio * (curr.pct - prev.pct);
      }
    }
    return 100;
  };
  const fillPercentage = computeFill(effectiveCount);

  // Count-up animation
  const animateCountUp = useCallback((from: number, to: number, durationMs: number) => {
    if (reducedMotion) { setAnimatedValue(to); return; }
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / durationMs, 1);
      setAnimatedValue(Math.floor(from + (to - from) * easeOutCubic(progress)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [reducedMotion]);

  // IO
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setIsVisible(true); }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Fetch data
  const fetchCounts = useCallback(async () => {
    const [{ count: cCount }, { count: wCount }, { data: configData }] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).not("creator_type", "is", null),
      supabase.from("waitlist").select("*", { count: "exact", head: true }),
      supabase.from("platform_config").select("value").eq("key", "waitlist_base_count").single(),
    ]);
    const offset = configData?.value ? parseInt(configData.value, 10) : HARDCODED_FALLBACK;
    setBaseOffset(offset);
    const realCount = (cCount || 0) + (wCount || 0);
    const effective = offset + realCount;
    
    if (effective > displayCount) {
      animateCountUp(displayCount, effective, 1500);
    }
    setDisplayCount(effective);

    const { data: recent } = await supabase
      .from("profiles")
      .select("display_name, creator_type, created_at")
      .not("creator_type", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (recent && recent.length > 0) {
      setTickerItems(recent.map((r: any) => ({
        name: privacyName(r.display_name),
        type: r.creator_type || "Creator",
        ago: formatTimeAgo(r.created_at),
      })));
    } else {
      setTickerItems(PLACEHOLDER_ITEMS);
    }
    setIsLoaded(true);
  }, [animateCountUp, displayCount]);

  useEffect(() => {
    fetchCounts();
  }, []);

  // Realtime with deduplication
  useEffect(() => {
    function handleNewSignup(payload: any) {
      const rowId = payload.new?.id;
      if (!rowId || processedIds.current.has(rowId)) return;
      processedIds.current.add(rowId);

      setDisplayCount(prev => {
        const newCount = prev + 1;
        animateCountUp(prev, newCount, 300);
        return newCount;
      });
      setCounterFlash(true);
      setTimeout(() => setCounterFlash(false), 500);

      // Update ticker for profile inserts
      const p = payload.new;
      if (p?.creator_type) {
        setTickerItems(prev => [{ name: privacyName(p.display_name), type: p.creator_type, ago: "just now" }, ...prev.slice(0, 19)]);
      }

      // Clean up old IDs after 60s
      setTimeout(() => { processedIds.current.delete(rowId); }, 60000);
    }

    const chan = supabase.channel("mission-progress")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, handleNewSignup)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "waitlist" }, handleNewSignup)
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [animateCountUp]);

  // Scroll hint
  useEffect(() => {
    if (!isMobile || hintShown) return;
    if (sessionStorage.getItem("uply_milestone_hint")) { setHintShown(true); return; }
    const timer = setTimeout(() => {
      setHintShown(true);
      sessionStorage.setItem("uply_milestone_hint", "true");
    }, 3000);
    return () => clearTimeout(timer);
  }, [isMobile, hintShown]);

  const tickerDup = useMemo(() => [...tickerItems, ...tickerItems], [tickerItems]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden border-t border-b border-border bg-background py-12 md:py-[72px]">
      <style>{`
        @keyframes pulse-border { 0%,100% { border-color: hsl(145 100% 50% / 0.3); } 50% { border-color: hsl(145 100% 50% / 0.7); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes bar-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
      `}</style>

      <div className="mx-auto max-w-[640px] px-5 md:px-6">
        {/* Urgency banner — only after 500K */}
        {effectiveCount > 500000 && effectiveCount < 1000000 && (
          <div className="mb-6 rounded-md px-4 py-3 text-center text-[13px] text-foreground"
            style={{ background: "rgba(255,68,68,0.06)", border: "1px solid rgba(255,68,68,0.25)" }}>
            ⚡ The Founding Rate Lock window is closing — <span className="font-bold" style={{ color: "#FF4444" }}>{(1000000 - effectiveCount).toLocaleString()}</span> creators until it's gone permanently
          </div>
        )}

        {/* BLOCK 1 — Declaration */}
        <div className="text-center mb-10">
          <p className="font-heading text-[28px] md:text-[36px] font-extrabold leading-[1.2] tracking-[-0.02em] text-foreground mb-4">
            The creator economy is worth $250 billion.
          </p>
          <p className="font-heading text-[28px] md:text-[36px] font-extrabold leading-[1.2] tracking-[-0.02em] text-foreground mb-4">
            Most of it goes to platforms.
          </p>
          <p className="font-heading text-[28px] md:text-[36px] font-extrabold leading-[1.2] tracking-[-0.02em] text-primary mb-6">
            We're giving it back.
          </p>
          <p className="text-base text-muted-foreground max-w-[400px] mx-auto leading-relaxed">
            UPLY is building the creator economy's infrastructure.<br />
            100 million creators. Zero middlemen.
          </p>
        </div>

        {/* BLOCK 2 — Live Counter */}
        <div className="border-t border-b border-border py-6 mb-8">
          <div className="text-center">
            {!isLoaded && !isVisible ? (
              <div className="mx-auto w-[120px] h-[56px] rounded-md" style={{ background: "linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--muted)/0.6) 50%, hsl(var(--muted)) 100%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
                className="rounded-lg px-4 py-2 inline-block transition-colors duration-500"
                style={{ backgroundColor: counterFlash ? "rgba(61, 124, 255,0.15)" : "transparent" }}>
                <p className="font-heading text-[52px] md:text-[72px] font-extrabold text-primary"
                  style={{
                    transition: 'textShadow 300ms ease',
                    textShadow: counterFlash ? '0 0 20px rgba(61, 124, 255,0.8)' : 'none',
                  }}>
                  +{formatCount(animatedValue)}
                </p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" style={{ animation: "pulse-dot 2s infinite" }} />
                  <p className="text-[13px] text-muted-foreground">creators building on UPLY</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* BLOCK 3 — Progress Bar */}
        <div className="relative mb-6">
          {!isLoaded ? (
            <Skeleton className="w-full h-1.5 rounded-full" />
          ) : (
            <div className="relative w-full h-1.5 rounded-[3px] bg-muted/30">
              <div className="h-full rounded-[3px] relative overflow-hidden"
                style={{
                  width: isVisible ? `${fillPercentage}%` : "0%",
                  background: "linear-gradient(90deg, hsl(var(--primary)), #00CC6A)",
                  boxShadow: "0 0 12px rgba(61, 124, 255,0.25)",
                  transition: "width 1.5s cubic-bezier(0.22, 1, 0.36, 1)",
                }}>
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                  animation: reducedMotion ? "none" : "bar-shimmer 3s infinite",
                }} />
              </div>
              {/* You are here indicator */}
              <div className="absolute top-0" style={{ left: `${fillPercentage}%`, transform: "translateX(-50%)" }}>
                <p className="text-[10px] text-primary whitespace-nowrap -mt-4 font-medium">You are here</p>
                <div className="w-2 h-2 rounded-full bg-primary mx-auto -mt-0.5" style={{ boxShadow: "0 0 8px rgba(61, 124, 255,0.8)" }} />
              </div>
            </div>
          )}
          {/* Milestone ticks — use evenly spaced on mobile to prevent overlap */}
          {isLoaded && (
            <div className="relative w-full flex justify-between mt-3 px-1 md:block">
              {milestones.map((m, idx) => {
                const pos = [10000,100000,500000,1000000,10000000,100000000].indexOf(m.count) !== -1
                  ? [14.3, 28.6, 42.9, 57.1, 78.6, 100][[10000,100000,500000,1000000,10000000,100000000].indexOf(m.count)]
                  : 0;
                const passed = effectiveCount >= m.count;
                const nextIdx = milestones.findIndex(ms => effectiveCount < ms.count);
                const isNext = milestones[nextIdx]?.count === m.count;
                const is1M = m.count === 1000000;
                // On mobile, show only key milestones to avoid overlap
                const showOnMobile = [10000, 100000, 1000000, 10000000, 100000000].includes(m.count);
                return (
                  <div key={m.label} className={`text-center flex-shrink-0 ${!showOnMobile && isMobile ? "hidden" : ""} md:absolute`}
                    style={isMobile ? {} : { left: `${pos}%`, transform: "translateX(-50%)" }}>
                    {is1M && effectiveCount < 1000000 && (
                      <span className="block w-1.5 h-1.5 rounded-full mx-auto mb-0.5" style={{ background: "#FF4444", animation: "pulse-dot 2s infinite" }} />
                    )}
                    <div className={`w-px h-2 mx-auto ${passed ? "bg-primary" : isNext ? "bg-primary" : "bg-muted-foreground/20"}`}
                      style={isNext ? { animation: "pulse-dot 2s infinite" } : undefined} />
                    <p className={`text-[10px] md:text-[11px] font-bold mt-0.5 whitespace-nowrap ${
                      passed ? "text-primary" : isNext ? "text-foreground" : "text-muted-foreground/40"
                    }`} style={isNext ? { textShadow: "0 0 8px rgba(61, 124, 255,0.5)" } : undefined}>
                      {passed && "✓ "}{m.label}
                    </p>
                    <p className="text-[9px] text-muted-foreground italic whitespace-nowrap mt-0.5 hidden md:block max-w-[80px] truncate">{m.context}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* BLOCK 4 — Milestone Cards */}
        <div className="relative mb-10">
          <div className="-mx-5 md:mx-0 px-5 md:px-0 flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {milestones.map(m => (
              <MilestoneCard key={m.label} m={m} effectiveCount={effectiveCount} isMobile={!!isMobile}
                onOpenAwards={() => setAwardsOpen(true)} />
            ))}
          </div>
          <AnimatePresence>
            {isMobile && !hintShown && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="text-center text-[11px] text-muted-foreground/30 mt-2">
                swipe →
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* BLOCK 5 — Early Adopter Callout */}
        <div className="rounded-[10px] border border-border bg-card p-6 max-w-[520px] mx-auto mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left — platform timeline */}
            <div className="md:w-1/2 space-y-3 relative">
              <div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-border" />
              {platforms.map(p => (
                <div key={p.name} className="flex items-center gap-3 relative pl-5">
                  <div className="absolute left-0 w-3.5 h-3.5 rounded-full bg-muted border-2 border-border" />
                  <span className="text-[13px] font-semibold text-foreground">{p.name}</span>
                  <span className="text-muted-foreground text-xs">→</span>
                  <span className="text-primary text-[13px]">{p.outcome}</span>
                </div>
              ))}
            </div>
            {/* Right */}
            <div className="md:w-1/2 md:border-l md:border-border md:pl-6 flex flex-col justify-center">
              <p className="font-heading text-2xl font-extrabold text-foreground mb-3">Don't be late again.</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Every platform above was invite-only<br />at the beginning. So is UPLY.
              </p>
              <p className="text-sm text-primary">
                {isEarly ? "You're here at the very beginning. Remember this moment." : `You're here at ${display}. Remember this number.`}
              </p>
            </div>
          </div>
        </div>

        {/* BLOCK 6 — Share Button */}
        <div className="text-center mb-10">
          <button onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-border bg-card text-[13px] text-foreground hover:border-primary transition-colors">
            📸 <span>Share your spot</span> <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* BLOCK 7 — Social Proof Ticker */}
        {tickerItems.length > 0 && (
          <div className="relative overflow-hidden h-6"
            style={{ maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)" }}>
            <div className="flex whitespace-nowrap" style={{ animation: reducedMotion ? "none" : "ticker-scroll 40s linear infinite" }}>
              {tickerDup.map((item, i) => (
                <span key={i} className="text-xs text-muted-foreground/50 mx-3">
                  {item.name} — {item.type} · {item.ago}
                  <span className="text-muted-foreground/20 mx-2">·</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {shareOpen && <ShareModal displayCount={display} effectiveCount={effectiveCount} onClose={() => setShareOpen(false)} />}
      
      {awardsOpen && <AwardsModal onClose={() => setAwardsOpen(false)} />}
    </section>
  );
});

export default MissionProgress;
