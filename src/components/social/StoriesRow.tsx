import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStories } from "@/hooks/useStories";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import StoryViewer from "./StoryViewer";
import StoryCreator from "./StoryCreator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface StoriesRowProps {
  filterLocal?: boolean;
  filterFriends?: boolean;
}

export default function StoriesRow({ filterLocal, filterFriends }: StoriesRowProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { groupedStories, isLoading } = useStories();
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);

  // Fetch user's own avatar
  const { data: myProfile } = useQuery({
    queryKey: ["my-avatar", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("profiles")
        .select("avatar_url, display_name")
        .eq("user_id", user.id)
        .single();
      return data as { avatar_url: string | null; display_name: string | null } | null;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const userIds = Object.keys(groupedStories);
  const myStories = user ? groupedStories[user.id] : undefined;
  const otherUserIds = userIds.filter((id) => id !== user?.id);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 py-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
            <div className="w-10 h-2 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 py-3">
        {/* Your Plan / Story */}
        <button
          onClick={() => (myStories ? setViewingUserId(user!.id) : navigate("/camera?mode=STORY"))}
          className="flex flex-col items-center gap-1.5 flex-shrink-0"
          style={{ minWidth: 64 }}
        >
          <div className="relative w-16 h-16">
            {myStories ? (
              <div className="w-full h-full rounded-full" style={{ boxShadow: "0 0 0 2.5px #3D7CFF" }}>
                <Avatar className="w-full h-full border-2 border-background">
                  <AvatarImage src={myProfile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted text-foreground text-xs">You</AvatarFallback>
                </Avatar>
              </div>
            ) : (
              <div
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{
                  background: "hsl(var(--muted) / 0.5)",
                  border: "2px dashed hsl(var(--border))",
                }}
              >
                <Plus className="w-6 h-6" style={{ color: "#3D7CFF" }} />
              </div>
            )}
          </div>
          <span
            className="truncate max-w-[64px] text-center"
            style={{ fontSize: 10, fontWeight: 600, color: "hsl(var(--muted-foreground))" }}
          >
            Your Plan
          </span>
        </button>

        {/* Other users' stories */}
        {otherUserIds.map((uid) => {
          const userStories = groupedStories[uid];
          const profile = userStories[0]?.profiles;
          const name = profile?.display_name || "User";
          const avatar = profile?.avatar_url;
          const initials = name.slice(0, 2).toUpperCase();

          return (
            <button
              key={uid}
              onClick={() => setViewingUserId(uid)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
              style={{ minWidth: 64 }}
            >
              <div
                className="w-16 h-16 rounded-full"
                style={{
                  padding: 2.5,
                  background: "linear-gradient(135deg, #3D7CFF, #00E5FF)",
                }}
              >
                <Avatar className="w-full h-full border-2 border-background">
                  <AvatarImage src={avatar} />
                  <AvatarFallback className="bg-muted text-foreground text-[11px] font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span
                className="truncate max-w-[64px] text-center"
                style={{ fontSize: 10, fontWeight: 600, color: "hsl(var(--muted-foreground))" }}
              >
                {name.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {viewingUserId && (
        <StoryViewer
          userId={viewingUserId}
          stories={groupedStories[viewingUserId] || []}
          allUserIds={[...(user ? [user.id] : []), ...otherUserIds]}
          onClose={() => setViewingUserId(null)}
          onNavigateUser={(uid) => setViewingUserId(uid)}
        />
      )}

      {showCreator && <StoryCreator onClose={() => setShowCreator(false)} />}
    </>
  );
}
