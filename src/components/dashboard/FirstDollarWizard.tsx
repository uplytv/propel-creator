import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, ShoppingBag, Users, BookOpen, Zap, CalendarDays, ArrowRight, X, Copy, Check, Link, Ticket, UserCheck, Armchair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { SITE_URL } from "@/lib/siteUrl";

const MODES = [
  { id: "live_shop", icon: ShoppingBag, emoji: "🛍️", label: "Live Shop", desc: "Sell products on stream. Auctions, flash sales, instant checkout.", color: "#3D7CFF" },
  { id: "community", icon: Users, emoji: "🤝", label: "Paid Community", desc: "Monthly subscription. Exclusive posts, videos, direct access.", color: "#00AEEF" },
  { id: "course", icon: BookOpen, emoji: "📚", label: "Sell a Course", desc: "Package your knowledge. One-time payment, 95% yours.", color: "#F59E0B" },
  { id: "tips", icon: Zap, emoji: "⚡", label: "Tips & Live", desc: "Go live and accept tips instantly. Lowest barrier to first dollar.", color: "#9333EA" },
  { id: "events", icon: CalendarDays, emoji: "🎟️", label: "Events", desc: "Tickets, RSVP, or assigned seating. Resale built-in.", color: "#EC4899" },
];

const TICKETING_MODES = [
  { id: "ticketed", icon: Ticket, emoji: "🎟️", label: "Ticketed", desc: "Paid tickets, QR check-in, resale marketplace." },
  { id: "free_rsvp", icon: UserCheck, emoji: "✋", label: "Free RSVP", desc: "Collect names + emails. Reminders + check-in." },
  { id: "seated", icon: Armchair, emoji: "💺", label: "Assigned Seating", desc: "Seat map. Buyers pick their exact spot." },
];

export default function FirstDollarWizard({ onDismiss, username }: { onDismiss: () => void; username: string | null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<string | null>(null);
  const [ticketingMode, setTicketingMode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const profileUrl = username ? `${SITE_URL}/${username}` : `${SITE_URL}/dashboard`;

  const copy = async () => {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true); toast.success("Link copied!"); setTimeout(() => setCopied(false), 2000);
  };

  const go = () => {
    if (mode === "community") navigate(user ? `/community/${user.id}` : "/auth");
    else if (mode === "course") navigate("/products");
    else if (mode === "events") navigate(`/events/create?mode=${ticketingMode ?? "ticketed"}`);
    else navigate("/go-live");
    onDismiss();
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Your First Dollar</h2>
            <p className="text-xs text-muted-foreground">Step {step + 1} of 3</p>
          </div>
        </div>
        <button onClick={onDismiss} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Progress */}
      <div className="px-4 pt-3">
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <motion.div animate={{ width: `${((step + 1) / 3) * 100}%` }} className="h-full rounded-full bg-primary" />
        </div>
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h3 className="text-base font-semibold text-foreground mb-1">How do you want to earn?</h3>
              <p className="text-xs text-muted-foreground mb-4">Pick one to start. Add more later.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {MODES.map(m => (
                  <button key={m.id} onClick={() => setMode(m.id)}
                    className="p-3.5 rounded-xl text-left border transition-all"
                    style={{ borderColor: mode === m.id ? m.color : "hsl(var(--border))", background: mode === m.id ? `${m.color}12` : "hsl(var(--card))" }}>
                    <span className="text-lg">{m.emoji}</span>
                    <p className="text-sm font-semibold text-foreground mt-1">{m.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                  </button>
                ))}
              </div>

              {/* Events sub-question: ticketing model */}
              {mode === "events" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden mb-4">
                  <p className="text-xs font-semibold text-foreground mb-2">What kind of event?</p>
                  <div className="grid grid-cols-1 gap-2">
                    {TICKETING_MODES.map(t => (
                      <button key={t.id} onClick={() => setTicketingMode(t.id)}
                        className="p-3 rounded-xl text-left border transition-all flex gap-3 items-start"
                        style={{ borderColor: ticketingMode === t.id ? "#EC4899" : "hsl(var(--border))", background: ticketingMode === t.id ? "#EC489912" : "hsl(var(--card))" }}>
                        <span className="text-lg leading-none mt-0.5">{t.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{t.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              <Button onClick={() => setStep(1)} disabled={!mode || (mode === "events" && !ticketingMode)} className="w-full gap-1.5">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h3 className="text-base font-semibold text-foreground mb-1">Your link is ready</h3>
              <p className="text-xs text-muted-foreground mb-4">Share this everywhere — bio, DMs, stories.</p>
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border text-xs font-mono text-muted-foreground overflow-hidden">
                  <Link className="w-3.5 h-3.5 shrink-0 text-primary" />
                  <span className="truncate">{profileUrl}</span>
                </div>
                <Button onClick={copy} variant="outline" className="w-full gap-1.5">
                  {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
                </Button>
                <div className="flex gap-2">
                  {[{ l: "Instagram", e: "📸", h: "https://instagram.com" }, { l: "TikTok", e: "🎵", h: "https://tiktok.com" }, { l: "X", e: "🐦", h: `https://twitter.com/intent/tweet?text=Join me on UPLY 🚀 ${profileUrl}` }].map(p => (
                    <a key={p.l} href={p.h} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
                      <span>{p.e}</span>{p.l}
                    </a>
                  ))}
                </div>
              </div>
              <Button onClick={() => setStep(2)} className="w-full gap-1.5">Continue <ArrowRight className="w-4 h-4" /></Button>
            </motion.div>
          )}

          {step === 2 && mode && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h3 className="text-base font-semibold text-foreground mb-1">
                {mode === "live_shop" ? "Add your first product"
                  : mode === "community" ? "Launch your community"
                  : mode === "course" ? "Create your first course"
                  : mode === "events" ? (ticketingMode === "free_rsvp" ? "Open free RSVPs" : ticketingMode === "seated" ? "Build your seat map" : "Create your ticketed event")
                  : "Go live and earn tips"}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {mode === "live_shop" ? "Add a product to your live shop. Viewers buy it during your stream."
                  : mode === "community" ? "Set a monthly price, write a welcome post, open your community."
                  : mode === "course" ? "Upload videos, set a price, sell globally."
                  : mode === "events" ? "Cover, date, ticket tiers — published in under 60 seconds. Resale, transfers and QR check-in are on by default."
                  : "Go live now. Pin a tip message. Your audience will support you."}
              </p>
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center mb-4">
                <p className="text-3xl mb-1">{MODES.find(m => m.id === mode)?.emoji}</p>
                <p className="text-sm font-bold text-primary">You keep 95%</p>
                <p className="text-xs text-muted-foreground">UPLY takes only 5%. Every other platform takes 20–50%.</p>
              </div>
              <Button onClick={go} className="w-full gap-1.5 mb-2">
                {mode === "live_shop" ? "Set Up Live Shop →"
                  : mode === "community" ? "Launch Community →"
                  : mode === "course" ? "Create Product →"
                  : mode === "events" ? "Create Event →"
                  : "Go Live Now →"}
              </Button>
              <button onClick={onDismiss} className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors">I'll do this later</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
