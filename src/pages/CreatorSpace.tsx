import { useEffect, useState } from "react";
import BackNav from "@/components/BackNav";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useCreatorSpace, useEnsureSpace } from "@/hooks/useCreatorSpace";
import { useApplyBrandTheme } from "@/components/branding/BrandScope";
import { useMemberCount } from "@/hooks/useCommunityMembers";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SpaceCommunityTab from "@/components/space/SpaceCommunityTab";
import SpaceClassroomTab from "@/components/space/SpaceClassroomTab";
import SpaceCalendarTab from "@/components/space/SpaceCalendarTab";
import SpaceEventsTab from "@/components/space/SpaceEventsTab";
import SpaceMembersTab from "@/components/space/SpaceMembersTab";
import SpaceStoreTab from "@/components/space/SpaceStoreTab";
import SpaceLeaderboardTab from "@/components/space/SpaceLeaderboardTab";
import SpaceAboutTab from "@/components/space/SpaceAboutTab";
import { MemberEarnTab } from "@/components/affiliates/MemberEarnTab";
import BlastHistory from "@/components/blast/BlastHistory";
import { CreatorAffiliateProgramSettings } from "@/components/affiliates/CreatorAffiliateProgramSettings";
import { useCreatorAffiliateProgram } from "@/hooks/useAffiliates";
import { setAffiliateCookie } from "@/lib/affiliateCookies";
import { memberAuthUrl } from "@/lib/memberAuth";
import { PricingTab } from "@/components/space/PricingTab";
import { useSubscriptionTiers } from "@/hooks/useStripeAccount";
import TierSelectionModal from "@/components/TierSelectionModal";
import { Button } from "@/components/ui/button";
import { Users, Loader2, Sparkles, Lock, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { usePaymentReturn, useMemberSubscriptionStatus } from "@/hooks/usePaymentReturn";
import PaymentProcessingOverlay from "@/components/PaymentProcessingOverlay";

const VALID_TABS = ["community", "classroom", "calendar", "events", "store", "members", "leaderboard", "pricing", "earn", "blasts", "about"] as const;
type TabSlug = typeof VALID_TABS[number];

/** Skool-style primary nav. Everything else stays one tap away under More. */
const PRIMARY_TABS: TabSlug[] = ["community", "classroom", "members"];

const TAB_LABELS: Record<TabSlug, string> = {
  community: "Community",
  classroom: "Classroom",
  calendar: "Calendar",
  events: "Events",
  store: "Store",
  members: "Members",
  leaderboard: "Leaderboard",
  pricing: "Pricing",
  earn: "Earn",
  blasts: "Blasts",
  about: "About",
};

// Tabs that require active membership when the space has paid tiers.
const GATED_TABS: TabSlug[] = ["classroom", "calendar", "events", "members", "leaderboard", "earn"];

function resolveTabFromUrl(tabParam?: string): TabSlug {
  const slug = tabParam?.toLowerCase();
  if (slug && VALID_TABS.includes(slug as TabSlug)) return slug as TabSlug;
  return "community";
}

function SpaceTabBar({
  activeTab,
  isOwner,
  memberCount,
  canAccessTab,
  onSelect,
}: {
  activeTab: TabSlug;
  isOwner: boolean;
  memberCount: number;
  canAccessTab: (tab: TabSlug) => boolean;
  onSelect: (slug: TabSlug) => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTabs = VALID_TABS.filter((slug) => {
    if (PRIMARY_TABS.includes(slug)) return false;
    if (slug === "blasts" && !isOwner) return false;
    return true;
  });
  const activeIsMore = moreTabs.includes(activeTab);

  const labelFor = (slug: TabSlug) =>
    slug === "members" ? `Members (${memberCount})` : TAB_LABELS[slug];

  const tabButton = (slug: TabSlug) => {
    const locked = !canAccessTab(slug);
    const active = activeTab === slug;
    return (
      <button
        key={slug}
        type="button"
        onClick={() => {
          setMoreOpen(false);
          onSelect(slug);
        }}
        className={`relative px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors flex-shrink-0 flex items-center gap-1 ${
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {labelFor(slug)}
        {locked && <Lock className="w-3 h-3 opacity-70" aria-hidden />}
        {active && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary" />}
      </button>
    );
  };

  return (
    <div className="sticky top-0 z-40 bg-surface border-b border-surface-border">
      <div className="flex items-center overflow-x-auto scrollbar-none">
        {PRIMARY_TABS.map(tabButton)}
        {activeIsMore && tabButton(activeTab)}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            onClick={() => setMoreOpen((open) => !open)}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap flex items-center gap-1 ${
              activeIsMore ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            More
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {moreOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-md border border-border bg-card p-1 shadow-lg"
            >
              {moreTabs.map((slug) => (
                <button
                  key={slug}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    onSelect(slug);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm ${
                    activeTab === slug ? "bg-muted font-semibold text-foreground" : "text-foreground/80 hover:bg-muted"
                  }`}
                >
                  {TAB_LABELS[slug]}
                  {!canAccessTab(slug) && <Lock className="w-3 h-3 opacity-70" aria-hidden />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreatorSpace() {
  const { creatorId: rawCreatorId, tab: tabParam } = useParams<{ creatorId: string; tab?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const creatorId = rawCreatorId === "me" ? user?.id : rawCreatorId;
  // White-label: apply this creator's brand theme to their space (Phase 1)
  useApplyBrandTheme(creatorId);

  const searchParams = new URLSearchParams(location.search);
  const refCode = searchParams.get("ref");
  const justJoined = searchParams.get("joined") === "true";

  const [showTierModal, setShowTierModal] = useState(false);
  const [freeJoining, setFreeJoining] = useState(false);

  // Handle mobile return from Stripe checkout
  const { checking: paymentChecking } = usePaymentReturn(creatorId);

  useEffect(() => {
    if (tabParam) return;
    const legacyTab = searchParams.get("tab") || (location.state as any)?.tab;
    if (legacyTab) {
      const resolved = resolveTabFromUrl(legacyTab);
      navigate(`/community/${rawCreatorId}/${resolved}`, { replace: true });
    }
  }, [tabParam, rawCreatorId]);

  useEffect(() => {
    if (justJoined) {
      toast.success("Welcome! 🎉", { description: "You've joined this community." });
      queryClient.invalidateQueries({ queryKey: ["is-member"] });
      queryClient.invalidateQueries({ queryKey: ["member-subscription"] });
      // Clean URL
      navigate(`/community/${rawCreatorId}/community`, { replace: true });
    }
  }, [justJoined]);

  // activeTab is computed below, after membership is known (visitors land on About).

  useEffect(() => {
    if (refCode) setAffiliateCookie("uply_creator_ref", refCode, 30);
  }, [refCode]);

  const isOwner = !!user?.id && !!creatorId && user.id === creatorId;
  const { data: space } = useCreatorSpace(creatorId);
  const { data: memberCount = 0 } = useMemberCount(creatorId);
  const ensureSpace = useEnsureSpace();
  const { data: affiliateProgram } = useCreatorAffiliateProgram(creatorId);
  const { data: tiers = [] } = useSubscriptionTiers(creatorId);
  const { data: memberSub } = useMemberSubscriptionStatus(creatorId);
  const isPaidSubscriber = memberSub?.status === "active";
  const subTierName = (memberSub as any)?.subscription_tiers?.name as string | undefined;

  const { data: isMember } = useQuery({
    queryKey: ["is-member", creatorId, user?.id],
    enabled: !!creatorId && !!user && !isOwner,
    queryFn: async () => {
      const { data } = await supabase
        .from("community_members")
        .select("id")
        .eq("creator_id", creatorId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  // Visitors and non-members land on the About/join page first (owner directive:
  // course/community signup leads). Members and owners land on the feed.
  const activeTab: TabSlug = tabParam
    ? resolveTabFromUrl(tabParam)
    : isOwner || isMember === true
      ? "community"
      : "about";

  const showMemberEarn = !isOwner && isMember && affiliateProgram?.is_active;

  const { data: creatorProfile } = useQuery({
    queryKey: ["creator-profile-space", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles_public")
        .select("display_name, avatar_url, bio")
        .eq("user_id", creatorId!)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (isOwner && space === null) ensureSpace.mutate();
  }, [isOwner, space]);

  const spaceName = space?.name || creatorProfile?.display_name || "Community";
  const spaceAvatar = space?.avatar_url || creatorProfile?.avatar_url;
  const hasPaidTiers = tiers.length > 0;
  const requiresPaidJoin = hasPaidTiers || space?.is_free === false || Number(space?.price || 0) > 0;

  const handleJoinClick = async () => {
    if (!user) {
      navigate(memberAuthUrl());
      return;
    }
    if (hasPaidTiers) {
      setShowTierModal(true);
      return;
    }
    if (requiresPaidJoin) {
      navigate(`/community/${rawCreatorId}/pricing`, { replace: true });
      toast.error("No live plan yet", { description: "This creator hasn't published a live paid tier yet." });
      return;
    }

    setFreeJoining(true);
    const { error } = await supabase.from("community_members").upsert({
      user_id: user.id,
      creator_id: creatorId!,
    }, { onConflict: "user_id,creator_id" });
    setFreeJoining(false);
    if (error) {
      toast.error("Error", { description: error.message });
    } else {
      toast.success("Welcome! 🎉", { description: "You've joined this community." });
      queryClient.invalidateQueries({ queryKey: ["is-member"] });
    }
  };

  const canAccessTab = (tab: TabSlug): boolean => {
    if (isOwner) return true;
    if (!GATED_TABS.includes(tab)) return true;
    if (!hasPaidTiers) return true; // free community = no gating
    return !!isMember;
  };

  const switchTab = (slug: TabSlug) => {
    if (!canAccessTab(slug)) {
      if (!user) {
        navigate(memberAuthUrl());
        return;
      }
      setShowTierModal(true);
      return;
    }
    navigate(`/community/${rawCreatorId}/${slug}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-surface">
      <PaymentProcessingOverlay show={paymentChecking} />
      <BackNav />
      {/* Top Header */}
      <div className="px-4 pb-2 flex items-center gap-3">
        {spaceAvatar ? (
          <img src={spaceAvatar} alt="" loading="lazy" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-surface-raised text-foreground">
            {spaceName.charAt(0)}
          </div>
        )}
        <h1 className="text-base font-bold text-foreground truncate flex-1">{spaceName}</h1>
        {/* Join / Upgrade button for non-owners. Shows the real price up front
            (free vs $X/mo) and never offers "subscribe" when there's no live plan. */}
        {!isOwner && !isMember && (() => {
          const minTierPrice = hasPaidTiers
            ? Math.min(...tiers.map((t: any) => Number(t.price_monthly) || 0))
            : Number(space?.price || 0);
          const paidButNoPlan = requiresPaidJoin && !hasPaidTiers;
          if (paidButNoPlan) {
            return (
              <Button size="sm" variant="outline" disabled className="gap-1.5 rounded-full">
                <Sparkles className="w-3.5 h-3.5" /> Coming soon
              </Button>
            );
          }
          return (
            <Button
              size="sm"
              onClick={handleJoinClick}
              disabled={freeJoining}
              className="gap-1.5 rounded-full"
            >
              {freeJoining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
              {requiresPaidJoin
                ? (minTierPrice > 0 ? `Join · $${minTierPrice}/mo` : "Subscribe")
                : "Join Free"}
            </Button>
          );
        })()}
        {/* Membership status — always clear whether you're free or paid */}
        {!isOwner && isMember && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              isPaidSubscriber
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Check className="w-3 h-3" />
            {isPaidSubscriber ? (subTierName || "Member") : "Free member"}
          </span>
        )}
        {/* Upgrade button for free members of a space that has paid tiers */}
        {!isOwner && isMember && hasPaidTiers && !isPaidSubscriber && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => switchTab("pricing")}
            className="gap-1.5 rounded-full border-primary/40 text-primary hover:bg-primary/10"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Upgrade
          </Button>
        )}
      </div>

      {/* Sticky Tab Bar — Community, Classroom, Members up front. */}
      <SpaceTabBar
        activeTab={activeTab}
        isOwner={isOwner}
        memberCount={memberCount}
        canAccessTab={canAccessTab}
        onSelect={switchTab}
      />

      {/* Tab Content */}
      <div className="pb-20">
        {activeTab === "community" && <SpaceCommunityTab creatorId={creatorId!} isOwner={isOwner} />}
        {activeTab === "classroom" && <SpaceClassroomTab creatorId={creatorId!} isOwner={isOwner} />}
        {activeTab === "calendar" && <SpaceCalendarTab creatorId={creatorId!} isOwner={isOwner} />}
        {activeTab === "events" && <SpaceEventsTab creatorId={creatorId!} isOwner={isOwner} />}
        {activeTab === "store" && <SpaceStoreTab creatorId={creatorId!} isOwner={isOwner} />}
        {activeTab === "members" && <SpaceMembersTab creatorId={creatorId!} />}
        {activeTab === "leaderboard" && <SpaceLeaderboardTab creatorId={creatorId!} />}
        {activeTab === "about" && <SpaceAboutTab creatorId={creatorId!} isOwner={isOwner} />}
        {activeTab === "pricing" && <PricingTab creatorId={creatorId!} />}
        {activeTab === "blasts" && isOwner && <BlastHistory creatorId={creatorId!} />}
        {activeTab === "earn" && (
          isOwner ? (
            <div className="px-4 pt-4">
              <CreatorAffiliateProgramSettings />
            </div>
          ) : showMemberEarn && affiliateProgram ? (
            <MemberEarnTab programId={affiliateProgram.id} creatorId={creatorId!} />
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">The affiliate program is not active yet.</p>
            </div>
          )
        )}
      </div>

      {/* Tier Selection Modal */}
      <TierSelectionModal
        open={showTierModal}
        onClose={() => setShowTierModal(false)}
        tiers={tiers}
        creatorId={creatorId!}
      />
    </div>
  );
}
