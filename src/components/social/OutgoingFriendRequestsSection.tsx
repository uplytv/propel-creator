import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { X, Clock } from "lucide-react";
import { toast } from "sonner";

export default function OutgoingFriendRequestsSection() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ["friend-requests-outgoing", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("friend_connections")
        .select("*")
        .eq("status", "pending")
        .eq("initiated_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const rows = data || [];
      const otherIds = rows.map((r: any) => (r.user_id === user!.id ? r.friend_id : r.user_id));
      if (otherIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", otherIds);
      const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return rows.map((r: any) => {
        const otherId = r.user_id === user!.id ? r.friend_id : r.user_id;
        return { ...r, otherId, profile: map.get(otherId) };
      });
    },
    staleTime: 30_000,
  });

  const cancel = useMutation({
    mutationFn: async (otherId: string) => {
      const { error } = await (supabase as any)
        .from("friend_connections")
        .delete()
        .or(
          `and(user_id.eq.${user!.id},friend_id.eq.${otherId}),and(user_id.eq.${otherId},friend_id.eq.${user!.id})`
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friend-requests-outgoing"] });
      toast.success("Request cancelled");
    },
  });

  if (requests.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <h3 className="text-sm font-bold text-white/80 mb-2 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        Sent Requests <span className="text-white/40">({requests.length})</span>
      </h3>
      <div className="space-y-2">
        {requests.map((r: any) => (
          <div
            key={`${r.user_id}-${r.friend_id}`}
            className="flex items-center gap-3 rounded-xl p-2.5"
            style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Avatar className="w-9 h-9">
              <AvatarImage src={r.profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-white/10 text-white text-xs">
                {(r.profile?.display_name || "U").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {r.profile?.display_name || "Someone"}
              </p>
              <p className="text-[11px] text-white/40">Awaiting response</p>
            </div>
            <button
              onClick={() => cancel.mutate(r.otherId)}
              disabled={cancel.isPending}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-transform active:scale-95 inline-flex items-center gap-1"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
