import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface Conversation {
  id: string;
  participant_one: string;
  participant_two: string;
  last_message_at: string;
  other_user?: { display_name: string; avatar_url: string | null; username: string | null };
  last_message?: string;
  unread_count?: number;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export function useDirectMessages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: convos } = await supabase
      .from("direct_conversations")
      .select("*")
      .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (!convos?.length) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const otherIds = convos.map((c) => c.participant_one === user.id ? c.participant_two : c.participant_one);
    const { data: profiles } = await supabase
      .from("profiles_public" as any)
      .select("user_id, display_name, avatar_url, username")
      .in("user_id", otherIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

    // Get last message and unread count per conversation
    const enriched = await Promise.all(
      convos.map(async (c) => {
        const otherId = c.participant_one === user.id ? c.participant_two : c.participant_one;
        const { data: lastMsg } = await supabase
          .from("direct_messages")
          .select("content")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count } = await supabase
          .from("direct_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .eq("read", false)
          .neq("sender_id", user.id);

        return {
          ...c,
          other_user: profileMap.get(otherId) || { display_name: "User", avatar_url: null, username: null },
          last_message: lastMsg?.content,
          unread_count: count || 0,
        };
      })
    );

    setConversations(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dm-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchConversations]);

  const getOrCreateConversation = useCallback(async (otherUserId: string) => {
    if (!user) return null;
    const [p1, p2] = [user.id, otherUserId].sort();

    const { data: existing } = await supabase
      .from("direct_conversations")
      .select("id")
      .eq("participant_one", p1)
      .eq("participant_two", p2)
      .maybeSingle();

    if (existing) return existing.id;

    const { data: created, error } = await supabase
      .from("direct_conversations")
      .insert({ participant_one: p1, participant_two: p2 })
      .select("id")
      .single();

    if (error) throw error;
    return created.id;
  }, [user]);

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!user) return;
    await supabase.from("direct_messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    });
    await supabase
      .from("direct_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);
  }, [user]);

  const markRead = useCallback(async (conversationId: string) => {
    if (!user) return;
    await supabase
      .from("direct_messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("read", false);
  }, [user]);

  return { conversations, loading, getOrCreateConversation, sendMessage, markRead, refetch: fetchConversations };
}

export function useConversationMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((data as DirectMessage[]) || []);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as DirectMessage]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  return { messages, loading, refetch: fetchMessages };
}
