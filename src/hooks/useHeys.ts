import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const DAILY_FREE_LIMIT = 5;

export function useHeys() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: receivedHeys = [], isLoading } = useQuery({
    queryKey: ["heys", "received", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("heys")
        .select("*, sender:sender_id(display_name, avatar_url, username)")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const { data: sentTodayCount = 0 } = useQuery({
    queryKey: ["heys", "sent-today", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await (supabase as any)
        .from("heys")
        .select("*", { count: "exact", head: true })
        .eq("sender_id", user.id)
        .eq("hey_type", "free")
        .gte("created_at", todayStart.toISOString());
      return count || 0;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const sendHey = useMutation({
    mutationFn: async (params: { recipientId: string; eventId?: string }) => {
      if (!user) throw new Error("Not authenticated");
      if (sentTodayCount >= DAILY_FREE_LIMIT) {
        throw new Error("Daily Hey limit reached");
      }
      const { error } = await (supabase as any).from("heys").insert({
        sender_id: user.id,
        recipient_id: params.recipientId,
        event_id: params.eventId || null,
        hey_type: "free",
      });
      if (error) {
        if (error.code === "23505") throw new Error("Already sent Hey");
        throw error;
      }
      // Create notification
      await (supabase as any).from("notifications").insert({
        user_id: params.recipientId,
        type: "hey",
        title: "Someone Heyed you 👋",
        message: "Someone Heyed you nearby",
        actor_id: user.id,
      });
    },
    onSuccess: () => {
      toast.success("Hey sent! 👋");
      queryClient.invalidateQueries({ queryKey: ["heys"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const markMutual = useMutation({
    mutationFn: async (heyId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { data: hey } = await (supabase as any).from("heys").select("*").eq("id", heyId).single();
      if (!hey) throw new Error("Hey not found");

      await (supabase as any).from("heys").update({ is_mutual: true, sender_revealed: true }).eq("id", heyId);

      // Notify original sender of mutual match
      await (supabase as any).from("notifications").insert({
        user_id: hey.sender_id,
        type: "hey_mutual",
        title: "It's a match! 👋",
        message: "Someone Heyed you back — you're a match!",
        actor_id: user.id,
      });
    },
    onSuccess: () => {
      toast.success("It's a match! 🎉");
      queryClient.invalidateQueries({ queryKey: ["heys"] });
    },
  });

  const recentReceivedCount = receivedHeys.filter((h: any) => {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return new Date(h.created_at) > dayAgo;
  }).length;

  return {
    receivedHeys,
    isLoading,
    sentTodayCount,
    dailyLimit: DAILY_FREE_LIMIT,
    canSendFreeHey: sentTodayCount < DAILY_FREE_LIMIT,
    recentReceivedCount,
    sendHey: sendHey.mutateAsync,
    markMutual: markMutual.mutate,
  };
}
