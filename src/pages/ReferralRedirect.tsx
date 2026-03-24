import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { setAffiliateCookie } from "@/lib/affiliateCookies";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Video, DollarSign, Bot, Shield, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { motion, AnimatePresence } from "framer-motion";
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

  useEffect(() => {
    if (!actualCode) {
      navigate("/");
      return;
    }

    const fetchReferrer = async () => {
      const { data, error } = await supabase.rpc("lookup_referrer_by_code", {
        ref_code: actualCode,
      });

      if (data && !error) {
        const referrerData = data as unknown as ReferrerInfo;
        setReferrer(referrerData);

        // Set cookies AND localStorage immediately
        setAffiliateCookie("uply_waitlist_ref", actualCode, 30);
        if (referrerData.username) {
          setAffiliateCookie("uply_referrer_username", referrerData.username, 30);
        }
        if (referrerData.display_name) {
          setAffiliateCookie("uply_referrer_name", referrerData.display_name, 30);
        }
        if (referrerData.avatar_url) {
          try { localStorage.setItem("uply_referrer_avatar", referrerData.avatar_url); } catch {}
        }

        // Track click via edge function (fire and forget)
        supabase.functions.invoke("track-referral-click", {
          body: { code: actualCode },
        }).catch(() => {});
      } else {
        setAffiliateCookie("uply_waitlist_ref", actualCode, 30);
        setNotFound(true);
      }

      const { count } = await supabase
        .from("waitlist" as any)
        .select("*", { count: "exact", head: true }) as any;
      setTotalApplicants(count || 0);

      setLoading(false);
    };

    fetchReferrer();
  }, [actualCode, navigate]);

  useEffect(() => {
    if (!loading && notFound) {
      navigate("/auth?mode=signup");
    }
  }, [loading, notFound, navigate]);

  const firstName = referrer?.display_name?.split(" ")[0] || "Someone";

  const handleAcceptInvite = async () => {
    if (authLoading) return;

    // Cookies already set on page load, but reinforce them
    setAffiliateCookie("uply_waitlist_ref", actualCode!, 30);
    if (referrer?.display_name) {
      setAffiliateCookie("uply_referrer_name", referrer.display_name, 30);
      sessionStorage.setItem("referrer_name", referrer.display_name);
    }
    if (referrer?.avatar_url) {
      sessionStorage.setItem("referrer_avatar", referrer.avatar_url);
      try { localStorage.setItem("uply_referrer_avatar", referrer.avatar_url); } catch {}
    }
    if (referrer?.username) {
      setAffiliateCookie("uply_referrer_username", referrer.username, 30);
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

    const p = profile as any;
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

      <div className="min-h-screen flex flex-col items-center justify-start px-4 pt-12 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="mx-auto mb-4 relative w-[72px] h-[72px]">
            {referrer?.avatar_url ? (
              <img
                src={referrer.avatar_url}
                alt={referrer.display_name || "Referrer"}
                className="w-[72px] h-[72px] rounded-full object-cover"
                style={{ border: "3px solid hsl(var(--primary))" }}
              />
            ) : (
              <div
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-2xl font-bold"
                style={{
                  border: "3px solid hsl(var(--primary))",
                  background: "hsl(var(--primary) / 0.15)",
                  color: "hsl(var(--primary))",
                }}
              >
                {firstName[0]?.toUpperCase()}
              </div>
            )}
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="w-full max-w-[400px] rounded-xl p-6 mb-6 bg-card border border-border"
        >
          <h1
            className="text-[22px] sm:text-[26px] font-bold text-foreground leading-tight mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {firstName} thinks you belong on UPLY.
          </h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            UPLY is the creator platform where you go live, build your community, host courses, and get paid directly — all in one place.
            You keep 95% of everything you earn. {firstName} is already here and wanted you to have early access.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex items-center gap-2 text-xs text-muted-foreground mb-6 flex-wrap justify-center"
        >
          <span>{totalApplicants.toLocaleString()} creators on the waitlist</span>
          <span>·</span>
          <span>95% creator earnings</span>
          <span>·</span>
          <span>Free to start</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-[400px] space-y-3"
        >
          <Button
            onClick={handleAcceptInvite}
            className="w-full h-12 text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Accept {firstName}'s Invite →
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Waitlist & invite only · No credit card required
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-[400px] mt-10 space-y-4"
        >
          <p className="text-xs text-muted-foreground text-center uppercase tracking-wider font-semibold mb-4">
            Why creators choose UPLY
          </p>
          {[
            { icon: <Video className="w-5 h-5 text-primary flex-shrink-0" />, label: "Go Live & Get Discovered", desc: "Public streams with a built-in discovery feed" },
            { icon: <DollarSign className="w-5 h-5 text-primary flex-shrink-0" />, label: "Get Paid Directly", desc: "Subscriptions, tips, courses, and live commerce" },
            { icon: <Bot className="w-5 h-5 text-primary flex-shrink-0" />, label: "ARIA AI Growth Partner", desc: "Your personal AI advisor powered by Claude" },
          ].map((f) => (
            <div key={f.label} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
              {f.icon}
              <div>
                <p className="text-sm font-semibold text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-[400px] mt-8"
        >
          <Button
            onClick={handleAcceptInvite}
            className="w-full h-12 text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Accept Your Invite →
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
