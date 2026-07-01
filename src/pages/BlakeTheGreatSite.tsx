import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check,
  TrendingUp,
  Trophy,
  Bell,
  MessageSquare,
  BookOpen,
  Zap,
  Loader2,
} from "lucide-react";
import portraitAsset from "@/assets/blake-portrait.jpg.asset.json";
import lifestyleAsset from "@/assets/blake-lifestyle.jpg";
import portfolioAsset from "@/assets/blake-portfolio.jpg";
import betAsset from "@/assets/blake-bet-win.jpg";
import tradingAsset from "@/assets/blake-trading-desk.jpg";
import BackButton from "@/components/common/BackButton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const FEATURES = [
  {
    icon: Bell,
    title: "Live trade alerts",
    body: "Real-time pings the moment Blake enters or exits a position — same trades, same timing.",
  },
  {
    icon: Trophy,
    title: "Daily sports plays",
    body: "1–3 vetted picks per day. Parlay drops, live in-game hedges, and bankroll strategy.",
  },
  {
    icon: BookOpen,
    title: "The Blueprint playbook",
    body: "Blake's exact rules for entries, position sizing, and cutting losses fast.",
  },
  {
    icon: MessageSquare,
    title: "Private Discord",
    body: "Ask questions, share trades, and grind with a room of serious bettors and traders.",
  },
  {
    icon: Zap,
    title: "Weekly live sessions",
    body: "Screen-share breakdowns, chart reviews, and Q&A every week.",
  },
  {
    icon: TrendingUp,
    title: "Portfolio reviews",
    body: "Submit your account for a monthly Blake review — real feedback on your setup.",
  },
];

const TESTIMONIALS = [
  {
    name: "Marcus D.",
    quote:
      "Followed Blake's Tesla call on day 3. Cleared $4,200 that week. This paid for itself in an afternoon.",
  },
  {
    name: "Ryan K.",
    quote:
      "The parlay alerts alone are worth $97 a month. Hit 3 out of 4 last weekend.",
  },
  {
    name: "Jamie L.",
    quote:
      "I've done other trading rooms. Nothing else moves this fast or is this transparent.",
  },
];

