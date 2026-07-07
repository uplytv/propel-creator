import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface InboxThread {
  id: string;
  kind: "dm" | "group" | "story_reply" | "mention";
  title: string;
  preview: string;
  avatar_url: string | null;
  fallback: string;
  timestamp: string;
  unread: boolean;
  link: string;
}

export function useInbox() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setThreads([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // 1) DM conversations
    const { data: convos = [] } = await supabase
      .from("direct_conversations")
      .select("id, participant_one, participant_two, last_message_at")
      .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
      .order("last_message_at", { ascending: false })
      .limit(50);

    const otherIds =
      (convos as any[])?.map((c: any) =>
        c.participant_one === user.id ? c.participant_two : c.participant_one
      ) ?? [];

    const { data: profiles = [] } =
      otherIds.length > 0
        ? await supabase
            .from("profiles_public")
            .select("user_id, display_name, avatar_url")
            .in("user_id", otherIds)
        : ({ data: [] } as any);

    const profileMap = new Map((profiles as any[]).map((p: any) => [p.user_id, p]));

    const dmThreads: InboxThread[] = await Promise.all(
      ((convos as any[]) ?? []).map(async (c: any) => {
        const otherId = c.participant_one === user.id ? c.participant_two : c.participant_one;
        const other = profileMap.get(otherId);
        const { data: lastMsg } = await supabase
          .from("direct_messages")
          .select("content, sender_id, read, reply_to_story_id")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const unreadFromOther = lastMsg && (lastMsg as any).sender_id !== user.id && !(lastMsg as any).read;
        const isStoryReply = !!(lastMsg as any)?.reply_to_story_id;
        return {
          id: `dm-${c.id}`,
          kind: isStoryReply ? "story_reply" : "dm",
          title: other?.display_name ?? "User",
          preview: (lastMsg as any)?.content ?? "Start a conversation",
          avatar_url: other?.avatar_url ?? null,
          fallback: (other?.display_name ?? "U")[0],
          timestamp: c.last_message_at,
          unread: !!unreadFromOther,
          link: `/messages?c=${c.id}`,
        } as InboxThread;
      })
    );

    // 2) Mentions
    const { data: mentions = [] } = await supabase
      .from("mentions")
      .select("id, actor_id, source_type, preview, link, read, created_at")
      .eq("mentioned_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const actorIds = [...new Set(((mentions as any[]) ?? []).map((m: any) => m.actor_id))];
    const { data: actors = [] } =
      actorIds.length > 0
        ? await supabase
            .from("profiles_public")
            .select("user_id, display_name, avatar_url")
            .in("user_id", actorIds)
        : ({ data: [] } as any);
    const actorMap = new Map((actors as any[]).map((a: any) => [a.user_id, a]));

    const mentionThreads: InboxThread[] = ((mentions as any[]) ?? []).map((m: any) => {
      const actor = actorMap.get(m.actor_id);
      return {
        id: `mention-${m.id}`,
        kind: "mention" as const,
        title: `${actor?.display_name ?? "Someone"} mentioned you`,
        preview: m.preview ?? "in a post",
        avatar_url: actor?.avatar_url ?? null,
        fallback: (actor?.display_name ?? "U")[0],
        timestamp: m.created_at,
        unread: !m.read,
        link: m.link ?? "/notifications",
      };
    });

    const all = [...dmThreads, ...mentionThreads].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setThreads(all);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("inbox-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "mentions" }, () => fetchAll())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, fetchAll]);

  const unreadCount = threads.filter((t) => t.unread).length;

  return { threads, loading, unreadCount, refetch: fetchAll };
}
