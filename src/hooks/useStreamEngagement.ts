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

export function useStreamEngagement(streamId: string | undefined, creatorUserId?: string) {
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<LiveReaction[]>([]);
  const [reactionCount, setReactionCount] = useState(0);
  const [energyScore, setEnergyScore] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [activityFeed, setActivityFeed] = useState<{ id: string; type: string; text: string; color: string; ts: number }[]>([]);
  const energyRef = useRef(0);
  const decayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const broadcastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch initial messages
  useEffect(() => {
    if (!streamId) return;
    const fetchInitial = async () => {
      const { data } = await supabase
        .from("live_chat_messages")
        .select("*")
        .eq("stream_id", streamId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) setChatMessages(data as any);
    };
    fetchInitial();
  }, [streamId]);

  // Realtime chat subscription
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
        setChatMessages((prev) => [...prev.slice(-200), msg]);
        addActivity("chat", `💬 ${msg.username}: ${msg.message.slice(0, 40)}`, "hsl(0 0% 100%)");
        bumpEnergy(5);
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
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  // Realtime reactions subscription
  useEffect(() => {
    if (!streamId) return;
    const channel = supabase
      .channel(`live-reactions-${streamId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "live_reactions",
        filter: `stream_id=eq.${streamId}`,
      }, (payload: any) => {
        const r = payload.new;
        setFloatingReactions((prev) => [...prev.slice(-30), { id: r.id, emoji: r.emoji, created_at: r.created_at }]);
        setReactionCount((c) => c + 1);
        addActivity("reaction", `${r.emoji} reacted`, "#00FF85");
        bumpEnergy(3);
        // Auto-remove after 2.5s
        setTimeout(() => {
          setFloatingReactions((prev) => prev.filter((fr) => fr.id !== r.id));
        }, 2500);
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
    const channel = supabase.channel(`engage-viewers-${streamId}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const count = Object.keys(channel.presenceState()).length;
        setViewerCount(count);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ joined_at: new Date().toISOString() });
          addActivity("join", "👤 Someone joined", "#888888");
          bumpEnergy(2);
        }
      });
    return () => { channel.untrack(); supabase.removeChannel(channel); };
  }, [streamId]);

  // Energy decay (creator-side broadcasts this)
  const startEnergyBroadcast = useCallback(() => {
    if (!streamId) return;
    // Decay every 30s
    decayTimerRef.current = setInterval(() => {
      energyRef.current = Math.max(0, energyRef.current - 10);
    }, 30000);
    // Broadcast every 15s
    broadcastTimerRef.current = setInterval(() => {
      supabase.channel(`energy-${streamId}`).send({
        type: "broadcast",
        event: "energy-update",
        payload: { score: energyRef.current },
      });
    }, 15000);
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

  // Send reaction
  const sendReaction = useCallback(async (emoji: string, userId: string) => {
    if (!streamId) return;
    await supabase.from("live_reactions").insert({ stream_id: streamId, user_id: userId, emoji });
  }, [streamId]);

  // Send chat message
  const sendChatMessage = useCallback(async (userId: string, username: string, avatarUrl: string | null, message: string) => {
    if (!streamId || !message.trim()) return;
    await supabase.from("live_chat_messages").insert({
      stream_id: streamId,
      user_id: userId,
      username,
      avatar_url: avatarUrl,
      message: filterProfanity(message.trim()),
    });
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
