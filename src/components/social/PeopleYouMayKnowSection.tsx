import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useFollows } from "@/hooks/useFollows";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";

export default function PeopleYouMayKnowSection() {
  const { user } = useAuth();
  const { followingIds, follow, isFollowing } = useFollows();
  const navigate = useNavigate();

  const { data: people = [] } = useQuery({
    queryKey: ["pymk", user?.id, followingIds.length],
    enabled: !!user,
    queryFn: async () => {
      // Users my friends follow that I don't follow
      if (followingIds.length === 0) {
        // Fallback: random recent profiles
        const { data } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, username")
          .neq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(8);
        return data || [];
      }
      const { data: secondDegree } = await supabase
        .from("follows")
        .select("following_id")
        .in("follower_id", followingIds)
        .limit(50);

      const candidateIds = Array.from(
        new Set(
          (secondDegree || [])
            .map((r: any) => r.following_id)
            .filter((id: string) => id !== user!.id && !followingIds.includes(id))
        )
      ).slice(0, 8);

      if (candidateIds.length === 0) return [];

      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", candidateIds);
      return profs || [];
    },
    staleTime: 60_000,
  });

  if (people.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <h3 className="text-sm font-bold text-foreground mb-2">People You May Know</h3>
      <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
        {people.map((p: any) => {
          const following = isFollowing(p.user_id);
          return (
            <div
              key={p.user_id}
              onClick={() => navigate(`/${p.username || p.user_id}`)}
              className="flex-shrink-0 w-32 rounded-xl p-3 flex flex-col items-center text-center cursor-pointer transition-transform active:scale-[0.97]"
              style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            >
              <Avatar className="w-14 h-14 mb-2">
                <AvatarImage src={p.avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-foreground text-xs">
                  {(p.display_name || "U").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs font-semibold text-foreground truncate w-full">
                {p.display_name || p.username || "User"}
              </p>
              {p.username && (
                <p className="text-[10px] text-muted-foreground truncate w-full">@{p.username}</p>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!following) follow(p.user_id);
                }}
                disabled={following}
                className="mt-2 px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 transition-transform active:scale-95"
                style={{
                  backgroundColor: following ? "hsl(var(--muted))" : "#3D7CFF",
                  color: following ? "hsl(var(--muted-foreground))" : "#0A0A0A",
                }}
              >
                {following ? "Following" : (<><UserPlus className="w-3 h-3" /> Follow</>)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
