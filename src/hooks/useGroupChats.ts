import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface GroupConversation {
  id: string;
  name: string | null;
  avatar_url: string | null;
  event_id: string | null;
  created_at: string;
  member_count?: number;
  last_message?: string;
  last_message_at?: string;
}

export interface GroupMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  created_at: string;
  profile?: { display_name: string; avatar_url: string | null };
}

export function useGroupChats() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get groups user is a member of
    const { data: memberships } = await supabase
      .from("group_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!memberships?.length) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const ids = memberships.map((m: any) => m.conversation_id);
    const { data: convos } = await supabase
      .from("group_conversations")
      .select("*")
      .in("id", ids)
      .order("created_at", { ascending: false });

    // Enrich with last message
    const enriched = await Promise.all(
      (convos || []).map(async (g: any) => {
        const { data: lastMsg } = await supabase
          .from("group_messages")
          .select("content, created_at")
          .eq("conversation_id", g.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count } = await supabase
          .from("group_members")
          .select("user_id", { count: "exact", head: true })
          .eq("conversation_id", g.id);

        return {
          ...g,
          member_count: count || 0,
          last_message: lastMsg?.content,
          last_message_at: lastMsg?.created_at || g.created_at,
        };
      })
    );

    setGroups(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("group-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages" }, () => fetchGroups())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchGroups]);

  return { groups, loading, refetch: fetchGroups };
}

export function useGroupMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    const { data } = await supabase
      .from("group_messages")
      .select("*, profiles:user_id(display_name, avatar_url)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);

    setMessages(
      (data || []).map((m: any) => ({
        ...m,
        profile: m.profiles || { display_name: "User", avatar_url: null },
      }))
    );
    setLoading(false);
  }, [conversationId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (!conversationId) return;
    const ch = supabase
      .channel(`group-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `conversation_id=eq.${conversationId}` }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId, fetchMessages]);

  return { messages, loading };
}
