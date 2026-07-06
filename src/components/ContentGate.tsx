/**
 * @deprecated Use `<GatedContent>` from `@/components/GatedContent` instead.
 * GatedContent is the canonical gating pattern (see Core memory). This file is
 * preserved because it has live importers; migrate them, then archive.
 * Current importers: SpaceCommunityTab, SpaceClassroomTab.
 */
import { Lock, LogIn, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useMemberSubscription } from "@/hooks/useStripeAccount";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { memberAuthUrl } from "@/lib/memberAuth";
import { useMyTierRank, requiredTierForRank } from "@/hooks/useTierGating";

interface ContentGateProps {
  creatorId: string;
  children: React.ReactNode;
  /** If true, content is free regardless of subscription */
  isFree?: boolean;
  /** Type of content for display */
  type?: "post" | "lesson" | "module";
  onJoinClick?: () => void;
  /**
   * Tier-scoped gating: minimum subscription_tiers.tier_rank required.
   * null/undefined = any active subscription unlocks (legacy behavior).
   */
  minTierRank?: number | null;
}

export default function ContentGate({ creatorId, children, isFree, type = "post", onJoinClick, minTierRank }: ContentGateProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if community is free (no paid tiers)
  const { data: hasPaidTiers } = useQuery({
    queryKey: ["has-paid-tiers", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { count } = await supabase
        .from("subscription_tiers")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", creatorId)
        .eq("is_active", true);
      return (count || 0) > 0;
    },
  });

  const { data: activeSub, isLoading } = useMemberSubscription(creatorId);

  // Tier-scoped gating (only queried when this content carries a min tier)
  const tierGated = minTierRank != null;
  const { myRank, tiers, isLoading: tierLoading } = useMyTierRank(tierGated ? creatorId : undefined);

  // Check if user is the creator
  const isOwner = user?.id === creatorId;

  // If content is explicitly free, or community has no paid tiers, or user is owner, show content
  if (isFree || !hasPaidTiers || isOwner) {
    return <>{children}</>;
  }

  // Not logged in
  if (!user) {
    return (
      <div className="relative">
        <div className="blur-sm pointer-events-none select-none opacity-50">{children}</div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg">
          <LogIn className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground mb-2">Create your free account</p>
          <Button size="sm" onClick={() => navigate(memberAuthUrl())} className="gap-1.5">
            <LogIn className="w-3.5 h-3.5" /> Sign Up Free
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) return <>{children}</>;

  // Tier-scoped content: any subscription is NOT enough — the member's tier
  // rank must meet min_tier_rank. Server-side RLS already enforces this; this
  // branch exists to tell the member WHICH tier unlocks it.
  if (tierGated) {
    if (tierLoading) return <>{children}</>;
    if (myRank >= (minTierRank as number)) return <>{children}</>;
    const requiredTier = requiredTierForRank(tiers, minTierRank);
    const tierLabel = requiredTier ? requiredTier.name : "a higher tier";
    return (
      <div className="relative">
        <div className="blur-sm pointer-events-none select-none opacity-50">{children}</div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg">
          <Crown className="w-8 h-8 text-primary mb-3" />
          <p className="text-sm font-semibold text-foreground mb-1">Requires {tierLabel}</p>
          <p className="text-xs text-muted-foreground mb-3">
            {requiredTier
              ? `Upgrade to ${requiredTier.name} ($${requiredTier.price_monthly}/mo) to unlock this ${type}`
              : `Upgrade your plan to unlock this ${type}`}
          </p>
          <Button size="sm" onClick={() => navigate(`/community/${creatorId}/pricing`)} className="gap-1.5">
            <Crown className="w-3.5 h-3.5" /> Upgrade
          </Button>
        </div>
      </div>
    );
  }

  // Has active subscription — show content
  if (activeSub) {
    return <>{children}</>;
  }

  // No subscription — show gated view
  const labels = {
    post: { action: "Join to read", desc: "Subscribe to access this post" },
    lesson: { action: "Unlock this lesson", desc: "Subscribe to access this lesson" },
    module: { action: "Unlock this course", desc: "Subscribe to access this course" },
  };
  const label = labels[type];

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none opacity-50">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg">
        <Lock className="w-8 h-8 text-muted-foreground mb-3" />
        <p className="text-sm font-semibold text-foreground mb-1">{label.action}</p>
        <p className="text-xs text-muted-foreground mb-3">{label.desc}</p>
        <Button size="sm" onClick={onJoinClick} className="gap-1.5">
          <Lock className="w-3.5 h-3.5" /> {label.action}
        </Button>
      </div>
    </div>
  );
}