export default function BlakeTheGreatSite() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "The Blueprint by Blake The Great — $97/mo";
    const meta = document.querySelector('meta[name="description"]');
    const desc =
      "Join The Blueprint — Blake's live trade alerts, daily sports picks, private Discord and weekly sessions. $97/month.";
    if (meta) meta.setAttribute("content", desc);
  }, []);

  // Already-authed subscribers land here from marketing links — send them
  // straight to the gated members area, which handles the sub check itself.
  const startCheckout = async () => {
    if (!user) {
      const redir = encodeURIComponent("/blake-the-great/members");
      const emailHint = email ? `&email=${encodeURIComponent(email)}` : "";
      toast.message("Create an account to subscribe", {
        description: "You'll be sent back to checkout right after.",
      });
      navigate(`/auth?redirect=${redir}${emailHint}`);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-blake-checkout",
      );
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't start checkout");
      setLoading(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user && (!email || !email.includes("@"))) {
      toast.error("Enter a valid email to continue.");
      return;
    }
    startCheckout();
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <BackButton />

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `linear-gradient(rgba(10,10,10,0.6), rgba(10,10,10,0.95)), url(${tradingAsset})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="max-w-4xl mx-auto px-6 pt-20 pb-14 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[#00FF85] mb-3">
            The Blueprint · Monthly Membership
          </p>
          <h1 className="font-display font-bold text-4xl md:text-6xl leading-tight">
            Trade the market.
            <br />
            <span className="text-[#00FF85]">Beat the book.</span>
          </h1>
          <p className="mt-5 text-white/70 text-base md:text-lg max-w-2xl mx-auto">
            Every alert Blake sends. Every trade he takes. Every sports bet he
            fires. $97/month — cancel anytime.
          </p>

          <form
            onSubmit={handleJoin}
            className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              inputMode="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-12 px-4 rounded-xl bg-white/5 border border-white/15 text-[16px] focus:outline-none focus:border-[#00FF85]"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-12 px-6 rounded-xl font-semibold bg-[#00FF85] text-black hover:bg-[#00FF85]/90 transition disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Starting…" : "Join for $97/mo"}
            </button>
          </form>
          <p className="mt-3 text-xs text-white/40">
            Secure checkout. 7-day money-back if the first week doesn't pay for
            itself.
          </p>
        </div>
      </section>

      {/* Proof numbers */}
      <section className="max-w-4xl mx-auto px-6 py-10 border-y border-white/10">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl md:text-4xl font-bold text-[#00FF85]">
              614%
            </div>
            <div className="text-xs uppercase tracking-wider text-white/50 mt-1">
              40-day return
            </div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold text-[#00FF85]">
              $430K
            </div>
            <div className="text-xs uppercase tracking-wider text-white/50 mt-1">
              Realized gains
            </div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold text-[#00FF85]">
              72%
            </div>
            <div className="text-xs uppercase tracking-wider text-white/50 mt-1">
              Bet hit rate
            </div>
          </div>
        </div>
      </section>

      {/* Proof gallery */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="font-display font-bold text-2xl md:text-3xl mb-6">
          Receipts, not promises.
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[portfolioAsset, betAsset, lifestyleAsset, tradingAsset].map(
            (src, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5"
              >
                <img
                  src={src}
                  alt="Proof"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            ),
          )}
        </div>
      </section>

      {/* What you get */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="font-display font-bold text-2xl md:text-3xl mb-8 text-center">
          What's inside The Blueprint
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="h-10 w-10 rounded-lg bg-[#00FF85]/15 text-[#00FF85] flex items-center justify-center mb-3">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-semibold mb-1">{f.title}</div>
                <p className="text-sm text-white/60 leading-relaxed">
                  {f.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="font-display font-bold text-2xl md:text-3xl mb-8 text-center">
          Members shipping wins
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <p className="text-sm text-white/80 leading-relaxed">
                "{t.quote}"
              </p>
              <div className="mt-4 text-xs text-white/50">— {t.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing card */}
      <section className="max-w-lg mx-auto px-6 py-12">
        <div className="rounded-3xl border-2 border-[#00FF85]/40 bg-[#00FF85]/[0.04] p-8 text-center">
          <img
            src={portraitAsset.url}
            alt="Blake"
            className="h-20 w-20 rounded-full object-cover mx-auto ring-2 ring-[#00FF85]/50 mb-4"
          />
          <div className="text-xs uppercase tracking-[0.25em] text-[#00FF85] mb-2">
            The Blueprint
          </div>
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="text-5xl font-bold">$97</span>
            <span className="text-white/60">/month</span>
          </div>
          <div className="text-xs text-white/50 mb-6">
            Cancel anytime · Instant Discord access
          </div>

          <ul className="text-left space-y-2 mb-6">
            {[
              "Live trade alerts (stocks & options)",
              "Daily sports picks + parlays",
              "Private Discord community",
              "Weekly live sessions with Blake",
              "The Blueprint playbook PDF",
              "Monthly portfolio reviews",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-[#00FF85] mt-0.5 shrink-0" />
                <span className="text-white/85">{item}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() =>
              (window.location.href =
                "mailto:blake@blakethegreat.com?subject=Join%20The%20Blueprint%20-%20%2497%2Fmo")
            }
            className="w-full h-12 rounded-xl font-semibold bg-[#00FF85] text-black hover:bg-[#00FF85]/90 transition"
          >
            Join for $97/month
          </button>
          <p className="mt-3 text-xs text-white/40">
            7-day money-back guarantee
          </p>
        </div>

        <p className="text-[10px] text-white/40 text-center mt-8 leading-relaxed max-w-md mx-auto">
          Trading and sports betting involve risk. Past performance does not
          guarantee future results. Educational content only — never bet or
          invest more than you can afford to lose.
        </p>
      </section>

      <footer className="max-w-4xl mx-auto px-6 py-8 text-center border-t border-white/5">
        <Link to="/blake" className="text-sm text-white/50 hover:text-white">
          ← Back to Blake's profile
        </Link>
      </footer>
    </main>
  );
}
