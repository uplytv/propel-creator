import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { setReferralData, getReferralData } from "@/lib/affiliateCookies";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Video, DollarSign, Bot, Shield, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { motion } from "framer-motion";
import LiveSignupTicker from "@/components/waitlist/LiveSignupTicker";

interface ReferrerInfo {
  display_name: string | null;
  avatar_url: string | null;
  creator_type: string | null;
  username: string | null;
}

export default function ReferralRedirect() {
  const { code, username } = useParams<{ code: string; username?: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [referrer, setReferrer] = useState<ReferrerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [totalApplicants, setTotalApplicants] = useState(0);

  const actualCode = code;
  const isBetaInvite = window.location.pathname.startsWith("/invite/");

  useEffect(() => {
    if (!actualCode) {
      navigate("/");
      return;
    }

    const fetchReferrer = async () => {
      let referrerData: ReferrerInfo | null = null;

      if (isBetaInvite) {
        // For /invite/ paths, look up via invite_codes table
        const { data: inviteRow } = await supabase
          .from("invite_codes")
          .select("owner_id, is_used")
          .eq("code", actualCode)
          .maybeSingle();

        if (inviteRow && !inviteRow.is_used) {
          // Get the owner's profile
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url, creator_type, username")
            .eq("user_id", inviteRow.owner_id)
            .single();

          if (ownerProfile) {
            referrerData = ownerProfile as unknown as ReferrerInfo;
          }

          // Store the invite code in cookie for onboarding to pick up
          try {
            document.cookie = `uply_invite_code=${actualCode}; path=/; max-age=86400; SameSite=Lax`;
            sessionStorage.setItem("uply_invite_type", "beta");
          } catch {}
        } else if (inviteRow?.is_used) {
          // Code already used
          setNotFound(true);
          setLoading(false);
          return;
        }
      }

      // Fallback: try standard referral code lookup
      if (!referrerData) {
        const { data, error } = await supabase.rpc("lookup_referrer_by_code", {
          ref_code: actualCode,
        });

        if (data && !error) {
          referrerData = data as unknown as ReferrerInfo;
          if (!isBetaInvite) {
            sessionStorage.setItem("uply_invite_type", "waitlist");
          }
        }
      }

      if (referrerData) {
        setReferrer(referrerData);

        // Write to ALL THREE storage methods simultaneously
        setReferralData(
          actualCode,
          referrerData.username || username || null,
          referrerData.display_name || null
        );

        if (referrerData.avatar_url) {
          try { localStorage.setItem("uply_referrer_avatar", referrerData.avatar_url); } catch {}
        }

        // Track click (fire and forget)
        supabase.functions.invoke("track-referral-click", {
          body: { code: actualCode },
        }).catch(() => {});
      } else {
        setReferralData(actualCode, username || null, null);
        setNotFound(true);
      }

      const { count } = await supabase
        .from("waitlist")
        .select("*", { count: "exact", head: true }) as { count: number | null };
      setTotalApplicants(count || 0);

      setLoading(false);
    };

    fetchReferrer();
  }, [actualCode, navigate, username]);

  useEffect(() => {
    if (!loading && notFound) {
      if (isBetaInvite) {
        toast.error("This invite code is invalid or has already been used.");
      }
      navigate("/auth?mode=signup");
    }
  }, [loading, notFound, navigate]);

  const firstName = referrer?.display_name?.split(" ")[0] || "Someone";

  const handleAcceptInvite = async () => {
    if (authLoading) return;

    // Reinforce storage on button tap (reads current data and re-writes)
    const current = getReferralData();
    if (current.code) {
      setReferralData(current.code, current.username || referrer?.username || null, current.name || referrer?.display_name || null);
    }

    if (referrer?.avatar_url) {
      try {
        localStorage.setItem("uply_referrer_avatar", referrer.avatar_url);
        sessionStorage.setItem("referrer_avatar", referrer.avatar_url);
      } catch {}
    }
    if (referrer?.display_name) {
      sessionStorage.setItem("referrer_name", referrer.display_name);
    }
    if (referrer?.username) {
      sessionStorage.setItem("referrer_username", referrer.username);
    }

    // Route based on auth state
    if (!user) {
      navigate("/auth?mode=signup", { replace: true });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete, is_approved")
      .eq("user_id", user.id)
      .single();

    const p = profile as Record<string, unknown> | null;
    if (!p?.onboarding_complete) {
      navigate("/onboarding", { replace: true });
    } else if (p?.is_approved) {
      navigate("/discover", { replace: true });
    } else {
      navigate("/waitlist", { replace: true });
    }
  };

  if (loading || notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading invitation…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title={`${firstName} invited you to join UPLY`}
        description={`Join ${firstName}'s community on UPLY — where creators get paid.`}
      />

      <div className="min-h-screen flex flex-col items-center justify-start px-4 pt-10 pb-20">
        {/* Urgency bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-xs"
          style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.2)" }}
        >
          <Clock className="w-3 h-3 text-primary" />
          <span className="text-muted-foreground">
            {isBetaInvite
              ? <>Beta access · <span className="text-primary font-semibold">Skips the waitlist entirely</span></>
              : <>Invite-only access · <span className="text-primary font-semibold">Limited spots</span></>
            }
          </span>
        </motion.div>

        {/* Avatar + name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6"
        >
          <div className="mx-auto mb-4 relative w-[80px] h-[80px]">
            {referrer?.avatar_url ? (
              <img
                src={referrer.avatar_url}
                alt={referrer.display_name || "Referrer"}
                className="w-[80px] h-[80px] rounded-full object-cover"
                style={{ border: "3px solid hsl(var(--primary))" }}
              />
            ) : (
              <div
                className="w-[80px] h-[80px] rounded-full flex items-center justify-center text-2xl font-bold"
                style={{
                  border: "3px solid hsl(var(--primary))",
                  background: "hsl(var(--primary) / 0.15)",
                  color: "hsl(var(--primary))",
                }}
              >
                {firstName[0]?.toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />
          </div>

          <p className="text-xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {referrer?.display_name}
          </p>

          {referrer?.creator_type && (
            <p className="text-sm text-muted-foreground mt-1 capitalize">
              {referrer.creator_type.toLowerCase().includes('creator') ? referrer.creator_type : `${referrer.creator_type} Creator`}
            </p>
          )}

          <div
            className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: "hsl(var(--primary) / 0.1)",
              color: "hsl(var(--primary))",
              border: "1px solid hsl(var(--primary) / 0.3)",
            }}
          >
            ✉️ Sent you a personal invite
          </div>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="w-full max-w-[400px] rounded-xl p-6 mb-4 bg-card border border-border"
        >
          <h1
            className="text-[22px] sm:text-[26px] font-bold text-foreground leading-tight mb-3"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {isBetaInvite
              ? `${firstName} is giving you their beta invite.`
              : `${firstName} thinks you belong on UPLY.`
            }
          </h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            UPLY is the creator platform where you go live, build your community, host courses, and get paid directly — all in one place.
            You keep <span className="text-primary font-semibold">95%</span> of everything you earn.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{totalApplicants.toLocaleString()}+</p>
              <p className="text-[10px] text-muted-foreground">Creators waiting</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">95%</p>
              <p className="text-[10px] text-muted-foreground">Creator earnings</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">5%</p>
              <p className="text-[10px] text-muted-foreground">Platform fee</p>
            </div>
          </div>
        </motion.div>

        {/* Live signup ticker */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-5">
          <LiveSignupTicker />
        </motion.div>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-[400px] space-y-3"
        >
          <Button
            onClick={handleAcceptInvite}
            className="w-full h-14 text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 relative overflow-hidden group"
          >
            <span className="relative z-10">Accept {firstName}'s Invite →</span>
            <motion.div
              className="absolute inset-0 bg-white/10"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            />
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            {isBetaInvite
              ? "✓ Immediate beta access · ✓ No waitlist · ✓ No credit card required"
              : `✓ Free to apply · ✓ No credit card · ✓ ${firstName}'s invite skips the line`
            }
          </p>
        </motion.div>

        {/* Exclusive perks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-[400px] mt-8"
        >
          <p className="text-xs text-muted-foreground text-center uppercase tracking-wider font-semibold mb-4">
            What you're getting early access to
          </p>

          {[
            { icon: <Video className="w-5 h-5 text-primary flex-shrink-0" />, label: "Go Live & Get Discovered", desc: "Stream to a built-in audience. Tips, reactions, and live shopping." },
            { icon: <DollarSign className="w-5 h-5 text-primary flex-shrink-0" />, label: "7 Revenue Streams", desc: "Subscriptions, tips, courses, events, DMs, products, affiliates." },
            { icon: <Bot className="w-5 h-5 text-primary flex-shrink-0" />, label: "ARIA AI Growth Partner", desc: "Your personal AI advisor that helps you grow and earn more." },
            { icon: <Shield className="w-5 h-5 text-primary flex-shrink-0" />, label: "Founding Creator Perks", desc: "Early members get permanent benefits and 0% fee opportunities." },
          ].map((f) => (
            <div key={f.label} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border mb-2">
              {f.icon}
              <div>
                <p className="text-sm font-semibold text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Testimonial */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-[400px] mt-8 rounded-xl p-5 bg-card border border-border text-center"
        >
          <p className="text-sm text-foreground italic leading-relaxed mb-3">
            "I missed the early days of YouTube and Twitch. When a friend sent me UPLY, I knew I couldn't miss another wave. The waitlist is real — get in now."
          </p>
          <p className="text-xs text-muted-foreground">— Early UPLY creator</p>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="w-full max-w-[400px] mt-8"
        >
          <Button
            onClick={handleAcceptInvite}
            className="w-full h-12 text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Accept Your Invite →
          </Button>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            🔒 Your spot is reserved for 48 hours
          </p>
        </motion.div>

        {/* Already have an account */}
        <div className="w-full max-w-[400px] mt-6 text-center border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Already have a UPLY account?{" "}
            <button onClick={() => navigate("/auth")} className="text-primary font-medium hover:underline">Log in →</button>
          </p>
        </div>
      </div>
    </div>
  );
}
