import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { UserPlus, Clock, Check } from "lucide-react";
import { toast } from "sonner";

interface AddFriendButtonProps {
  targetUserId: string;
  size?: "sm" | "md";
  className?: string;
}

type Status = "none" | "pending_outgoing" | "pending_incoming" | "accepted";

export default function AddFriendButton({
  targetUserId,
  size = "sm",
  className = "",
}: AddFriendButtonProps) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: status = "none" } = useQuery<Status>({
    queryKey: ["friend-status", user?.id, targetUserId],
    enabled: !!user && !!targetUserId && user?.id !== targetUserId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("friend_connections")
        .select("status, initiated_by, user_id, friend_id")
        .or(
          `and(user_id.eq.${user!.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user!.id})`
        )
        .maybeSingle();
      if (!data) return "none";
      if (data.status === "accepted") return "accepted";
      if (data.initiated_by === user!.id) return "pending_outgoing";
      return "pending_incoming";
    },
    staleTime: 30_000,
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      // Always sort to satisfy primary key uniqueness
      const [a, b] = [user.id, targetUserId].sort();
      const { error } = await (supabase as any)
        .from("friend_connections")
        .insert({ user_id: a, friend_id: b, initiated_by: user.id, status: "pending" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friend-status", user?.id, targetUserId] });
      toast.success("Friend request sent");
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("friend_connections")
        .delete()
        .or(
          `and(user_id.eq.${user!.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user!.id})`
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friend-status", user?.id, targetUserId] });
      toast.success("Cancelled");
    },
  });

  if (!user || user.id === targetUserId) return null;

  const sizeClasses =
    size === "md" ? "px-4 py-2 text-sm gap-1.5" : "px-3 py-1.5 text-xs gap-1";

  if (status === "accepted") {
    return (
      <button
        disabled
        className={`inline-flex items-center font-semibold rounded-lg ${sizeClasses} ${className}`}
        style={{ backgroundColor: "rgba(61, 124, 255,0.15)", color: "#3D7CFF" }}
      >
        <Check className="w-3.5 h-3.5" /> Friends
      </button>
    );
  }

  if (status === "pending_outgoing") {
    return (
      <button
        onClick={() => cancel.mutate()}
        disabled={cancel.isPending}
        className={`inline-flex items-center font-semibold rounded-lg ${sizeClasses} ${className}`}
        style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
      >
        <Clock className="w-3.5 h-3.5" /> Requested
      </button>
    );
  }

  if (status === "pending_incoming") {
    return (
      <button
        onClick={() => (window.location.href = "/social/friends")}
        className={`inline-flex items-center font-semibold rounded-lg ${sizeClasses} ${className}`}
        style={{ backgroundColor: "#3D7CFF", color: "#0A0A0A" }}
      >
        Respond
      </button>
    );
  }

  return (
    <button
      onClick={() => send.mutate()}
      disabled={send.isPending}
      className={`inline-flex items-center font-semibold rounded-lg ${sizeClasses} ${className}`}
      style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#fff" }}
    >
      <UserPlus className="w-3.5 h-3.5" /> Add Friend
    </button>
  );
}
