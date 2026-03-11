import { useAuth } from "@/context/AuthContext";
import { useCreatorSpace } from "@/hooks/useCreatorSpace";
import { useMemberCount, useIsMember, useJoinCommunity } from "@/hooks/useCommunityMembers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, MessageSquare, Lock, Globe, Tag, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  creatorId: string;
  isOwner: boolean;
}

export default function SpaceAboutTab({ creatorId, isOwner }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: space } = useCreatorSpace(creatorId);
  const { data: memberCount = 0 } = useMemberCount(creatorId);
  const { data: isMember = false } = useIsMember(creatorId);
  const joinCommunity = useJoinCommunity();

  const { data: creatorProfile } = useQuery({
    queryKey: ["creator-profile-about", creatorId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", creatorId).maybeSingle();
      return data;
    },
  });

  const { data: postCount = 0 } = useQuery({
    queryKey: ["space-post-count", creatorId],
    queryFn: async () => {
      const { count } = await supabase.from("community_posts" as any).select("*", { count: "exact", head: true }).eq("creator_id", creatorId);
      return count || 0;
    },
  });

  const { data: lessonCount = 0 } = useQuery({
    queryKey: ["space-lesson-count", creatorId],
    queryFn: async () => {
      const { count } = await supabase.from("classroom_lessons" as any).select("*", { count: "exact", head: true }).eq("creator_id", creatorId);
      return count || 0;
    },
  });

  const handleJoin = async () => {
    if (!user) return;
    try {
      await joinCommunity.mutateAsync(creatorId);
      toast({ title: "Welcome to the community! 🎉" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const spaceName = space?.name || creatorProfile?.display_name || "Creator Space";
  const coverImage = space?.cover_image_url;
  const avatar = space?.avatar_url || creatorProfile?.avatar_url;
  const bio = space?.description || creatorProfile?.bio || "";
  const isPublic = space?.is_public !== false;
  const isFree = space?.is_free !== false;

  return (
    <div>
      {/* Cover Image */}
      <div className="w-full aspect-video relative" style={{ background: "#111111" }}>
        {coverImage ? (
          <img src={coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #111111, #1e1e1e)" }}>
            <span className="text-4xl">🚀</span>
          </div>
        )}
        {/* Avatar overlapping */}
        <div className="absolute -bottom-8 left-4">
          {avatar ? (
            <img src={avatar} alt="" className="w-16 h-16 rounded-full object-cover border-4" style={{ borderColor: "#0A0A0A" }} />
          ) : (
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-4" style={{ borderColor: "#0A0A0A", background: "#1e1e1e", color: "#fff" }}>
              {spaceName.charAt(0)}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pt-12">
        <h2 className="text-lg font-bold text-white mb-1">{spaceName}</h2>

        {/* Stats */}
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-1 text-xs" style={{ color: "#888" }}>
            <Users className="w-3.5 h-3.5" /> {memberCount} members
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: "#888" }}>
            <MessageSquare className="w-3.5 h-3.5" /> {postCount} posts
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: "#888" }}>
            <BookOpen className="w-3.5 h-3.5" /> {lessonCount} lessons
          </div>
        </div>

        {/* Badges */}
        <div className="flex gap-2 mb-4">
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: "#1e1e1e", color: "#888" }}>
            {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {isPublic ? "Public" : "Private"}
          </span>
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: "#1e1e1e", color: "#888" }}>
            <Tag className="w-3 h-3" />
            {isFree ? "Free" : `$${space?.price || 0}/mo`}
          </span>
        </div>

        {/* Join Button */}
        {!isOwner && user && (
          isMember ? (
            <div className="flex items-center gap-2 text-sm mb-4" style={{ color: "#00FF85" }}>
              <CheckCircle className="w-4 h-4" /> Joined
            </div>
          ) : (
            <Button onClick={handleJoin} className="mb-4 font-semibold" style={{ background: "#00FF85", color: "#0A0A0A" }}>
              Join Community
            </Button>
          )
        )}

        {/* Bio / Description */}
        {bio && (
          <div className="p-4 rounded-lg mb-4" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
            <p className="text-sm leading-relaxed" style={{ color: "#ccc" }}>{bio}</p>
          </div>
        )}
      </div>
    </div>
  );
}
