import { useState, useEffect } from "react";
import BackNav from "@/components/BackNav";
import { useParams } from "react-router-dom";
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

const TABS = ["Community", "Classroom", "Calendar", "Members", "Leaderboard", "About"] as const;
type Tab = typeof TABS[number];

export default function CreatorSpace() {
  const { creatorId } = useParams<{ creatorId: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("Community");
  const isOwner = user?.id === creatorId;

  const { data: space } = useCreatorSpace(creatorId);
  const { data: memberCount = 0 } = useMemberCount(creatorId);
  const ensureSpace = useEnsureSpace();

  // Fetch creator profile
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

  // Auto-create space if owner visits and no space exists
  useEffect(() => {
    if (isOwner && space === null) {
      ensureSpace.mutate();
    }
  }, [isOwner, space]);

  const spaceName = space?.name || creatorProfile?.display_name || "Creator Space";
  const spaceAvatar = space?.avatar_url || creatorProfile?.avatar_url;

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <BackNav />
      {/* Top Header */}
      <div className="px-4 pb-2 flex items-center gap-3">
        {spaceAvatar ? (
          <img src={spaceAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#111111", color: "#fff" }}>
            {spaceName.charAt(0)}
          </div>
        )}
        <h1 className="text-base font-bold text-white truncate">{spaceName}</h1>
      </div>

      {/* Sticky Tab Bar */}
      <div className="sticky top-0 z-40" style={{ background: "#0A0A0A", borderBottom: "1px solid #1e1e1e" }}>
        <div className="flex overflow-x-auto scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0"
              style={{ color: activeTab === tab ? "#fff" : "#888" }}
            >
              {tab === "Members" ? `Members (${memberCount})` : tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5" style={{ background: "#00FF85" }} />
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
        {activeTab === "About" && <SpaceAboutTab creatorId={creatorId!} isOwner={isOwner} />}
      </div>
    </div>
  );
}
