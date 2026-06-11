import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { useStories } from "@/hooks/useStories";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import StoryReactions from "./StoryReactions";

interface StoryViewerProps {
  userId: string;
  stories: any[];
  allUserIds: string[];
  onClose: () => void;
  onNavigateUser: (uid: string) => void;
}

export default function StoryViewer({ userId, stories, allUserIds, onClose, onNavigateUser }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { markViewed } = useStories();
  const { user } = useAuth();
  const story = stories[currentIndex];

  useEffect(() => {
    if (story && user && story.user_id !== user.id) {
      markViewed(story.id);
    }
  }, [story?.id]);

  // Auto-advance every 5s
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentIndex < stories.length - 1) {
        setCurrentIndex((p) => p + 1);
      } else {
        const idx = allUserIds.indexOf(userId);
        if (idx < allUserIds.length - 1) {
          onNavigateUser(allUserIds[idx + 1]);
        } else {
          onClose();
        }
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentIndex, stories.length, userId]);

  const handleTap = useCallback(
    (e: React.MouseEvent) => {
      const x = e.clientX;
      const mid = window.innerWidth / 2;
      if (x < mid) {
        if (currentIndex > 0) setCurrentIndex((p) => p - 1);
        else {
          const idx = allUserIds.indexOf(userId);
          if (idx > 0) onNavigateUser(allUserIds[idx - 1]);
        }
      } else {
        if (currentIndex < stories.length - 1) setCurrentIndex((p) => p + 1);
        else {
          const idx = allUserIds.indexOf(userId);
          if (idx < allUserIds.length - 1) onNavigateUser(allUserIds[idx + 1]);
          else onClose();
        }
      }
    },
    [currentIndex, stories.length, userId, allUserIds]
  );

  if (!story) return null;

  const profile = story.profiles;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={handleTap}>
      {/* Progress bars */}
      <div className="flex gap-1 p-2 pt-3">
        {stories.map((_: any, i: number) => (
          <div key={i} className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                i < currentIndex ? "w-full bg-white" : i === currentIndex ? "w-full bg-white animate-pulse" : "w-0"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2" onClick={(e) => e.stopPropagation()}>
        <Avatar className="w-8 h-8">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback className="bg-white/10 text-white text-xs">
            {(profile?.display_name || "U").slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{profile?.display_name}</p>
          <p className="text-[10px] text-white/50">{formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}</p>
        </div>
        <button onClick={onClose} aria-label="Close" className="p-1">
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Media */}
      <div className="flex-1 flex items-center justify-center px-2">
        {story.media_type === "video" ? (
          <video src={story.media_url} className="max-h-full max-w-full rounded-xl object-contain" autoPlay muted playsInline />
        ) : (
          <img src={story.media_url} className="max-h-full max-w-full rounded-xl object-contain" alt={`Story by ${profile?.display_name || "user"}`} loading="lazy" />
        )}
      </div>

      {/* Caption */}
      {story.caption && (
        <div className="px-4 py-2">
          <p className="text-sm text-white">{story.caption}</p>
        </div>
      )}

      {/* Reactions & Reply */}
      {user && story.user_id !== user.id && (
        <StoryReactions storyId={story.id} storyOwnerId={story.user_id} />
      )}
    </div>
  );
}
