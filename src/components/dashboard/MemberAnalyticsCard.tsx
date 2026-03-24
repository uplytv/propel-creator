import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MemberActivity {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  posts: number;
  comments: number;
  likes: number;
  score: number;
  joined_at: string;
}

export function MemberAnalyticsCard() {
  const { user } = useAuth();

  const { data: topMembers = [], isLoading } = useQuery({
    queryKey: ["member-analytics", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MemberActivity[]> => {
      // Get all community members
      const { data: members } = await supabase
        .from("community_members")
        .select("user_id, joined_at")
        .eq("creator_id", user!.id)
        .order("joined_at", { ascending: false })
        .limit(100);

      if (!members?.length) return [];
      const userIds = members.map((m: any) => m.user_id);

      // Fetch engagement data in parallel
      const [postsRes, commentsRes, likesRes, profilesRes] = await Promise.all([
        supabase.from("community_posts").select("author_id").eq("creator_id", user!.id).in("author_id", userIds),
        supabase.from("community_comments").select("author_id").in("author_id", userIds),
        supabase.from("community_post_likes").select("user_id").in("user_id", userIds),
        supabase.from("profiles_public" as any).select("user_id, display_name, avatar_url").in("user_id", userIds),
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
      const joinMap = new Map(members.map((m: any) => [m.user_id, m.joined_at]));

      // Count per user
      const postCounts = new Map<string, number>();
      const commentCounts = new Map<string, number>();
      const likeCounts = new Map<string, number>();

      (postsRes.data || []).forEach((p: any) => postCounts.set(p.author_id, (postCounts.get(p.author_id) || 0) + 1));
      (commentsRes.data || []).forEach((c: any) => commentCounts.set(c.author_id, (commentCounts.get(c.author_id) || 0) + 1));
      (likesRes.data || []).forEach((l: any) => likeCounts.set(l.user_id, (likeCounts.get(l.user_id) || 0) + 1));

      return userIds
        .map((uid) => {
          const posts = postCounts.get(uid) || 0;
          const comments = commentCounts.get(uid) || 0;
          const likes = likeCounts.get(uid) || 0;
          const profile = profileMap.get(uid) as any;
          return {
            user_id: uid,
            display_name: profile?.display_name || "Member",
            avatar_url: profile?.avatar_url || null,
            posts,
            comments,
            likes,
            score: posts * 5 + comments * 2 + likes,
            joined_at: joinMap.get(uid) || "",
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
    },
  });

  const retentionRate = useMemo(() => {
    if (!topMembers.length) return 0;
    const active = topMembers.filter((m) => m.score > 0).length;
    return Math.round((active / topMembers.length) * 100);
  }, [topMembers]);

  if (isLoading) return null;

  return (
    <Card className="border-border mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Top Engaged Members
          </span>
          <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {retentionRate}% active
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {topMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No members yet</p>
        ) : (
          topMembers.map((member, i) => (
            <div key={member.user_id} className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
              <Avatar className="w-7 h-7">
                <AvatarImage src={member.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                  {member.display_name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.display_name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {member.posts}p · {member.comments}c · {member.likes}♥
                </p>
              </div>
              <span className="text-xs font-bold text-primary">{member.score} pts</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
