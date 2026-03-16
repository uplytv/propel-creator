import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { toast } from "sonner";

export interface JobConversation {
  id: string;
  job_id: string;
  creator_id: string;
  applicant_id: string;
  created_at: string;
  updated_at: string;
  // Joined
  job_title?: string;
  other_name?: string;
  other_avatar?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

export interface JobMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

export function useJobConversations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["job-conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_conversations")
        .select("*")
        .or(`creator_id.eq.${user!.id},applicant_id.eq.${user!.id}`)
        .order("updated_at", { ascending: false });
      if (error) throw error;

      const conversations = data || [];
      if (conversations.length === 0) return [];

      // Fetch job titles
      const jobIds = [...new Set(conversations.map((c: any) => c.job_id))];
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title")
        .in("id", jobIds);
      const jobMap = new Map((jobs || []).map((j: any) => [j.id, j.title]));

      // Fetch other user profiles
      const otherIds = [...new Set(conversations.map((c: any) =>
        c.creator_id === user!.id ? c.applicant_id : c.creator_id
      ))];
      const { data: profiles } = await (supabase as any)
        .from("profiles_public")
        .select("user_id, display_name, avatar_url")
        .in("user_id", otherIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      // Fetch last message + unread counts for each conversation
      const enriched = await Promise.all(conversations.map(async (conv: any) => {
        const otherId = conv.creator_id === user!.id ? conv.applicant_id : conv.creator_id;
        const otherProfile = profileMap.get(otherId);

        const { data: lastMsg } = await supabase
          .from("job_messages")
          .select("content, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const { count } = await supabase
          .from("job_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .neq("sender_id", user!.id)
          .eq("read", false);

        return {
          ...conv,
          job_title: jobMap.get(conv.job_id) || "Unknown Job",
          other_name: (otherProfile as any)?.display_name || "User",
          other_avatar: (otherProfile as any)?.avatar_url,
          last_message: lastMsg?.[0]?.content,
          last_message_at: lastMsg?.[0]?.created_at,
          unread_count: count || 0,
        } as JobConversation;
      }));

      return enriched;
    },
  });
}

export function useJobMessages(conversationId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["job-messages", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set((data || []).map((m: any) => m.sender_id))];
      let profiles: any[] = [];
      if (senderIds.length > 0) {
        const { data: profileData } = await (supabase as any)
          .from("profiles_public")
          .select("user_id, display_name, avatar_url")
          .in("user_id", senderIds);
        profiles = profileData || [];
      }
      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

      return (data || []).map((msg: any) => ({
        ...msg,
        sender_name: profileMap.get(msg.sender_id)?.display_name || "User",
        sender_avatar: profileMap.get(msg.sender_id)?.avatar_url,
      })) as JobMessage[];
    },
  });

  // Mark messages as read
  useEffect(() => {
    if (!conversationId || !user) return;
    supabase
      .from("job_messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("read", false)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["job-conversations"] });
      });
  }, [conversationId, user, query.data]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`job-messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "job_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["job-messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["job-conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return query;
}

export function useSendJobMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("job_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
        });
      if (error) throw error;

      // Touch conversation updated_at
      await supabase
        .from("job_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["job-messages", vars.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["job-conversations"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send message");
    },
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, creatorId, applicantId, initialMessage }: {
      jobId: string;
      creatorId: string;
      applicantId: string;
      initialMessage: string;
    }) => {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from("job_conversations")
        .select("id")
        .eq("job_id", jobId)
        .eq("applicant_id", applicantId)
        .maybeSingle();

      let conversationId: string;

      if (existing) {
        conversationId = existing.id;
      } else {
        const { data, error } = await supabase
          .from("job_conversations")
          .insert({
            job_id: jobId,
            creator_id: creatorId,
            applicant_id: applicantId,
          })
          .select()
          .single();
        if (error) throw error;
        conversationId = data.id;
      }

      // Send the initial message
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: msgError } = await supabase
        .from("job_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: initialMessage,
        });
      if (msgError) throw msgError;

      return conversationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-conversations"] });
      toast.success("Message sent!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to start conversation");
    },
  });
}

export function useUnreadJobMessageCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["job-unread-count", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      // Get user's conversation IDs
      const { data: convs } = await supabase
        .from("job_conversations")
        .select("id")
        .or(`creator_id.eq.${user!.id},applicant_id.eq.${user!.id}`);

      if (!convs || convs.length === 0) return 0;
      const convIds = convs.map((c: any) => c.id);

      const { count } = await supabase
        .from("job_messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .neq("sender_id", user!.id)
        .eq("read", false);

      return count || 0;
    },
  });
}
