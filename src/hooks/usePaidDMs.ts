import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function usePaidDMsReceived() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["paid-dms-received", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("paid_dms" as any)
        .select("*")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });
}

export function usePaidDMsSent() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["paid-dms-sent", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("paid_dms" as any)
        .select("*")
        .eq("sender_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });
}

export function useMarkDMRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dmId: string) => {
      const { error } = await supabase
        .from("paid_dms" as any)
        .update({ is_read: true })
        .eq("id", dmId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paid-dms-received"] });
    },
  });
}

export function useReplyToDM() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ dmId, message }: { dmId: string; message: string }) => {
      const { error } = await supabase.from("paid_dm_replies" as any).insert({
        dm_id: dmId,
        creator_id: user!.id,
        message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paid-dms-received"] });
    },
  });
}
