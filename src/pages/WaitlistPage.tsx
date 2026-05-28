import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Copy, Check, Trophy, Crown, Shield, MessageCircle, Twitter, LogOut, ArrowLeft, Ticket, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import OriginBadge from "@/components/OriginBadge";
import logoImg from "@/assets/logo.png";
import { buildReferralUrl, buildReferralUrlDisplay, getFirstName, getShareMessages } from "@/lib/referralUrls";
import { getReferralData } from "@/lib/affiliateCookies";
import PostApplicationScreen from "@/components/waitlist/PostApplicationScreen";
import { isIOS, isNative } from "@/lib/native/platform";

const IOS_BLOCKED = isNative() && isIOS();

interface LeaderboardEntry {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  referral_count: number;
  role_type: string | null;
  origin_member: boolean;
}

export default function WaitlistPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justApplied = searchParams.get("applied") === "true";

  const [profile, setProfile] = useState<any>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [rank, setRank] = useState(0);
  const [totalWaitlist, setTotalWaitlist] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [waitlistPosition, setWaitlistPosition] = useState(0);
  const [showPostApp, setShowPostApp] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [redeemingCode, setRedeemingCode] = useState(false);
  const [foundersLoading, setFoundersLoading] = useState(false);

  const startFoundersCheckout = async () => {
    if (!user) return;
    setFoundersLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-founders-checkout");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (e: any) {
      toast.error(e.message || "Could not start checkout");
      setFoundersLoading(false);
    }
  };

  const redeemInviteCode = async () => {
    if (!user || !inviteInput.trim()) return;
    setRedeemingCode(true);
    try {
      const { data: inviteResult } = await supabase.rpc("validate_invite_code", { p_code: inviteInput.trim().toUpperCase() }) as any;
      const invite = inviteResult && inviteResult.id && !inviteResult.is_used ? inviteResult : null;
      if (!invite) {
        toast.error("Invalid or already used invite code");
        setRedeemingCode(false);
        return;
      }
      // Mark code as used
      await (supabase as any)
        .from("invite_codes")
        .update({ is_used: true, used_by: user.id, used_at: new Date().toISOString() })
        .eq("id", invite.id);
      // Create referral link
      if (invite.owner_id !== user.id) {
        await supabase.from("referrals").insert({ referrer_id: invite.owner_id, referred_id: user.id } as any);
      }
      // Approve the user
      await supabase.from("profiles").update({ is_approved: true, beta_access_granted_at: new Date().toISOString() } as any).eq("user_id", user.id);
      toast.success("🎉 You're in! Beta access granted.");
      navigate("/discover", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    }
    setRedeemingCode(false);
  };

  const fetchData = async () => {
    if (!user) return;

    const [profRes, configRes] = await Promise.all([
      supabase.from("profiles").select("referral_code, first_name, last_name, display_name, is_approved, avatar_url, role_type, origin_member, username").eq("user_id", user.id).single(),
      supabase.from("waitlist_config").select("*").limit(1).single(),
    ]);
    setProfile(profRes.data);
    setConfig(configRes.data);

    // Redirect approved users to discover
    if (profRes.data?.is_approved) {
      navigate("/discover", { replace: true });
      return;
    }

    // Combined referral count from both waitlist + post-signup referrals
    const [{ count: postSignupRefs }, { data: wlRow }] = await Promise.all([
      supabase.from("referrals").select("*", { count: "exact", head: true }).eq("referrer_id", user.id) as any,
      supabase.from("waitlist").select("referral_count, position").eq("email", user.email!).order("created_at", { ascending: false }).limit(1).maybeSingle() as any,
    ]);
    const combinedCount = (postSignupRefs || 0) + ((wlRow as any)?.referral_count || 0);
    setReferralCount(combinedCount);
    setWaitlistPosition((wlRow as any)?.position || 0);

    // Get total waitlist
    const { count: wlCount } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true }) as any;
    setTotalWaitlist(wlCount || 0);

    // Check if this is a fresh application
    if (justApplied) {
      const storedPos = sessionStorage.getItem("waitlist_position");
      if (storedPos && parseInt(storedPos) > 0) {
        setWaitlistPosition(parseInt(storedPos));
      }
      setShowPostApp(true);
    }

    // Unified leaderboard
    const { data: topReferrers } = await (supabase as any)
      .from("unified_referral_leaderboard")
      .select("user_id, display_name, username, avatar_url, total_referrals, is_approved, origin_member, role_type")
      .gt("total_referrals", 0)
      .order("total_referrals", { ascending: false })
      .limit(20);

    if (topReferrers) {
      const entries: LeaderboardEntry[] = topReferrers.map((r: any) => ({
        user_id: r.user_id,
        first_name: r.display_name?.split(" ")[0] || null,
        last_name: r.display_name?.split(" ")[1] || null,
        display_name: r.display_name,
        referral_count: r.total_referrals,
        role_type: r.role_type,
        origin_member: r.origin_member || false,
      }));
      setLeaderboard(entries);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth?mode=signup", { replace: true });
      return;
    }

    // Verify founders access purchase if returning from Stripe
    const foundersSession = searchParams.get("founders_session");
    if (foundersSession) {
      (async () => {
        try {
          const { data, error } = await supabase.functions.invoke("verify-founders-access", {
            body: { session_id: foundersSession },
          });
          if (error) throw error;
          if (data?.granted) {
            toast.success("🚀 Founders Access activated. Welcome in!");
            navigate("/discover", { replace: true });
            return;
          }
          toast.error("Payment is still processing. Refresh in a moment.");
        } catch (e: any) {
          toast.error(e.message || "Could not verify your purchase");
        }
      })();
    }

    if (searchParams.get("founders_cancelled")) {
      toast.info("Founders Access checkout cancelled");
    }

    fetchData();
    const channel = supabase
      .channel("waitlist-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "waitlist" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loading, user, navigate, searchParams]);

  const referralCode = (profile as any)?.referral_code || "";
  const profileUsername = (profile as any)?.username || (profile as any)?.display_name;
  const fullUrl = buildReferralUrl(referralCode, profileUsername);
  const displayUrlStr = buildReferralUrlDisplay(referralCode, profileUsername);
  const myFirstName = getFirstName((profile as any)?.display_name);
  const shareMessages = getShareMessages(myFirstName, fullUrl);

  const copyLink = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setLinkCopied(true);
    toast.success("Invite link copied — share it with creators you know 🚀");
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessages.twitter)}`, "_blank");
  };

  const shareSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(shareMessages.sms)}`, "_self");
  };

  const formatName = (entry: LeaderboardEntry) => {
    const first = entry.first_name || entry.display_name?.split(" ")[0] || "User";
    const lastInitial = entry.last_name?.[0] || entry.display_name?.split(" ")[1]?.[0] || "";
    return lastInitial ? `${first} ${lastInitial}.` : first;
  };

  const nextMilestone = referralCount < 1 ? { count: 1, label: "Confirm your spot" } :
    referralCount < 3 ? { count: 3, label: "Jump 500 spots + Sneak Peek" } :
    referralCount < 10 ? { count: 10, label: "Immediate Access + UPLY Origin" } :
    null;

  const tiers = [
    { emoji: "✅", label: "1 Referral", desc: "Spot Confirmed", done: referralCount >= 1 },
    { emoji: "🚀", label: "3 Referrals", desc: "Jump 500 Spots + Sneak Peek Access", done: referralCount >= 3 },
    { emoji: "⚡", label: "10 Referrals", desc: "Immediate Access + Lifetime UPLY Origin Status", done: referralCount >= 10 },
    { emoji: "💰", label: "#1 Overall", desc: "$10,000 Cash Prize", done: false },
  ];

  const leader = leaderboard[0];

  // Countdown
  const endDate = config?.end_date ? new Date(config.end_date) : null;
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    if (!endDate) return;
    const update = () => {
      const diff = endDate.getTime() - Date.now();
      if (diff <= 0) { setCountdown("Contest ended"); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setCountdown(`${days}d ${hours}h ${mins}m`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  // Show post-application screen
  if (showPostApp) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground">
        <div className="px-6 pt-6 pb-2 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <img src={logoImg} alt="UPLY" className="w-8 h-8 object-contain" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{totalWaitlist} on waitlist</span>
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate("/", { replace: true }); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-3 h-3" /> Sign out
            </button>
          </div>
        </div>
        <PostApplicationScreen
          position={waitlistPosition}
          referralCode={referralCode}
          referralCount={referralCount}
          email={user.email || ""}
          displayName={(profile as any)?.display_name}
          username={profileUsername}
          totalApplicants={totalWaitlist}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Header */}
      <div className="px-6 pt-6 pb-2 flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <img src={logoImg} alt="UPLY" className="w-8 h-8 object-contain" />
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{totalWaitlist} on waitlist</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate("/", { replace: true }); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-3 h-3" /> Sign out
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 pb-16">
        {/* Position card (if has position) */}
        {waitlistPosition > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-6 mb-6 text-center"
            style={{ background: "hsl(var(--background))", border: "2px solid hsl(var(--primary))" }}
          >
            <p className="text-[10px] font-semibold tracking-widest uppercase mb-1 text-muted-foreground">YOUR POSITION</p>
            <p className="text-5xl font-extrabold text-primary mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              #{waitlistPosition}
            </p>
            <p className="text-xs text-muted-foreground">out of {totalWaitlist.toLocaleString()} creators</p>
          </motion.div>
        )}

        {/* Founders Access — skip the waitlist. Hidden on iOS native per App Store policy. */}
        {!IOS_BLOCKED && (
        <motion.div
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="rounded-xl p-5 mb-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--background)))",
            border: "2px solid hsl(var(--primary))",
            boxShadow: "0 0 40px hsl(var(--primary) / 0.15)",
          }}
        >
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
            Founders
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Skip the waitlist — get in today</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            For creators who want the UPLY operating system before public launch.
            Instant access, founding-creator status, and automatic entry into the{" "}
            <span className="text-foreground font-semibold">UPLY Games</span> competition.
          </p>
          <ul className="text-xs text-foreground/80 space-y-1.5 mb-4">
            <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /> Immediate beta access — no waiting</li>
            <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /> Permanent UPLY Origin badge</li>
            <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /> Entry into the UPLY Games competition</li>
            <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /> 95% payout on all earnings</li>
            <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /> Cancel anytime</li>
          </ul>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-3xl font-black text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>$99</span>
            <span className="text-sm text-muted-foreground">/month</span>
          </div>
          <Button
            onClick={startFoundersCheckout}
            disabled={foundersLoading}
            className="w-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 min-h-[44px]"
          >
            {foundersLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get instant access — $99/mo"}
          </Button>
        </motion.div>
        )}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl p-5 mb-6 bg-card border border-primary/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <Ticket className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Have an invite code?</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Enter a beta invite code to skip the waitlist and get instant access.
          </p>
          <div className="flex gap-2">
            <Input
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
              placeholder="Enter code (e.g. 201362BF)"
              className="flex-1 font-mono text-sm uppercase tracking-wider bg-background border-border"
              maxLength={12}
              onKeyDown={(e) => e.key === "Enter" && redeemInviteCode()}
            />
            <Button
              onClick={redeemInviteCode}
              disabled={!inviteInput.trim() || redeemingCode}
              className="shrink-0 bg-primary text-primary-foreground font-bold"
            >
              {redeemingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Redeem"}
            </Button>
          </div>
        </motion.div>


        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-6 mb-6 text-center border border-border bg-card"
        >
          <Trophy className="w-8 h-8 mx-auto mb-2" style={{ color: "hsl(45, 93%, 47%)" }} />
          <p className="text-4xl font-black text-foreground mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>$10,000</p>
          <p className="text-sm font-semibold text-foreground mb-1">to the person with the most referrals</p>
          {countdown && <p className="text-xs text-muted-foreground mt-2">⏱ {countdown} remaining</p>}
          {leader && (
            <p className="text-xs text-muted-foreground mt-1">
              Current #1: <span className="text-foreground font-semibold">{formatName(leader)}</span> ({leader.referral_count} referrals)
            </p>
          )}
        </motion.div>

        {/* Stats Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl p-6 mb-6 bg-card border border-border">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-3xl font-black text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{referralCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Referrals</p>
            </div>
            <div>
              <p className="text-3xl font-black text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>#{waitlistPosition || "–"}</p>
              <p className="text-xs text-muted-foreground mt-1">Your Position</p>
            </div>
          </div>
          {nextMilestone && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center mb-2">
                <span className="text-primary font-semibold">{nextMilestone.count - referralCount} more</span> referral{nextMilestone.count - referralCount !== 1 ? "s" : ""} to {nextMilestone.label}
              </p>
              <Progress value={(referralCount / nextMilestone.count) * 100} className="h-2" />
            </div>
          )}
        </motion.div>

        {/* Referral Link */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
          <h3 className="font-semibold text-sm mb-3">Your Referral Link</h3>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 rounded-lg px-4 py-3 text-sm text-foreground truncate bg-card border border-border">
              {displayUrlStr}
            </div>
            <Button onClick={copyLink} className="shrink-0 gap-2 bg-primary text-primary-foreground">
              {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {linkCopied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={shareTwitter}>
              <Twitter className="w-3 h-3" /> Twitter/X
            </Button>
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={shareSMS}>
              <MessageCircle className="w-3 h-3" /> iMessage
            </Button>
          </div>
        </motion.div>

        {/* Tier Ladder */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
          <h3 className="font-semibold text-sm mb-3">Referral Milestones</h3>
          <div className="space-y-2">
            {tiers.map((tier) => (
              <div
                key={tier.label}
                className={`flex items-center gap-3 rounded-lg p-3 border transition-colors ${
                  tier.done ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                }`}
              >
                <span className="text-lg">{tier.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{tier.label}</p>
                  <p className="text-xs text-muted-foreground">{tier.desc}</p>
                </div>
                {tier.done && <Check className="w-4 h-4 text-primary" />}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Origin Badge Explanation */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-6">
          <div className="rounded-xl p-5 bg-card border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5" style={{ color: "hsl(250, 70%, 55%)" }} />
              <h3 className="font-semibold text-sm">UPLY Origin Status</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              UPLY Origin members are the founding class of UPLY. This badge never goes away.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Creator Origin</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Permanent Origin badge</li>
                  <li>• Lifetime reduced creator fee</li>
                  <li>• First access to every feature</li>
                  <li>• Founding team Discord</li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Member Origin</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Permanent Origin badge</li>
                  <li>• Free membership tier for life</li>
                  <li>• First access to new creators</li>
                  <li>• Founding team Discord</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="rounded-xl p-5 bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" /> Leaderboard
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "hsl(45, 93%, 47%, 0.1)", color: "hsl(45, 93%, 47%)" }}>
                $10,000 Prize
              </span>
            </div>
            <div className="space-y-1">
              {leaderboard.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-4">No referrals yet — be the first!</p>
              ) : (
                leaderboard.map((entry, i) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-3 py-2.5 px-2 rounded-lg ${
                      entry.display_name === (profile as any)?.display_name ? "bg-primary/5 border border-primary/20" : ""
                    }`}
                  >
                    <span className="font-bold text-xs w-6" style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      color: i === 0 ? "hsl(45, 93%, 47%)" : i === 1 ? "hsl(0, 0%, 70%)" : i === 2 ? "hsl(30, 60%, 50%)" : "hsl(var(--primary))"
                    }}>
                      {i === 0 ? "👑" : `#${i + 1}`}
                    </span>
                    <span className="text-sm text-foreground flex-1 flex items-center gap-1.5">
                      {formatName(entry)}
                    </span>
                    <span className="text-xs font-semibold text-foreground w-8 text-right">{entry.referral_count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
