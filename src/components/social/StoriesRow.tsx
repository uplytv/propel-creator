import { useState } from "react";
import { useStories } from "@/hooks/useStories";
import { useAuth } from "@/context/AuthContext";
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
  const { groupedStories, isLoading } = useStories();
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);

  const userIds = Object.keys(groupedStories);
  const myStories = user ? groupedStories[user.id] : undefined;
  const otherUserIds = userIds.filter((id) => id !== user?.id);

  if (isLoading) {
    return (
      <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
            <div className="w-10 h-2 rounded bg-white/5 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div
        className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide"
        style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
      >
        {/* Your Story */}
        <button
          onClick={() => (myStories ? setViewingUserId(user!.id) : setShowCreator(true))}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className="relative w-16 h-16">
            {myStories ? (
              <div className="w-full h-full rounded-full p-[2px]" style={{ background: "rgba(255,255,255,0.2)" }}>
                <Avatar className="w-full h-full">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="bg-white/10 text-white text-xs">You</AvatarFallback>
                </Avatar>
              </div>
            ) : (
              <div className="w-full h-full rounded-full border-2 border-dashed border-white/20 flex items-center justify-center bg-white/5">
                <Plus className="w-5 h-5 text-white/60" />
              </div>
            )}
          </div>
          <span className="text-[10px] text-white/60 truncate max-w-[64px]">Your Story</span>
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
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <div
                className="w-16 h-16 rounded-full p-[2px]"
                style={{ background: "linear-gradient(135deg, #00FF85, #00E5FF)" }}
              >
                <Avatar className="w-full h-full border-2 border-[#0A0A0A]">
                  <AvatarImage src={avatar} />
                  <AvatarFallback className="bg-white/10 text-white text-[10px]">{initials}</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-[10px] text-white/60 truncate max-w-[64px]">{name.slice(0, 8)}</span>
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
