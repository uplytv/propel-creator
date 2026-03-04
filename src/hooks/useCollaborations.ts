import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface DbCollaboration {
  id: string;
  creator_id: string;
  partner_id: string | null;
  partner_name: string;
  title: string;
  description: string | null;
  status: string;
  type: string;
  revenue_split: number;
  created_at: string;
  updated_at: string;
}

export interface DbChatMessage {
  id: string;
  collaboration_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

// ── Collaborations ─────────────────────────────────────────────────────────────
export function useCollaborations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["collaborations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collaborations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DbCollaboration[];
    },
    enabled: !!user,
  });
}

export function useCreateCollaboration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (collab: {
      partner_name: string;
      title: string;
      description?: string;
      revenue_split: number;
      type?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("collaborations")
        .insert({
          creator_id: user.id,
          partner_name: collab.partner_name,
          title: collab.title,
          description: collab.description || null,
          revenue_split: collab.revenue_split,
          type: collab.type || "joint-product",
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborations"] });
    },
  });
}

// ── Chat Messages ──────────────────────────────────────────────────────────────
export function useChatMessages(collaborationId: string | null) {
  const queryClient = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    if (!collaborationId) return;

    const channel = supabase
      .channel(`chat-${collaborationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `collaboration_id=eq.${collaborationId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["chat_messages", collaborationId],
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `collaboration_id=eq.${collaborationId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["chat_messages", collaborationId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [collaborationId, queryClient]);

  return useQuery({
    queryKey: ["chat_messages", collaborationId],
    queryFn: async () => {
      if (!collaborationId) return [];
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("collaboration_id", collaborationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DbChatMessage[];
    },
    enabled: !!collaborationId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      collaborationId,
      content,
    }: {
      collaborationId: string;
      content: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          collaboration_id: collaborationId,
          sender_id: user.id,
          content,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["chat_messages", vars.collaborationId],
      });
    },
  });
}

export function useMarkMessagesRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (collaborationId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("chat_messages")
        .update({ read: true })
        .eq("collaboration_id", collaborationId)
        .neq("sender_id", user.id)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: (_, collaborationId) => {
      queryClient.invalidateQueries({
        queryKey: ["chat_messages", collaborationId],
      });
    },
  });
}

export function useUnreadMessageCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread_messages", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .neq("sender_id", user.id)
        .eq("read", false);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}
