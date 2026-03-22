import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { setAffiliateCookie } from "@/lib/affiliateCookies";
import { Loader2, Video, DollarSign, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { motion } from "framer-motion";

interface ReferrerInfo {
  display_name: string | null;
  avatar_url: string | null;
  creator_type: string | null;
  username: string | null;
}

export default function ReferralRedirect() {
  const { code, username } = useParams<{ code: string; username?: string }>();
  const navigate = useNavigate();
  const [referrer, setReferrer] = useState<ReferrerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalApplicants, setTotalApplicants] = useState(0);

  // Determine the actual referral code
  // Route can be /join/:code or /join/:username/:code
  const actualCode = code;

  useEffect(() => {
    if (!actualCode) {
      navigate("/");
      return;
    }

    const fetchReferrer = async () => {
      // Try to find referrer by referral_code on profiles
      let profile: ReferrerInfo | null = null;

      const { data: refProfile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, creator_type, username")
        .eq("referral_code", actualCode)
        .maybeSingle();

      if (refProfile) {
        profile = refProfile;
      } else {
        // Check invite_codes table
        const { data: invite } = await supabase
          .from("invite_codes" as any)
          .select("owner_id")
          .eq("code", actualCode)
          .maybeSingle() as any;

        if (invite?.owner_id) {
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url, creator_type, username")
            .eq("user_id", invite.owner_id)
            .maybeSingle();
          if (ownerProfile) profile = ownerProfile;
        }
      }

      // Check waitlist referral codes
      if (!profile) {
        const { data: wlEntry } = await supabase
          .from("waitlist" as any)
          .select("full_name, referrer_avatar_url")
          .eq("referral_code", actualCode)
          .maybeSingle() as any;
        if (wlEntry) {
          profile = {
            display_name: wlEntry.full_name,
            avatar_url: wlEntry.referrer_avatar_url || null,
            creator_type: null,
            username: null,
          };
        }
      }

      setReferrer(profile);

      // Get total applicants
      const { count } = await supabase
        .from("waitlist" as any)
        .select("*", { count: "exact", head: true }) as any;
      setTotalApplicants(count || 0);

      setLoading(false);
    };

    fetchReferrer();
  }, [actualCode]);

  const firstName = referrer?.display_name?.split(" ")[0] || "Someone";

  const handleAcceptInvite = () => {
    // Store referral cookie
    setAffiliateCookie("uply_waitlist_ref", actualCode!, 30);
    // Store referrer info in sessionStorage for the waitlist form
    if (referrer?.display_name) {
      sessionStorage.setItem("referrer_name", referrer.display_name);
    }
    if (referrer?.avatar_url) {
      sessionStorage.setItem("referrer_avatar", referrer.avatar_url);
    }
    if (referrer?.username) {
      sessionStorage.setItem("referrer_username", referrer.username);
    }
    navigate("/waitlist");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading invitation…</span>
        </div>
      </div>
    );
  }

  // If no referrer found, fall back to legacy redirect behavior
  if (!referrer) {
    setAffiliateCookie("uply_waitlist_ref", actualCode!, 30);
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title={`${firstName} invited you to join UPLY`}
        description={`Join ${firstName}'s community on UPLY — where creators get paid.`}
      />

      <div className="min-h-screen flex flex-col items-center justify-start px-4 pt-12 pb-20">
        {/* Personal invitation card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          {/* Referrer avatar */}
          <div className="mx-auto mb-4 relative w-[72px] h-[72px]">
            {referrer.avatar_url ? (
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

          {/* Name */}
          <p className="text-xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {referrer.display_name}
          </p>

          {/* Creator type */}
          {referrer.creator_type && (
            <p className="text-sm text-muted-foreground mt-1 capitalize">{referrer.creator_type} Creator</p>
          )}

          {/* Invite pill */}
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

        {/* Main invitation card */}
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

        {/* Social proof stats */}
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

        {/* Primary CTA */}
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

        {/* Feature section */}
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

        {/* Bottom CTA */}
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
