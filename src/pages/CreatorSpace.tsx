import { useEffect } from "react";
import BackNav from "@/components/BackNav";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useCreatorSpace, useEnsureSpace } from "@/hooks/useCreatorSpace";
import { useMemberCount } from "@/hooks/useCommunityMembers";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import SpaceCommunityTab from "@/components/space/SpaceCommunityTab";
import SpaceClassroomTab from "@/components/space/SpaceClassroomTab";
import SpaceCalendarTab from "@/components/space/SpaceCalendarTab";
import SpaceMembersTab from "@/components/space/SpaceMembersTab";
import SpaceLeaderboardTab from "@/components/space/SpaceLeaderboardTab";
import SpaceAboutTab from "@/components/space/SpaceAboutTab";
import { MemberEarnTab } from "@/components/affiliates/MemberEarnTab";
import { CreatorAffiliateProgramSettings } from "@/components/affiliates/CreatorAffiliateProgramSettings";
import { useCreatorAffiliateProgram } from "@/hooks/useAffiliates";
import { setAffiliateCookie } from "@/lib/affiliateCookies";
import { PricingTab } from "@/components/space/PricingTab";

const VALID_TABS = ["community", "classroom", "calendar", "members", "leaderboard", "pricing", "earn", "about"] as const;
type TabSlug = typeof VALID_TABS[number];

const TAB_LABELS: Record<TabSlug, string> = {
  community: "Community",
  classroom: "Classroom",
  calendar: "Calendar",
  members: "Members",
  leaderboard: "Leaderboard",
  pricing: "Pricing",
  earn: "Earn",
  about: "About",
};

function resolveTabFromUrl(tabParam?: string): TabSlug {
  const slug = tabParam?.toLowerCase();
  if (slug && VALID_TABS.includes(slug as TabSlug)) return slug as TabSlug;
  return "community";
}

export default function CreatorSpace() {
  const { creatorId: rawCreatorId, tab: tabParam } = useParams<{ creatorId: string; tab?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const creatorId = rawCreatorId === "me" ? user?.id : rawCreatorId;

  const searchParams = new URLSearchParams(location.search);
  const refCode = searchParams.get("ref");

  // Handle legacy ?tab= and state.tab by redirecting to URL-based tab
  useEffect(() => {
    if (tabParam) return; // already have URL tab
    const legacyTab = searchParams.get("tab") || (location.state as any)?.tab;
    if (legacyTab) {
      const resolved = resolveTabFromUrl(legacyTab);
      navigate(`/community/${rawCreatorId}/${resolved}`, { replace: true });
    }
  }, [tabParam, rawCreatorId]);

  // Derive active tab from URL
  const activeTab = resolveTabFromUrl(tabParam);

  // Handle creator affiliate cookie
  useEffect(() => {
    if (refCode) {
      setAffiliateCookie("uply_creator_ref", refCode, 30);
    }
  }, [refCode]);

  const isOwner = !!user?.id && !!creatorId && user.id === creatorId;

  const { data: space } = useCreatorSpace(creatorId);
  const { data: memberCount = 0 } = useMemberCount(creatorId);
  const ensureSpace = useEnsureSpace();
  const { data: affiliateProgram } = useCreatorAffiliateProgram(creatorId);

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

  const showMemberEarn = !isOwner && isMember && affiliateProgram?.is_active;

  const { data: creatorProfile } = useQuery({
    queryKey: ["creator-profile-space", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles_public")
        .select("display_name, avatar_url, bio")
        .eq("user_id", creatorId!)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (isOwner && space === null) {
      ensureSpace.mutate();
    }
  }, [isOwner, space]);

  const spaceName = space?.name || creatorProfile?.display_name || "Community";
  const spaceAvatar = space?.avatar_url || creatorProfile?.avatar_url;

  const switchTab = (slug: TabSlug) => {
    navigate(`/community/${rawCreatorId}/${slug}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-surface">
      <BackNav />
      {/* Top Header */}
      <div className="px-4 pb-2 flex items-center gap-3">
        {spaceAvatar ? (
          <img src={spaceAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-surface-raised text-foreground">
            {spaceName.charAt(0)}
          </div>
        )}
        <h1 className="text-base font-bold text-foreground truncate">{spaceName}</h1>
      </div>

      {/* Sticky Tab Bar */}
      <div className="sticky top-0 z-40 bg-surface border-b border-surface-border">
        <div className="flex overflow-x-auto scrollbar-none">
          {VALID_TABS.map((slug) => (
            <button
              key={slug}
              onClick={() => switchTab(slug)}
              className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === slug ? "text-foreground" : "text-text-dim"
              }`}
            >
              {slug === "members" ? `Members (${memberCount})` : TAB_LABELS[slug]}
              {activeTab === slug && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent-green" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="pb-20">
        {activeTab === "community" && <SpaceCommunityTab creatorId={creatorId!} isOwner={isOwner} />}
        {activeTab === "classroom" && <SpaceClassroomTab creatorId={creatorId!} isOwner={isOwner} />}
        {activeTab === "calendar" && <SpaceCalendarTab creatorId={creatorId!} isOwner={isOwner} />}
        {activeTab === "members" && <SpaceMembersTab creatorId={creatorId!} />}
        {activeTab === "leaderboard" && <SpaceLeaderboardTab creatorId={creatorId!} />}
        {activeTab === "about" && <SpaceAboutTab creatorId={creatorId!} isOwner={isOwner} />}
        {activeTab === "pricing" && <PricingTab creatorId={creatorId!} />}
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
    </div>
  );
}
