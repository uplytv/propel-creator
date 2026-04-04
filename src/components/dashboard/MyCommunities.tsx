import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function MyCommunities() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: communities = [], isLoading } = useQuery({
    queryKey: ["my-communities", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get communities the user has joined
      const { data: memberships, error } = await supabase
        .from("community_members")
        .select("creator_id, joined_at")
        .eq("user_id", user!.id)
        .order("joined_at", { ascending: false });
      if (error) throw error;
      if (!memberships || memberships.length === 0) return [];

      const creatorIds = memberships.map((m: any) => m.creator_id);

      // Get creator spaces info
      const { data: spaces } = await supabase
        .from("creator_spaces")
        .select("creator_id, name, avatar_url, description")
        .in("creator_id", creatorIds);

      // Get profile info as fallback
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", creatorIds);

      // Get member counts
      const { data: memberCounts } = await supabase
        .from("community_members")
        .select("creator_id")
        .in("creator_id", creatorIds);

      const countMap: Record<string, number> = {};
      (memberCounts || []).forEach((m: any) => {
        countMap[m.creator_id] = (countMap[m.creator_id] || 0) + 1;
      });

      const spaceMap = new Map((spaces || []).map((s: any) => [s.creator_id, s]));
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return creatorIds.map((cid: string) => {
        const space = spaceMap.get(cid) as any;
        const profile = profileMap.get(cid) as any;
        return {
          creatorId: cid,
          name: space?.name || profile?.display_name || "Community",
          avatarUrl: space?.avatar_url || profile?.avatar_url || null,
          memberCount: countMap[cid] || 0,
        };
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">My Communities</h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-[140px] h-[80px] rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (communities.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">My Communities</h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {communities.map((c: any, i: number) => (
          <motion.button
            key={c.creatorId}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(`/community/${c.creatorId}`)}
            className="flex-shrink-0 glass-card p-3 w-[150px] text-left group hover:border-primary/20 transition-all"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={c.avatarUrl} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {c.name?.charAt(0)?.toUpperCase() || "C"}
                </AvatarFallback>
              </Avatar>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-muted-foreground ml-auto transition-colors" />
            </div>
            <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Users className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{c.memberCount} members</span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
