import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Gift, Trophy, Crown, Zap, Users, Check, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const REWARD_TIERS = [
  { count: 3, label: "Jump 30 spots", icon: Zap, color: "#00BFFF", description: "Move up 30 positions on the waitlist" },
  { count: 5, label: "Early Access", icon: Gift, color: "#00FF85", description: "Get early access to new features" },
  { count: 10, label: "Top 100", icon: Trophy, color: "#FFD700", description: "Guaranteed Top 100 waitlist position" },
  { count: 25, label: "Founding Creator", icon: Crown, color: "#FF69B4", description: "0% platform fees forever" },
];

export default function ReferralRewardsCard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["my-referral-stats", user?.id],
    queryFn: async () => {
      // Check affiliate links for referral count
      const { data: link } = await supabase
        .from("affiliate_links")
        .select("code, signups, clicks")
        .eq("user_id", user!.id)
        .maybeSingle();
      return { referralCount: link?.signups || 0, code: link?.code || "", clicks: link?.clicks || 0 };
    },
    enabled: !!user,
  });

  const referralCount = data?.referralCount || 0;
  const nextTier = REWARD_TIERS.find(t => t.count > referralCount);
  const earnedTiers = REWARD_TIERS.filter(t => t.count <= referralCount);

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Gift className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Referral Rewards</h3>
            <p className="text-xs text-muted-foreground">{referralCount} referral{referralCount !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/affiliates")}
          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
        >
          Share Link <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress to next tier */}
      {nextTier && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Next reward: <span className="text-foreground font-medium">{nextTier.label}</span></span>
            <span className="text-muted-foreground">{referralCount}/{nextTier.count}</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (referralCount / nextTier.count) * 100)}%`,
                background: nextTier.color,
              }}
            />
          </div>
        </div>
      )}

      {/* Tier list */}
      <div className="space-y-2">
        {REWARD_TIERS.map(tier => {
          const Icon = tier.icon;
          const earned = referralCount >= tier.count;
          return (
            <div
              key={tier.count}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                earned ? "bg-primary/5" : "opacity-50"
              }`}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: earned ? `${tier.color}20` : undefined }}
              >
                {earned ? (
                  <Check className="w-4 h-4" style={{ color: tier.color }} />
                ) : (
                  <Icon className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${earned ? "text-foreground" : "text-muted-foreground"}`}>
                  {tier.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{tier.count} referrals · {tier.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
