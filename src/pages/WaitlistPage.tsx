import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Copy, Check, Trophy, Crown, Shield, MessageCircle, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import OriginBadge from "@/components/OriginBadge";
import logoImg from "@/assets/logo.png";
import { buildReferralUrl, buildReferralUrlDisplay, getFirstName, getShareMessages } from "@/lib/referralUrls";
import { getAffiliateCookie } from "@/lib/affiliateCookies";

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
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [rank, setRank] = useState(0);
  const [totalWaitlist, setTotalWaitlist] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [config, setConfig] = useState<any>(null);

  const fetchData = async () => {
    if (!user) return;

    const [profRes, configRes] = await Promise.all([
      supabase.from("profiles").select("referral_code, first_name, last_name, display_name, is_approved, avatar_url, role_type, origin_member").eq("user_id", user.id).single(),
      supabase.from("waitlist_config" as any).select("*").limit(1).single(),
    ]);
    setProfile(profRes.data);
    setConfig(configRes.data);

    const { count: refCount } = await supabase
      .from("referrals" as any)
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", user.id) as any;
    setReferralCount(refCount || 0);

    const { count: wlCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("onboarding_complete", true)
      .eq("is_approved", false) as any;
    setTotalWaitlist(wlCount || 0);

    // Leaderboard
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, display_name, role_type, origin_member")
      .eq("onboarding_complete", true) as any;

    if (allProfiles) {
      const entries: LeaderboardEntry[] = [];
      for (const p of allProfiles.slice(0, 100)) {
        const { count } = await supabase
          .from("referrals" as any)
          .select("*", { count: "exact", head: true })
          .eq("referrer_id", p.user_id) as any;
        if ((count || 0) > 0) {
          entries.push({ ...p, referral_count: count || 0 });
        }
      }
      entries.sort((a, b) => b.referral_count - a.referral_count);
      setLeaderboard(entries.slice(0, 20));

      // Calculate rank
      const myIdx = entries.findIndex(e => e.user_id === user.id);
      setRank(myIdx >= 0 ? myIdx + 1 : entries.length + 1);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("waitlist-referrals-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "referrals" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

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

  // Referrer banner info
  const [referrerInfo, setReferrerInfo] = useState<{ name: string; avatar: string | null } | null>(null);
  useEffect(() => {
    const storedName = sessionStorage.getItem("referrer_name");
    const storedAvatar = sessionStorage.getItem("referrer_avatar");
    if (storedName) {
      setReferrerInfo({ name: storedName, avatar: storedAvatar });
    }
  }, []);

  const roleType = (profile as any)?.role_type;
  const isCreator = roleType === "creator";

  const nextMilestone = referralCount < 1 ? { count: 1, label: "Confirm your spot" } :
    referralCount < 3 ? { count: 3, label: "Jump 500 spots + Sneak Peek" } :
    referralCount < 10 ? { count: 10, label: "Immediate Access + UPLY Origin" } :
    null;

  const tiers = isCreator ? [
    { emoji: "✅", label: "1 Referral", desc: "Spot Confirmed", done: referralCount >= 1 },
    { emoji: "🚀", label: "3 Referrals", desc: "Jump 500 Spots + Sneak Peek Access", done: referralCount >= 3 },
    { emoji: "⚡", label: "10 Referrals", desc: "Immediate Access + Lifetime UPLY Origin Status", done: referralCount >= 10 },
    { emoji: "💰", label: "#1 Overall", desc: "$10,000 Cash Prize", done: false },
  ] : [
    { emoji: "✅", label: "1 Referral", desc: "Spot Confirmed", done: referralCount >= 1 },
    { emoji: "🚀", label: "3 Referrals", desc: "Jump 500 Spots + Sneak Peek Access", done: referralCount >= 3 },
    { emoji: "⚡", label: "10 Referrals", desc: "Immediate Access + Lifetime UPLY Origin Status", done: referralCount >= 10 },
    { emoji: "💰", label: "#1 Overall", desc: "$10,000 Cash Prize", done: false },
  ];

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

  const formatName = (entry: LeaderboardEntry) => {
    const first = entry.first_name || entry.display_name?.split(" ")[0] || "User";
    const lastInitial = entry.last_name?.[0] || entry.display_name?.split(" ")[1]?.[0] || "";
    return lastInitial ? `${first} ${lastInitial}.` : first;
  };

  const leader = leaderboard[0];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Header */}
      <div className="px-6 pt-6 pb-2 flex items-center justify-between">
        <img src={logoImg} alt="UPLY" className="w-8 h-8 object-contain" />
        <span className="text-xs text-muted-foreground">{totalWaitlist} on waitlist</span>
      </div>

      <div className="max-w-lg mx-auto px-6 pb-16">
        {/* Referrer banner */}
        {referrerInfo && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg p-3 mb-4 flex items-center gap-3"
            style={{
              background: "hsl(var(--primary) / 0.08)",
              border: "1px solid hsl(var(--primary) / 0.3)",
            }}
          >
            {referrerInfo.avatar ? (
              <img src={referrerInfo.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                {referrerInfo.name[0]}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">{referrerInfo.name} invited you</p>
              <p className="text-xs text-muted-foreground">You'll both move up the waitlist when you apply</p>
            </div>
          </motion.div>
        )}
        {/* Prize Hero */}
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
              <p className="text-3xl font-black text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>#{rank || "–"}</p>
              <p className="text-xs text-muted-foreground mt-1">Your Rank</p>
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
              uply.tv/join/{referralCode}
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
              UPLY Origin members are the founding class of UPLY. This badge never goes away. It marks you as someone who believed before everyone else.
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
            <p className="text-xs text-muted-foreground mb-3">
              {endDate && `Contest ends ${endDate.toLocaleDateString()}. Winner gets $10,000.`}
            </p>
            <div className="space-y-1">
              {leaderboard.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-4">No referrals yet — be the first!</p>
              ) : (
                leaderboard.map((entry, i) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-3 py-2.5 px-2 rounded-lg ${
                      entry.user_id === user?.id ? "bg-primary/5 border border-primary/20" : ""
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
                      {entry.origin_member && <OriginBadge size="sm" />}
                      {entry.user_id === user?.id && <span className="text-primary text-xs">(You)</span>}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">{entry.role_type || ""}</span>
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
