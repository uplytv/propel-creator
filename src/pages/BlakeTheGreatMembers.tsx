import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Loader2,
  Lock,
  MessageSquare,
  Bell,
  BookOpen,
  Video,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import portraitAsset from "@/assets/blake-portrait.jpg.asset.json";
import tradingAsset from "@/assets/blake-trading-desk.jpg";
import BackButton from "@/components/common/BackButton";

/**
 * Gated members-only area for The Blueprint subscribers.
 * Verifies an active Stripe subscription via check-blake-subscription
 * on mount. Non-subscribers see a locked screen with a Join CTA.
 */
export default function BlakeTheGreatMembers() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [endsAt, setEndsAt] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Members Area — The Blueprint";
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setChecking(false);
      return;
    }

    let cancelled = false;
    const verify = async () => {
      setChecking(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "check-blake-subscription",
        );
        if (cancelled) return;
        if (error) throw error;
        setSubscribed(!!data?.subscribed);
        setEndsAt(data?.subscription_end ?? null);
        if (data?.subscribed && params.get("checkout") === "success") {
          toast.success("You're in. Welcome to The Blueprint.");
        }
      } catch (e: any) {
        toast.error(e?.message ?? "Couldn't verify subscription");
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    verify();
    // Re-check every 60s as a safety net for Stripe eventual consistency.
    const t = setInterval(verify, 60_000);

    // Instant unlock: listen for webhook-driven row changes.
    const channel = supabase
      .channel(`blake-sub-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "blake_subscribers",
          filter: `user_id=eq.${user.id}`,
        },
        () => verify(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(t);
      supabase.removeChannel(channel);
    };
  }, [user, authLoading, params]);

  const handleJoin = async () => {
    if (!user) {
      navigate("/auth?redirect=/blake-the-great/members");
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-blake-checkout",
      );
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't start checkout");
    }
  };

  // Loading state
  if (authLoading || checking) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#00FF85]" />
      </main>
    );
  }

  // Locked state — no user or no active sub
  if (!user || !subscribed) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white">
        <BackButton />
        <div className="max-w-md mx-auto px-6 pt-24 text-center">
          <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 mx-auto flex items-center justify-center mb-6">
            <Lock className="h-7 w-7 text-white/60" />
          </div>
          <h1 className="font-display font-bold text-2xl md:text-3xl mb-3">
            Members only
          </h1>
          <p className="text-white/60 mb-8 leading-relaxed">
            The Blueprint members area is locked to active $97/month subscribers.
            {!user && " Sign in and join to unlock."}
          </p>
          <button
            onClick={handleJoin}
            className="w-full h-12 rounded-xl font-semibold bg-[#00FF85] text-black hover:bg-[#00FF85]/90 transition"
          >
            {user ? "Join for $97/month" : "Sign in & Join"}
          </button>
          <Link
            to="/blake-the-great/course"
            className="block mt-4 text-sm text-white/50 hover:text-white"
          >
            See what's inside →
          </Link>
        </div>
      </main>
    );
  }

  // Unlocked
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white pb-24">
      <BackButton />

      <section className="relative isolate overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `linear-gradient(rgba(10,10,10,0.7), rgba(10,10,10,0.95)), url(${tradingAsset})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="max-w-4xl mx-auto px-6 pt-14 pb-10">
          <div className="flex items-center gap-3 mb-4">
            <img
              src={portraitAsset.url}
              alt="Blake"
              className="h-12 w-12 rounded-full object-cover ring-1 ring-[#00FF85]/50"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.25em] text-[#00FF85]">
                  The Blueprint
                </span>
                <CheckCircle2 className="h-4 w-4 text-[#00FF85]" />
              </div>
              <div className="text-sm text-white/60">Member since today</div>
            </div>
          </div>
          <h1 className="font-display font-bold text-3xl md:text-4xl">
            Welcome to the room.
          </h1>
          <p className="mt-3 text-white/70 max-w-xl">
            Live alerts, daily plays, and the full playbook — all in one place.
          </p>
          {endsAt && (
            <p className="mt-4 text-xs text-white/40">
              Renews {new Date(endsAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-10 grid md:grid-cols-2 gap-4">
        <MemberCard
          icon={MessageSquare}
          title="Private Discord"
          body="The main room. Live chat, trade posts, and daily bets."
          cta="Open Discord"
          href="https://discord.gg/blakethegreat"
        />
        <MemberCard
          icon={Bell}
          title="Live Trade Alerts"
          body="Push notifications the second Blake enters or exits a position."
          cta="Manage alerts"
          href="#alerts"
        />
        <MemberCard
          icon={TrendingUp}
          title="Today's Sports Plays"
          body="Blake's picks, spreads, and parlay builds for tonight's slate."
          cta="View picks"
          href="#picks"
        />
        <MemberCard
          icon={Video}
          title="Weekly Live Sessions"
          body="Every Sunday at 5pm PT. Chart breakdowns and Q&A."
          cta="Session archive"
          href="#sessions"
        />
        <MemberCard
          icon={BookOpen}
          title="The Blueprint Playbook"
          body="Blake's exact entry, sizing, and exit rules — the full PDF."
          cta="Download PDF"
          href="#playbook"
        />
        <MemberCard
          icon={CheckCircle2}
          title="Portfolio Review"
          body="Submit your account once a month for personal Blake feedback."
          cta="Submit for review"
          href="#review"
        />
      </section>

      <div className="max-w-4xl mx-auto px-6 text-center">
        <p className="text-xs text-white/40">
          Need to update your card or cancel? Email{" "}
          <a
            href="mailto:blake@blakethegreat.com"
            className="text-white/60 hover:text-white"
          >
            blake@blakethegreat.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}

function MemberCard({
  icon: Icon,
  title,
  body,
  cta,
  href,
}: {
  icon: any;
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  const isExternal = href.startsWith("http");
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col">
      <div className="h-10 w-10 rounded-lg bg-[#00FF85]/15 text-[#00FF85] flex items-center justify-center mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-semibold mb-1">{title}</div>
      <p className="text-sm text-white/60 leading-relaxed flex-1">{body}</p>
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noreferrer" : undefined}
        className="mt-4 inline-flex items-center justify-center h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition"
      >
        {cta}
      </a>
    </div>
  );
}
