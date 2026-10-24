import { useState } from "react";
import { DollarSign, ShoppingBag, Users, BookOpen, Zap, CalendarDays, ArrowRight, X, Copy, Check, Link, Ticket, UserCheck, Armchair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { SITE_URL } from "@/lib/siteUrl";

const MODES = [
  { id: "community", icon: Users, emoji: "🤝", label: "Membership", desc: "Monthly price. Fans pay to stay in.", color: "#3D7CFF", cta: "Set membership price" },
  { id: "events", icon: CalendarDays, emoji: "🎟️", label: "Tickets", desc: "Sell a show. QR check-in is built in.", color: "#EC4899", cta: "Create the event" },
  { id: "ppv", icon: DollarSign, emoji: "🎬", label: "Pay-per-view", desc: "Charge to watch you live. Unlimited and Agency Pro.", color: "#B025FF", cta: "Set pay-per-view price" },
  { id: "tips", icon: Zap, emoji: "⚡", label: "Tips", desc: "Go live and let fans tip.", color: "#9333EA", cta: "Go live for tips" },
  { id: "course", icon: BookOpen, emoji: "📚", label: "Course", desc: "Sell a lesson series once.", color: "#F59E0B", cta: "Create the course" },
  { id: "live_shop", icon: ShoppingBag, emoji: "🛍️", label: "Live shop", desc: "Sell a product while you stream.", color: "#00AEEF", cta: "Set up live shop" },
];

const TICKETING_MODES = [
  { id: "ticketed", icon: Ticket, emoji: "🎟️", label: "Ticketed", desc: "Paid tickets and QR check-in." },
  { id: "free_rsvp", icon: UserCheck, emoji: "✋", label: "Free RSVP", desc: "Collect names. No charge." },
  { id: "seated", icon: Armchair, emoji: "💺", label: "Assigned seating", desc: "Buyers pick a seat." },
];

export default function FirstDollarWizard({ onDismiss, username }: { onDismiss: () => void; username: string | null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<string | null>(null);
  const [ticketingMode, setTicketingMode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const profileUrl = username ? `${SITE_URL}/${username}` : `${SITE_URL}/dashboard`;
  const selected = MODES.find((m) => m.id === mode);
  const ready = !!mode && (mode !== "events" || !!ticketingMode);

  const copy = async () => {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const go = () => {
    if (!ready) return;
    if (mode === "community") navigate(user ? `/community/${user.id}/pricing` : "/auth");
    else if (mode === "course") navigate("/products");
    else if (mode === "events") navigate(`/events/create?mode=${ticketingMode ?? "ticketed"}`);
    else navigate("/go-live");
    onDismiss();
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Create your first paid offer</h2>
            <p className="text-xs text-muted-foreground">Pick one. You set the price on the next screen. You keep 95%.</p>
          </div>
        </div>
        <button type="button" onClick={onDismiss} aria-label="Dismiss offer setup" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              className="p-3.5 rounded-xl text-left border transition-all"
              style={{ borderColor: mode === m.id ? m.color : "hsl(var(--border))", background: mode === m.id ? `${m.color}12` : "hsl(var(--card))" }}
            >
              <span className="text-lg">{m.emoji}</span>
              <p className="text-sm font-semibold text-foreground mt-1">{m.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
            </button>
          ))}
        </div>

        {mode === "events" && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-foreground mb-2">What kind of event?</p>
            <div className="grid grid-cols-1 gap-2">
              {TICKETING_MODES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTicketingMode(t.id)}
                  aria-pressed={ticketingMode === t.id}
                  className="p-3 rounded-xl text-left border transition-all flex gap-3 items-start"
                  style={{ borderColor: ticketingMode === t.id ? "#EC4899" : "hsl(var(--border))", background: ticketingMode === t.id ? "#EC489912" : "hsl(var(--card))" }}
                >
                  <span className="text-lg leading-none mt-0.5">{t.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
          <Link className="w-3.5 h-3.5 shrink-0 text-primary" aria-hidden />
          <span className="truncate font-mono flex-1">{profileUrl}</span>
          <button type="button" onClick={copy} className="shrink-0 inline-flex items-center gap-1 font-medium text-foreground hover:text-primary">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>

        <Button onClick={go} disabled={!ready} className="w-full gap-1.5 mb-2">
          {selected?.cta ?? "Set it up"} <ArrowRight className="w-4 h-4" />
        </Button>
        <button type="button" onClick={onDismiss} className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors">
          I’ll do this later
        </button>
      </div>
    </div>
  );
}
