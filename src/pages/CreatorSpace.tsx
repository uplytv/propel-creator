import { useState, useEffect } from "react";
import BackNav from "@/components/BackNav";
import { useParams, useLocation } from "react-router-dom";
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

const BASE_TABS = ["Community", "Classroom", "Calendar", "Members", "Leaderboard", "About"] as const;
type Tab = typeof BASE_TABS[number] | "Earn" | "Manage";

export default function CreatorSpace() {
  const { creatorId } = useParams<{ creatorId: string }>();
  const { user } = useAuth();
  const location = useLocation();
  const tabFromState = (location.state as any)?.tab;
  const searchParams = new URLSearchParams(location.search);
  const tabFromQuery = searchParams.get("tab");
  const refCode = searchParams.get("ref");

  // Handle creator affiliate cookie
  useEffect(() => {
    if (refCode) {
      setAffiliateCookie("uply_creator_ref", refCode, 30);
    }
  }, [refCode]);
  const resolveTab = (val?: string): Tab => {
    if (val === "classroom") return "Classroom";
    if (val === "community") return "Community";
    return "Community";
  };
  const initialTab: Tab = resolveTab(tabFromQuery || tabFromState);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const isOwner = user?.id === creatorId;

  const { data: space } = useCreatorSpace(creatorId);
  const { data: memberCount = 0 } = useMemberCount(creatorId);
  const ensureSpace = useEnsureSpace();
  const { data: affiliateProgram } = useCreatorAffiliateProgram(creatorId);

  // Check if current user is a member (for Earn tab)
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

  const showEarnTab = !isOwner && isMember && affiliateProgram?.is_active;
  const TABS: Tab[] = [
    ...BASE_TABS,
    ...(showEarnTab ? ["Earn" as Tab] : []),
  ];

  const { data: creatorProfile } = useQuery({
    queryKey: ["creator-profile-space", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
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

  const spaceName = space?.name || creatorProfile?.display_name || "Creator Space";
  const spaceAvatar = space?.avatar_url || creatorProfile?.avatar_url;

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
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === tab ? "text-foreground" : "text-text-dim"
              }`}
            >
              {tab === "Members" ? `Members (${memberCount})` : tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent-green" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="pb-20">
        {activeTab === "Community" && <SpaceCommunityTab creatorId={creatorId!} isOwner={isOwner} />}
        {activeTab === "Classroom" && <SpaceClassroomTab creatorId={creatorId!} isOwner={isOwner} />}
        {activeTab === "Calendar" && <SpaceCalendarTab creatorId={creatorId!} isOwner={isOwner} />}
        {activeTab === "Members" && <SpaceMembersTab creatorId={creatorId!} />}
        {activeTab === "Leaderboard" && <SpaceLeaderboardTab creatorId={creatorId!} />}
        {activeTab === "About" && (
          <div>
            <SpaceAboutTab creatorId={creatorId!} isOwner={isOwner} />
            {isOwner && (
              <div className="px-4 mt-4">
                <CreatorAffiliateProgramSettings />
              </div>
            )}
          </div>
        )}
        {activeTab === "Earn" && showEarnTab && affiliateProgram && (
          <MemberEarnTab programId={affiliateProgram.id} creatorId={creatorId!} />
        )}
      </div>
    </div>
  );
}
