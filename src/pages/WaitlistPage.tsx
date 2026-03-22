import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Copy, Check, Twitter, Linkedin, Trophy, ArrowUp, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LeaderboardEntry {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  referral_count: number;
}

export default function WaitlistPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [rank, setRank] = useState(0);
  const [totalWaitlist, setTotalWaitlist] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);

  const fetchData = async () => {
    if (!user) return;

    // Get profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("referral_code, first_name, last_name, display_name, is_approved, avatar_url")
      .eq("user_id", user.id)
      .single();
    setProfile(prof);

    // Count referrals
    const { count: refCount } = await supabase
      .from("referrals" as any)
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", user.id) as any;
    setReferralCount(refCount || 0);

    // Count total users on waitlist (not approved)
    const { count: wlCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("onboarding_complete", true)
      .eq("is_approved", false) as any;
    setTotalWaitlist(wlCount || 0);

    // Calculate rank based on referral count
    const { count: ahead } = await supabase
      .rpc("count_users_with_more_referrals" as any, { target_user_id: user.id }) as any;
    // Fallback: just set rank to 1 if RPC doesn't exist
    setRank((ahead || 0) + 1);

    // Leaderboard - get top referrers
    await fetchLeaderboard();
  };

  const fetchLeaderboard = async () => {
    // Get all profiles with referral counts via referrals table
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, display_name")
      .eq("onboarding_complete", true) as any;

    if (!profiles) return;

    // For each profile, count referrals
    const entries: LeaderboardEntry[] = [];
    for (const p of profiles.slice(0, 50)) {
      const { count } = await supabase
        .from("referrals" as any)
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", p.user_id) as any;
      if ((count || 0) > 0) {
        entries.push({ ...p, referral_count: count || 0 });
      }
    }
    entries.sort((a, b) => b.referral_count - a.referral_count);
    setLeaderboard(entries.slice(0, 10));
  };

  useEffect(() => {
    fetchData();
    // Realtime subscription on referrals
    const channel = supabase
      .channel("waitlist-referrals")
      .on("postgres_changes", { event: "*", schema: "public", table: "referrals" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const referralCode = (profile as any)?.referral_code || "";
  const referralUrl = `uply.tv/join/${referralCode}`;
  const fullUrl = `https://${referralUrl}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setLinkCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const shareTwitter = () => {
    const text = `I just joined the UPLY waitlist — the all-in-one creator platform. Use my link to skip the line → ${fullUrl}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`, "_blank");
  };

  const nextMilestone = referralCount < 1 ? { count: 1, label: "Confirm your spot" } :
    referralCount < 3 ? { count: 3, label: "Guaranteed early access" } :
    null;

  const formatName = (entry: LeaderboardEntry) => {
    const first = entry.first_name || entry.display_name?.split(" ")[0] || "User";
    const lastInitial = entry.last_name?.[0] || entry.display_name?.split(" ")[1]?.[0] || "";
    return lastInitial ? `${first} ${lastInitial}.` : first;
  };

  const tiers = [
    { emoji: "📍", label: "0 Referrals", desc: "Holding your spot", done: true, active: referralCount === 0 },
    { emoji: "✅", label: "1 Referral", desc: "Spot confirmed", done: referralCount >= 1, active: referralCount === 0 },
    { emoji: "🚀", label: "3 Referrals", desc: "Guaranteed early access", done: referralCount >= 3, active: referralCount >= 1 && referralCount < 3 },
    { emoji: "💰", label: "Most Referrals", desc: "Win $1,000 cash", done: false, active: referralCount >= 3 },
  ];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-sm font-black text-primary-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>U</span>
          </div>
          <span className="font-bold text-sm">UPLY</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{totalWaitlist} on waitlist</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 pb-12">
        {/* Prize Banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 mb-6 text-center border border-[hsl(var(--primary)/0.3)]"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), transparent)" }}
        >
          <Trophy className="w-6 h-6 text-primary mx-auto mb-1" />
          <p className="text-xs font-semibold text-primary">TOP REFERRER WINS</p>
          <p className="text-2xl font-black text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>$1,000</p>
        </motion.div>

        {/* Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl p-6 mb-6 bg-card border border-border"
        >
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
            <div className="mt-4 pt-4 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                <span className="text-primary font-semibold">{nextMilestone.count - referralCount} more</span> referral{nextMilestone.count - referralCount !== 1 ? "s" : ""} to {nextMilestone.label}
              </p>
              <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(referralCount / nextMilestone.count) * 100}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Milestones */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
          <h3 className="font-semibold text-sm mb-3">Milestones</h3>
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

        {/* Referral Link */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
          <h3 className="font-semibold text-sm mb-3">Your Referral Link</h3>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 rounded-lg px-4 py-3 text-sm text-foreground truncate bg-card border border-border">
              {referralUrl}
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
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={shareLinkedIn}>
              <Linkedin className="w-3 h-3" /> LinkedIn
            </Button>
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="rounded-xl p-5 bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" /> Top Referrers
              </h3>
              <span className="text-[10px] text-primary font-semibold px-2 py-0.5 rounded-full bg-primary/10">
                $1,000 Prize
              </span>
            </div>
            <div className="space-y-2">
              {leaderboard.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-4">No referrals yet — be the first!</p>
              ) : (
                leaderboard.map((entry, i) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-3 py-2 px-2 rounded-lg ${
                      entry.user_id === user?.id ? "bg-primary/5 border border-primary/20" : ""
                    }`}
                  >
                    <span className="font-bold text-xs w-6 text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      #{i + 1}
                    </span>
                    <span className="text-sm text-foreground flex-1">
                      {formatName(entry)} {entry.user_id === user?.id && <span className="text-primary text-xs">(You)</span>}
                    </span>
                    {entry.referral_count >= 3 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        🚀 Early
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{entry.referral_count}</span>
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
