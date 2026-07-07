import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

interface PendingRequest {
  user_id: string;
  friend_id: string;
  initiated_by: string;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null; username: string | null };
}

export default function FriendRequestsSection() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ["friend-requests-incoming", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Incoming: where I'm one of the users and the other person initiated
      const { data } = await supabase
        .from("friend_connections")
        .select("*")
        .eq("status", "pending")
        .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`)
        .neq("initiated_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const rows = (data || []) as PendingRequest[];
      const otherIds = rows.map((r) => (r.user_id === user!.id ? r.friend_id : r.user_id));
      if (otherIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", otherIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return rows.map((r) => ({
        ...r,
        otherId: r.user_id === user!.id ? r.friend_id : r.user_id,
        profile: profileMap.get(r.user_id === user!.id ? r.friend_id : r.user_id),
      }));
    },
    staleTime: 30_000,
  });

  const accept = useMutation({
    mutationFn: async (otherId: string) => {
      const { error } = await supabase
        .from("friend_connections")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .or(`and(user_id.eq.${user!.id},friend_id.eq.${otherId}),and(user_id.eq.${otherId},friend_id.eq.${user!.id})`);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friend-requests-incoming"] });
      toast.success("Friend request accepted");
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const decline = useMutation({
    mutationFn: async (otherId: string) => {
      const { error } = await supabase
        .from("friend_connections")
        .delete()
        .or(`and(user_id.eq.${user!.id},friend_id.eq.${otherId}),and(user_id.eq.${otherId},friend_id.eq.${user!.id})`);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friend-requests-incoming"] });
      toast.success("Request dismissed");
    },
  });

  if (requests.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <h3 className="text-sm font-bold text-foreground mb-2">
        Pending Requests <span className="text-muted-foreground">({requests.length})</span>
      </h3>
      <div className="space-y-2">
        {requests.map((r: any) => (
          <div
            key={`${r.user_id}-${r.friend_id}`}
            className="flex items-center gap-3 rounded-xl p-2.5"
            style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={r.profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-muted text-foreground text-xs">
                {(r.profile?.display_name || "U").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {r.profile?.display_name || "Someone"}
              </p>
              <p className="text-[11px] text-muted-foreground">wants to connect</p>
            </div>
            <button
              onClick={() => accept.mutate(r.otherId)}
              disabled={accept.isPending}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95"
              style={{ backgroundColor: "#3D7CFF", color: "#0A0A0A" }}
              aria-label="Accept"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => decline.mutate(r.otherId)}
              disabled={decline.isPending}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95"
              style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
              aria-label="Decline"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
