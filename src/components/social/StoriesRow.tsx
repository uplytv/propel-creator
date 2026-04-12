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
      <div
        className="mx-4 mt-3 rounded-2xl p-4"
        style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
      >
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="w-[72px] h-[72px] rounded-full bg-white/5 animate-pulse" />
              <div className="w-12 h-2.5 rounded bg-white/5 animate-pulse" />
              <div className="w-10 h-2 rounded bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="mx-4 mt-3 rounded-2xl px-3 py-4"
        style={{
          background: "linear-gradient(135deg, rgba(255,180,100,0.08) 0%, rgba(255,100,150,0.06) 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {/* Your Plan / Story */}
          <button
            onClick={() => (myStories ? setViewingUserId(user!.id) : setShowCreator(true))}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div className="relative w-[72px] h-[72px]">
              {myStories ? (
                <div
                  className="w-full h-full rounded-full p-[2.5px]"
                  style={{ background: "linear-gradient(135deg, #00FF85, #00E5FF)" }}
                >
                  <Avatar className="w-full h-full border-2 border-[#0A0A0A]">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="bg-white/10 text-white text-xs">You</AvatarFallback>
                  </Avatar>
                </div>
              ) : (
                <div
                  className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
                    border: "2px dashed rgba(255,255,255,0.15)",
                  }}
                >
                  <Plus className="w-6 h-6 text-white/50" />
                </div>
              )}
              {!myStories && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#00FF85" }}
                >
                  <Plus className="w-3.5 h-3.5 text-black" strokeWidth={3} />
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold text-white/80 leading-tight">Your Plan</span>
          </button>

          {/* Other users' stories */}
          {otherUserIds.map((uid) => {
            const userStories = groupedStories[uid];
            const profile = userStories[0]?.profiles;
            const name = profile?.display_name || "User";
            const avatar = profile?.avatar_url;
            const location = profile?.location || "";
            const initials = name.slice(0, 2).toUpperCase();

            return (
              <button
                key={uid}
                onClick={() => setViewingUserId(uid)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <div
                  className="w-[72px] h-[72px] rounded-full p-[2.5px]"
                  style={{ background: "linear-gradient(135deg, #FF6B9D, #C084FC)" }}
                >
                  <Avatar className="w-full h-full border-2 border-[#0A0A0A]">
                    <AvatarImage src={avatar} />
                    <AvatarFallback className="bg-white/10 text-white text-[11px] font-bold">{initials}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex flex-col items-center max-w-[72px]">
                  <span className="text-[11px] font-semibold text-white/90 truncate max-w-full leading-tight">{name.split(" ")[0]}</span>
                  {location && (
                    <span className="text-[9px] text-white/40 truncate max-w-full leading-tight">{location}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
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
