import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Profanity filter (basic)
const PROFANITY_LIST = ["fuck","shit","damn","ass","bitch","dick","cock","pussy","cunt","bastard","whore","slut"];
const profanityRegex = new RegExp(`\\b(${PROFANITY_LIST.join("|")})\\b`, "gi");
export function filterProfanity(text: string): string {
  return text.replace(profanityRegex, (m) => "*".repeat(m.length));
}

export interface LiveChatMessage {
  id: string;
  stream_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  message: string;
  is_pinned: boolean;
  created_at: string;
  is_member?: boolean;
  is_creator?: boolean;
}

export interface LiveReaction {
  id: string;
  emoji: string;
  created_at: string;
}

export function useStreamEngagement(streamId: string | undefined, creatorUserId?: string, onChatMessageCallback?: () => void) {
  const onChatCbRef = useRef<(() => void) | undefined>(onChatMessageCallback);
  useEffect(() => { onChatCbRef.current = onChatMessageCallback; }, [onChatMessageCallback]);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<LiveReaction[]>([]);
  const [reactionCount, setReactionCount] = useState(0);
  const [energyScore, setEnergyScore] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [activityFeed, setActivityFeed] = useState<{ id: string; type: string; text: string; color: string; ts: number }[]>([]);
  const energyRef = useRef(0);
  const decayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const broadcastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Debounced chat message batching for high-volume streams
  const pendingMessagesRef = useRef<LiveChatMessage[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushMessages = useCallback(() => {
    if (pendingMessagesRef.current.length === 0) return;
    setChatMessages((prev) => {
      const combined = [...prev, ...pendingMessagesRef.current];
      // Keep last 300 messages for smooth scrolling
      return combined.slice(-300);
    });
    pendingMessagesRef.current = [];
  }, []);

  // Fetch initial messages
  useEffect(() => {
    if (!streamId) return;
    const fetchInitial = async () => {
      const { data } = await supabase
        .from("live_chat_messages")
        .select("id, stream_id, user_id, username, avatar_url, message, is_pinned, created_at")
        .eq("stream_id", streamId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) setChatMessages(data as LiveChatMessage[]);
    };
    fetchInitial();
  }, [streamId]);

  // Realtime chat subscription — batched for performance
  useEffect(() => {
    if (!streamId) return;
    const channel = supabase
      .channel(`live-chat-${streamId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "live_chat_messages",
        filter: `stream_id=eq.${streamId}`,
      }, (payload: any) => {
        const msg = payload.new as LiveChatMessage;
        msg.message = filterProfanity(msg.message);
        
        // Batch messages to avoid excessive re-renders during chat spam
        pendingMessagesRef.current.push(msg);
        if (!flushTimerRef.current) {
          flushTimerRef.current = setTimeout(() => {
            flushMessages();
            flushTimerRef.current = null;
          }, 100); // Flush every 100ms max
        }
        
        addActivity("chat", `💬 ${msg.username}: ${msg.message.slice(0, 40)}`, "hsl(0 0% 100%)");
        bumpEnergy(5);
        // Notify external listeners (e.g. analytics chat counter)
        onChatCbRef.current?.();
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "live_chat_messages",
        filter: `stream_id=eq.${streamId}`,
      }, (payload: any) => {
        const updated = payload.new as LiveChatMessage;
        setChatMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m));
      })
      .on("postgres_changes", {
        // DELETE events can't be filtered (old row only carries the PK), so
        // listen table-wide and drop by id — a no-op for other streams' ids.
        event: "DELETE",
        schema: "public",
        table: "live_chat_messages",
      }, (payload: any) => {
        const deletedId = payload.old?.id;
        if (!deletedId) return;
        pendingMessagesRef.current = pendingMessagesRef.current.filter((m) => m.id !== deletedId);
        setChatMessages((prev) => prev.filter((m) => m.id !== deletedId));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      // Flush remaining
      flushMessages();
    };
  }, [streamId, flushMessages]);

  // Realtime reactions subscription — throttled for performance
  useEffect(() => {
    if (!streamId) return;
    let reactionThrottleActive = false;
    
    const channel = supabase
      .channel(`live-reactions-${streamId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "live_reactions",
        filter: `stream_id=eq.${streamId}`,
      }, (payload: any) => {
        const r = payload.new;
        
        // Throttle floating reactions to max 10/sec to prevent DOM thrashing
        if (!reactionThrottleActive) {
          setFloatingReactions((prev) => [...prev.slice(-20), { id: r.id, emoji: r.emoji, created_at: r.created_at }]);
          reactionThrottleActive = true;
          setTimeout(() => { reactionThrottleActive = false; }, 100);
        }
        
        setReactionCount((c) => c + 1);
        addActivity("reaction", `${r.emoji} reacted`, "hsl(var(--primary))");
        bumpEnergy(3);
        
        // Auto-remove after 2s
        setTimeout(() => {
          setFloatingReactions((prev) => prev.filter((fr) => fr.id !== r.id));
        }, 2000);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  // Energy broadcast channel (receive)
  useEffect(() => {
    if (!streamId) return;
    const channel = supabase
      .channel(`energy-${streamId}`, { config: { broadcast: { self: true } } })
      .on("broadcast", { event: "energy-update" }, (payload: any) => {
        const score = payload.payload?.score ?? 0;
        setEnergyScore(score);
        energyRef.current = score;
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  // Presence for viewer count
  useEffect(() => {
    if (!streamId) return;
    const presenceKey = crypto.randomUUID();
    const channel = supabase.channel(`engage-viewers-${streamId}`, {
      config: { presence: { key: presenceKey } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const count = Object.keys(channel.presenceState()).length;
        setViewerCount(count);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ joined_at: new Date().toISOString() });
          addActivity("join", "👤 Someone joined", "hsl(var(--muted-foreground))");
          bumpEnergy(2);
        }
      });
    return () => { channel.untrack(); supabase.removeChannel(channel); };
  }, [streamId]);

  // Energy decay (creator-side broadcasts this)
  const startEnergyBroadcast = useCallback(() => {
    if (!streamId) return;
    // Decay every 20s (more responsive)
    decayTimerRef.current = setInterval(() => {
      energyRef.current = Math.max(0, energyRef.current - 8);
    }, 20000);
    // Broadcast every 10s (faster updates)
    broadcastTimerRef.current = setInterval(() => {
      supabase.channel(`energy-${streamId}`).send({
        type: "broadcast",
        event: "energy-update",
        payload: { score: energyRef.current },
      });
    }, 10000);
    return () => {
      if (decayTimerRef.current) clearInterval(decayTimerRef.current);
      if (broadcastTimerRef.current) clearInterval(broadcastTimerRef.current);
    };
  }, [streamId]);

  const bumpEnergy = useCallback((amount: number) => {
    energyRef.current = Math.min(100, energyRef.current + amount);
    setEnergyScore(energyRef.current);
  }, []);

  const addActivity = useCallback((type: string, text: string, color: string) => {
    setActivityFeed((prev) => [...prev.slice(-50), { id: crypto.randomUUID(), type, text, color, ts: Date.now() }]);
  }, []);

  // Send reaction — debounced to prevent spam
  const lastReactionRef = useRef(0);
  const sendReaction = useCallback(async (emoji: string, userId: string) => {
    if (!streamId) return;
    const now = Date.now();
    if (now - lastReactionRef.current < 500) return; // 2 reactions/sec max
    lastReactionRef.current = now;
    await supabase.from("live_reactions").insert({ stream_id: streamId, user_id: userId, emoji });
  }, [streamId]);

  // Send chat message — rate limited. Returns an error message when the
  // server rejects the insert (slow mode trigger, ban/timeout RLS).
  const lastChatRef = useRef(0);
  const sendChatMessage = useCallback(async (userId: string, username: string, avatarUrl: string | null, message: string): Promise<string | undefined> => {
    if (!streamId || !message.trim()) return;
    const now = Date.now();
    if (now - lastChatRef.current < 300) return; // ~3 msgs/sec max
    lastChatRef.current = now;
    const { error } = await supabase.from("live_chat_messages").insert({
      stream_id: streamId,
      user_id: userId,
      username,
      avatar_url: avatarUrl,
      message: filterProfanity(message.trim()),
    });
    if (!error) return;
    // RLS violation ⇒ banned or timed out; trigger errors carry their own text.
    if (error.message?.includes("row-level security")) {
      return "You can't chat in this stream right now.";
    }
    return error.message;
  }, [streamId]);

  // Pin/unpin message (creator only)
  const togglePinMessage = useCallback(async (messageId: string, pinned: boolean) => {
    await supabase.from("live_chat_messages").update({ is_pinned: !pinned }).eq("id", messageId);
  }, []);

  return {
    chatMessages,
    floatingReactions,
    reactionCount,
    energyScore,
    viewerCount,
    activityFeed,
    sendReaction,
    sendChatMessage,
    togglePinMessage,
    startEnergyBroadcast,
    bumpEnergy,
  };
}
