import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { X, Info, Twitter, Copy, Link2, Share2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

// ── Display count logic (Fix 1) ──
const FLOOR = 10000;

function getDisplayCount(rawCount: number): { display: string; isEarly: boolean } {
  const effectiveCount = Math.max(rawCount, FLOOR);
  if (effectiveCount < 1000) return { display: "hundreds", isEarly: true };
  if (effectiveCount < 10000) return { display: "thousands", isEarly: true };
  if (effectiveCount < 100000) return { display: effectiveCount.toLocaleString(), isEarly: true };
  if (effectiveCount < 1000000) return { display: effectiveCount.toLocaleString(), isEarly: false };
  return { display: (effectiveCount / 1000000).toFixed(1) + "M", isEarly: false };
}

const milestones = [
  { count: 10000, label: "10K", unlock: "ARIA gets smarter", detail: "More creator data means better AI for everyone on the platform", color: "#00FF85" },
  { count: 100000, label: "100K", unlock: "Instagram Live unlocks", detail: "Simulcast to Instagram when we reach 100K — currently API-restricted", color: "#00FF85" },
  { count: 1000000, label: "1M", unlock: "Creator Fund launches", detail: "UPLY allocates $1M/year to fund independent creator projects", color: "#00FF85" },
  { count: 10000000, label: "10M", unlock: "TikTok integration", detail: "Full TikTok Live and distribution unlocks at scale", color: "#00FF85" },
  { count: 100000000, label: "100M", unlock: "Largest creator platform", detail: "UPLY becomes the largest creator monetization platform on earth", color: "#00FF85" },
  { count: 1000000000, label: "1B", unlock: "Mission complete", detail: "1 billion creators owning their audience and their income", color: "#FFD700" },
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

function useCountUp(target: number, duration: number, trigger: boolean, reducedMotion: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    if (reducedMotion) { setValue(target); return; }
    let start: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / (duration * 1000), 1);
      setValue(Math.floor(easeOutCubic(progress) * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, trigger, reducedMotion]);
  return value;
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

// ── Share Modal ──
function ShareModal({ displayCount, onClose }: { displayCount: string; onClose: () => void }) {
  const isMobile = useIsMobile();
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const tweetText = `I just joined @uplyTV when it had ${displayCount} creators.\n\nDon't be late to this one.\n\nThe creator economy is $250 billion. Most of it goes to platforms. UPLY is giving it back.\n\nuply.tv — waitlist & invite only.`;

  const handleTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, "_blank");
  };
  const handleCopyText = () => {
    navigator.clipboard.writeText(tweetText);
    toast.success("Copied to clipboard ✓");
  };
  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://uply.tv");
    toast.success("Link copied ✓");
  };
  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: "I joined UPLY early", text: `I joined UPLY when it had ${displayCount} creators. Don't be late to this one. uply.tv`, url: "https://uply.tv" });
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-[520px] rounded-xl border border-[hsl(var(--surface-border))] bg-[#0A0A0A] p-6" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-[hsl(var(--muted-foreground))] hover:text-white"><X className="w-5 h-5" /></button>
        {/* Preview card */}
        <div className="mx-auto mb-6 w-full max-w-[480px] aspect-video rounded-lg overflow-hidden flex flex-col items-center justify-center text-center p-6"
          style={{ background: "#0A0A0A", boxShadow: "inset 0 0 120px rgba(0,255,133,0.06)", border: "1px solid #1E1E1E" }}>
          <span className="text-3xl mb-3">😊</span>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">I joined UPLY when it had</p>
          <p className="text-4xl font-extrabold text-[hsl(var(--primary))] font-heading my-1">{displayCount} creators.</p>
          <p className="text-xs text-[#555555] mt-2">{dateStr}</p>
          <p className="text-sm text-[hsl(var(--primary))] mt-1">uply.tv</p>
        </div>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button onClick={handleTwitter} className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#333] text-sm text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-white transition-colors">
            <Twitter className="w-4 h-4" /> Tweet
          </button>
          <button onClick={handleCopyText} className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#333] text-sm text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-white transition-colors">
            <Copy className="w-4 h-4" /> Copy Text
          </button>
          <button onClick={handleCopyLink} className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#333] text-sm text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-white transition-colors">
            <Link2 className="w-4 h-4" /> Copy Link
          </button>
          {isMobile && typeof navigator.share === "function" && (
            <button onClick={handleNativeShare} className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#333] text-sm text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-white transition-colors">
              <Share2 className="w-4 h-4" /> More
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Milestone Card (Fix 2 — mobile tap expand) ──
function MilestoneCard({ m, effectiveCount, isMobile }: { m: typeof milestones[0]; effectiveCount: number; isMobile: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const passed = effectiveCount >= m.count;
  const nextIdx = milestones.findIndex(ms => effectiveCount < ms.count);
  const isNext = milestones[nextIdx]?.count === m.count;
  const is1B = m.count === 1000000000;
  const away = m.count - effectiveCount;

  const borderClass = passed
    ? "border-[hsl(var(--primary))]"
    : isNext
    ? "border-[hsl(var(--primary)/0.5)]"
    : is1B
    ? "border-[#FFD700]"
    : "border-[#1E1E1E]";

  const bgClass = passed ? "bg-[hsl(var(--primary)/0.04)]" : "bg-[#111111]";

  return (
    <div className={`relative flex-shrink-0 rounded-lg border p-4 ${borderClass} ${bgClass} ${isMobile ? "w-[260px]" : "w-[200px]"}`}
      style={isNext ? { animation: "pulse-border 2s ease-in-out infinite" } : undefined}>
      {isMobile && (
        <button onClick={() => setExpanded(!expanded)} className="absolute top-3 right-3 text-[#555] hover:text-white">
          <Info className="w-3.5 h-3.5" />
        </button>
      )}
      <p className={`font-heading text-xl font-extrabold ${passed ? "text-[hsl(var(--primary))]" : isNext ? "text-white" : is1B ? "text-[#FFD700]" : "text-[#333]"}`}>
        {m.label}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-[#555] mt-2">UNLOCKS</p>
      <p className={`text-sm font-semibold mt-0.5 ${passed || isNext ? "text-white" : "text-[#444]"}`}>{m.unlock}</p>
      {/* Detail — always on desktop, tap on mobile */}
      {!isMobile && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 line-clamp-2">{m.detail}</p>}
      <div className="overflow-hidden transition-all duration-200" style={{ maxHeight: isMobile && expanded ? 80 : isMobile ? 0 : undefined }}>
        {isMobile && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">{m.detail}</p>}
      </div>
      <div className="mt-3">
        {passed && <p className="text-[11px] text-[hsl(var(--primary))]">✓ Unlocked</p>}
        {isNext && <p className="text-[11px] text-white">{away.toLocaleString()} away</p>}
        {is1B && !passed && !isNext && <p className="text-[11px] text-[#FFD700]">👑 The Mission</p>}
      </div>
    </div>
  );
}

// ── Main Component ──
const MissionProgress = React.memo(function MissionProgress() {
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rawCount, setRawCount] = useState(0);
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [counterFlash, setCounterFlash] = useState(false);
  const [hintShown, setHintShown] = useState(false);

  const effectiveCount = Math.max(rawCount, FLOOR);
  const { display, isEarly } = getDisplayCount(rawCount);
  const animatedCount = useCountUp(effectiveCount, 1.5, isVisible && !loading, reducedMotion);

  const fillPercentage = effectiveCount > 0 ? Math.min(Math.log10(effectiveCount) / Math.log10(1000000000) * 100, 100) : 0;

  // IO
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setIsVisible(true); }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Fetch data
  useEffect(() => {
    (async () => {
      const [{ count: cCount }, { count: wCount }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).not("creator_type", "is", null),
        supabase.from("waitlist").select("*", { count: "exact", head: true }),
      ]);
      setRawCount((cCount || 0) + (wCount || 0));

      // Ticker
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
      setLoading(false);
    })();
  }, []);

  // Realtime
  useEffect(() => {
    const chan = supabase.channel("mission-progress")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, (payload: any) => {
        setRawCount(prev => prev + 1);
        setCounterFlash(true);
        setTimeout(() => setCounterFlash(false), 500);
        const p = payload.new;
        if (p?.creator_type) {
          setTickerItems(prev => [{ name: privacyName(p.display_name), type: p.creator_type, ago: "just now" }, ...prev.slice(0, 19)]);
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "waitlist" }, () => {
        setRawCount(prev => prev + 1);
        setCounterFlash(true);
        setTimeout(() => setCounterFlash(false), 500);
      })
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, []);

  // Scroll hint
  useEffect(() => {
    if (!isMobile || hintShown) return;
    if (sessionStorage.getItem("mission_hint_shown")) { setHintShown(true); return; }
    const timer = setTimeout(() => {
      setHintShown(true);
      sessionStorage.setItem("mission_hint_shown", "true");
    }, 3000);
    return () => clearTimeout(timer);
  }, [isMobile, hintShown]);

  const tickerDup = useMemo(() => [...tickerItems, ...tickerItems], [tickerItems]);

  return (
    <section ref={sectionRef} className="relative py-16 md:py-20 overflow-hidden"
      style={{ background: "radial-gradient(ellipse 80% 40% at 50% 50%, rgba(0,255,133,0.04) 0%, transparent 70%), #0A0A0A" }}>
      <style>{`
        @keyframes pulse-border { 0%,100% { border-color: hsl(145 100% 50% / 0.3); } 50% { border-color: hsl(145 100% 50% / 0.7); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes bar-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
      `}</style>

      <div className="mx-auto max-w-[640px] px-5 md:px-6">
        {/* BLOCK 1 — Declaration */}
        <div className="text-center mb-12">
          <p className="text-[11px] uppercase tracking-[0.15em] text-[#555] font-heading mb-5">THE MISSION</p>
          <h2 className="font-heading text-[26px] md:text-[32px] font-extrabold leading-[1.2] tracking-tight text-white">
            The creator economy is worth $250 billion.<br />
            Most of it goes to platforms.<br />
            <span className="text-[hsl(var(--primary))]">We're giving it back.</span>
          </h2>
          <p className="text-[15px] text-[hsl(var(--muted-foreground))] mt-5 max-w-[480px] mx-auto leading-relaxed">
            UPLY is building the infrastructure for 1 billion creators to own their audience, their content, and their income. You're here at the very beginning.
          </p>
        </div>

        {/* BLOCK 2 — Live Counter */}
        <div className="text-center mb-10">
          {loading ? (
            <div className="mx-auto w-[120px] h-[56px] rounded-md" style={{ background: "linear-gradient(90deg, #1E1E1E 0%, #2a2a2a 50%, #1E1E1E 100%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
              className="rounded-lg px-4 py-2 inline-block transition-colors duration-500"
              style={{ backgroundColor: counterFlash ? "rgba(0,255,133,0.15)" : "transparent" }}>
              <p className="font-heading text-[40px] md:text-[56px] font-extrabold text-[hsl(var(--primary))]">
                {animatedCount.toLocaleString()}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))]" style={{ animation: "pulse-dot 2s infinite" }} />
                <p className="text-[13px] text-[#666]">creators and applicants have joined</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* BLOCK 3 — Progress Bar */}
        <div className="relative mb-10">
          {loading ? (
            <Skeleton className="w-full h-2 rounded-full" />
          ) : (
            <div className="relative w-full h-2 rounded-full bg-[#1E1E1E] overflow-hidden">
              <div className="h-full rounded-full relative overflow-hidden"
                style={{
                  width: isVisible ? `${fillPercentage}%` : "0%",
                  background: "linear-gradient(90deg, hsl(var(--primary)), #00CC6A)",
                  transition: "width 1.5s cubic-bezier(0.22, 1, 0.36, 1)",
                }}>
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                  animation: reducedMotion ? "none" : "bar-shimmer 3s infinite",
                }} />
              </div>
              {/* You are here */}
              <div className="absolute top-0" style={{ left: `${fillPercentage}%`, transform: "translateX(-50%)" }}>
                <p className="text-[10px] text-[hsl(var(--primary))] whitespace-nowrap -mt-4 font-medium">You are here</p>
                <span className="text-[hsl(var(--primary))] text-[8px] block text-center">▲</span>
              </div>
            </div>
          )}
          {/* Milestone ticks */}
          {!loading && (
            <div className="relative w-full mt-2">
              {milestones.map(m => {
                const pos = Math.log10(m.count) / Math.log10(1000000000) * 100;
                const passed = effectiveCount >= m.count;
                const nextIdx = milestones.findIndex(ms => effectiveCount < ms.count);
                const isNext = milestones[nextIdx]?.count === m.count;
                return (
                  <div key={m.label} className="absolute" style={{ left: `${pos}%`, transform: "translateX(-50%)" }}>
                    <div className={`w-px h-2 mx-auto ${passed ? "bg-[hsl(var(--primary))]" : isNext ? "bg-[hsl(var(--primary))]" : "bg-[#333]"}`}
                      style={isNext ? { animation: "pulse-dot 2s infinite" } : undefined} />
                    <p className={`text-[11px] font-bold mt-0.5 whitespace-nowrap ${
                      passed ? "text-[hsl(var(--primary))]" : isNext ? "text-white" : "text-[#444]"
                    }`} style={isNext ? { textShadow: "0 0 8px rgba(0,255,133,0.5)" } : undefined}>
                      {passed && "✓ "}{m.label}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Spacer for milestone ticks */}
        <div className="h-6" />

        {/* BLOCK 4 — Milestone Cards */}
        <div className="relative mb-10">
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {milestones.map(m => (
              <MilestoneCard key={m.label} m={m} effectiveCount={effectiveCount} isMobile={!!isMobile} />
            ))}
          </div>
          {/* Scroll hint (mobile, once) */}
          <AnimatePresence>
            {isMobile && !hintShown && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="text-center text-[11px] text-[#333] mt-2">
                swipe →
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* BLOCK 5 — Early Adopter Callout */}
        <div className="rounded-[10px] border border-[#1E1E1E] bg-[#111111] p-6 max-w-[480px] mx-auto mb-8 text-center">
          <div className="space-y-3 text-sm text-[hsl(var(--muted-foreground))] leading-[1.7]">
            <p>The people who found Instagram when it had {display} users<br />are now influencers with millions of followers.</p>
            <p>The people who found TikTok when it had {display} users<br />are now full-time creators earning millions.</p>
            <p>The people who found YouTube when it had {display} users<br />built media empires.</p>
            <p className="text-white font-semibold">UPLY has {display} creators and applicants today.</p>
          </div>
          <div className="my-5 h-px bg-[#1E1E1E]" />
          <p className="font-heading text-[22px] font-extrabold text-white mb-2">Don't be late again.</p>
          <p className="text-sm text-[hsl(var(--primary))]">
            {isEarly ? "You're here at the very beginning. Remember this moment." : `You're here at ${display}. Remember this number.`}
          </p>
        </div>

        {/* BLOCK 6 — Share Button */}
        <div className="text-center mb-10">
          <button onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-[#333] text-[13px] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-white transition-colors">
            📸  Share this moment
          </button>
        </div>

        {/* BLOCK 7 — Social Proof Ticker */}
        {tickerItems.length > 0 && (
          <div className="relative overflow-hidden h-6"
            style={{ maskImage: "linear-gradient(90deg, transparent, black 10%, black 90%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, black 10%, black 90%, transparent)" }}>
            <div className="flex whitespace-nowrap" style={{ animation: reducedMotion ? "none" : "ticker-scroll 30s linear infinite" }}>
              {tickerDup.map((item, i) => (
                <span key={i} className="text-xs text-[#555] mx-3">
                  {item.name} joined as a {item.type} creator · {item.ago}
                  <span className="text-[#333] mx-2">·</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {shareOpen && <ShareModal displayCount={display} onClose={() => setShareOpen(false)} />}
      </AnimatePresence>
    </section>
  );
});

export default MissionProgress;
