import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { DM_MAX_LENGTH } from "@/lib/dm";

export interface DmProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

export interface DmThread {
  id: string;
  participant_one: string;
  participant_two: string;
  last_message_at: string;
  other_user: DmProfile;
  last_message: string | null;
  unread_count: number;
}

export interface DmMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
  /** Optimistic-send lifecycle flags (client-only). */
  pending?: boolean;
  failed?: boolean;
}

const FALLBACK_PROFILE = (userId: string): DmProfile => ({
  user_id: userId,
  display_name: "Member",
  avatar_url: null,
  username: null,
});

/** Thread list with other-user profile, last-message preview, unread count. */
export function useDmThreads() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const fetchThreads = useCallback(async () => {
    if (!user) return;
    if (!loadedOnce.current) setLoading(true);

    const { data: convos, error: convoError } = await (supabase as any)
      .from("direct_conversations")
      .select("*")
      .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
      .order("last_message_at", { ascending: false })
      .limit(100);

    if (convoError) {
      setError(convoError.message ?? "Could not load conversations");
      setLoading(false);
      return;
    }
    setError(null);

    if (!convos?.length) {
      setThreads([]);
      setLoading(false);
      loadedOnce.current = true;
      return;
    }

    const convoIds = convos.map((c: any) => c.id);
    const otherIds = convos.map((c: any) => (c.participant_one === user.id ? c.participant_two : c.participant_one));

    // Batched lookups: profiles + all my unread rows in one query each.
    const [{ data: profiles }, { data: unreadRows }] = await Promise.all([
      (supabase as any)
        .from("profiles_public")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", otherIds),
      (supabase as any)
        .from("direct_messages")
        .select("conversation_id")
        .in("conversation_id", convoIds)
        .eq("read", false)
        .neq("sender_id", user.id),
    ]);

    const profileMap = new Map<string, DmProfile>((profiles ?? []).map((p: any) => [p.user_id, p]));
    const unreadMap = new Map<string, number>();
    for (const row of unreadRows ?? []) {
      unreadMap.set(row.conversation_id, (unreadMap.get(row.conversation_id) ?? 0) + 1);
    }

    // Last-message previews (one light query per thread, same as useInbox).
    const previews = await Promise.all(
      convos.map((c: any) =>
        (supabase as any)
          .from("direct_messages")
          .select("content")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then((r: any) => r.data?.content ?? null)
      )
    );

    setThreads(
      convos.map((c: any, i: number) => {
        const otherId = c.participant_one === user.id ? c.participant_two : c.participant_one;
        return {
          id: c.id,
          participant_one: c.participant_one,
          participant_two: c.participant_two,
          last_message_at: c.last_message_at ?? c.created_at,
          other_user: profileMap.get(otherId) ?? FALLBACK_PROFILE(otherId),
          last_message: previews[i],
          unread_count: unreadMap.get(c.id) ?? 0,
        };
      })
    );
    setLoading(false);
    loadedOnce.current = true;
  }, [user]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dm-threads-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, () => fetchThreads())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages" }, () => fetchThreads())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_conversations" }, () => fetchThreads())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchThreads]);

  return { threads, loading, error, refetch: fetchThreads };
}

/** Active thread: history + realtime inserts + optimistic send + mark-read. */
export function useDmMessages(threadId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    const { data, error: fetchError } = await (supabase as any)
      .from("direct_messages")
      .select("id, conversation_id, sender_id, content, read, created_at")
      .eq("conversation_id", threadId)
      .order("created_at", { ascending: true })
      .limit(300);
    if (fetchError) {
      setError(fetchError.message ?? "Could not load messages");
    } else {
      setError(null);
      setMessages((data as DmMessage[]) ?? []);
    }
    setLoading(false);
  }, [threadId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime: append inserts (deduping against optimistic sends), track reads.
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`dm-thread-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${threadId}` },
        (payload) => {
          const incoming = payload.new as DmMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            // My own message echoing back: replace the matching optimistic row.
            const pendingIdx = prev.findIndex(
              (m) => m.pending && m.sender_id === incoming.sender_id && m.content === incoming.content
            );
            if (pendingIdx >= 0) {
              const next = [...prev];
              next[pendingIdx] = incoming;
              return next;
            }
            return [...prev, incoming];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${threadId}` },
        (payload) => {
          const updated = payload.new as DmMessage;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  /** Optimistic send. Returns true on success; failed sends stay visible with a retry affordance. */
  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      const body = content.trim();
      if (!user || !threadId || !body || body.length > DM_MAX_LENGTH) return false;

      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: DmMessage = {
        id: tempId,
        conversation_id: threadId,
        sender_id: user.id,
        content: body,
        read: false,
        created_at: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);

      const { data, error: sendError } = await (supabase as any)
        .from("direct_messages")
        .insert({ conversation_id: threadId, sender_id: user.id, content: body })
        .select("id, conversation_id, sender_id, content, read, created_at")
        .single();

      if (sendError) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
        return false;
      }
      setMessages((prev) => {
        // The realtime echo may have already swapped the optimistic row in.
        if (prev.some((m) => m.id === data.id)) return prev.filter((m) => m.id !== tempId);
        return prev.map((m) => (m.id === tempId ? (data as DmMessage) : m));
      });
      return true;
    },
    [user, threadId]
  );

  const removeFailedMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  /** Mark everything addressed to me in this thread as read. */
  const markRead = useCallback(async () => {
    if (!user || !threadId) return;
    await (supabase as any)
      .from("direct_messages")
      .update({ read: true })
      .eq("conversation_id", threadId)
      .neq("sender_id", user.id)
      .eq("read", false);
  }, [user, threadId]);

  return { messages, loading, error, sendMessage, removeFailedMessage, markRead, refetch: fetchMessages };
}
